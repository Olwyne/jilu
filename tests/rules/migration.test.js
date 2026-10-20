// Lancer avec : pnpm run test:rules  (émulateur Firestore + Java requis)
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, updateDoc, collection } from 'firebase/firestore'
import { migrateAccount, migrateAllAccounts } from '../../src/lib/migration.js'

const ADMIN = 'pNGd2tM8Gmg3BSlebv4ZYN8m2yj2'

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))

const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const work = (id, over = {}) => ({ id, source: 'tmdb', sourceId: Number(id.split('-').pop()), title: `Titre ${id}`, category: 'series', seasons: [season(1, 3)], status: 'en_cours', added: 1, ...over })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

async function seedAlice() {
  await seed(async (db) => {
    await setDoc(doc(db, 'users/alice'), { ratings: { 'w:tmdb-tv-1': 5 }, favorites: { 'tmdb-tv-1': true }, settings: {} })
    await setDoc(doc(db, 'users/alice/works/tmdb-tv-1'), work('tmdb-tv-1'))
    await setDoc(doc(db, 'users/alice/works/tmdb-tv-2'), work('tmdb-tv-2', { status: 'termine' }))
    await setDoc(doc(db, 'users/alice/works/ma-serie'), (({ sourceId, ...w }) => w)(work('ma-serie')))
    await setDoc(doc(db, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 111, '1-2': 222 } })
    await setDoc(doc(db, 'users/alice/watched/disparue'), { eps: { '1-1': 333 } })
  })
}

describe('migrateAccount (règles réelles)', () => {
  it('copie tout vers catalog + library, sans toucher à l’ancien modèle', async () => {
    await seedAlice()
    const db = as('alice')
    const { report, verification } = await migrateAccount(db, 'alice')
    expect(verification.ok).toBe(true)
    expect(report).toMatchObject({ works: 3, library: 4, localWorks: 1, orphanProgress: 1, episodesWatched: 3 })

    const lib = await getDoc(doc(db, 'users/alice/library/tmdb-tv-1'))
    expect(lib.data()).toMatchObject({ catalogId: 'tmdb-tv-1', favorite: true, ratings: { w: 5 }, watchedCount: 2, eps: { '1-1': 111, '1-2': 222 } })
    expect((await getDoc(doc(db, 'catalog/tmdb-tv-1'))).data()).toMatchObject({ title: 'Titre tmdb-tv-1' })
    expect((await getDoc(doc(db, 'catalog/local-alice-ma-serie'))).exists()).toBe(true)
    expect((await getDoc(doc(db, 'users/alice/library/disparue'))).data()).toMatchObject({ orphanProgress: true, watchedCount: 1 })
    expect((await getDoc(doc(db, 'users/alice/migrations/v2'))).data()).toMatchObject({ ok: true })

    // ancien modèle intact
    expect((await getDocs(collection(db, 'users/alice/works'))).size).toBe(3)
    expect((await getDocs(collection(db, 'users/alice/watched'))).size).toBe(2)
    expect((await getDoc(doc(db, 'users/alice/watched/tmdb-tv-1'))).data().eps).toEqual({ '1-1': 111, '1-2': 222 })
  })

  it('est idempotente : une seconde exécution n’écrit plus rien', async () => {
    await seedAlice()
    const db = as('alice')
    await migrateAccount(db, 'alice')
    const second = await migrateAccount(db, 'alice')
    expect(second.written).toEqual({ catalogWritten: 0, libraryWritten: 0 })
    expect(second.verification.ok).toBe(true)
  })

  it('réutilise une fiche de catalogue déjà créée par un autre utilisateur (sans erreur)', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'catalog/tmdb-tv-1'), { ...work('tmdb-tv-1'), updatedAt: 1 })
      await setDoc(doc(db, 'users/bob/works/tmdb-tv-1'), work('tmdb-tv-1', { status: 'a_voir' }))
    })
    const db = as('bob')
    const res = await migrateAccount(db, 'bob')
    expect(res.written).toEqual({ catalogWritten: 0, libraryWritten: 1 })
    expect(res.verification.ok).toBe(true)
  })

  it('migre un compte sans document users', async () => {
    await seed(async (db) => { await setDoc(doc(db, 'users/carl/works/tmdb-tv-5'), work('tmdb-tv-5')) })
    const res = await migrateAccount(as('carl'), 'carl')
    expect(res.verification.ok).toBe(true)
    expect(res.report.works).toBe(1)
  })

  it('gère une grosse bibliothèque (plusieurs lots d’écriture)', async () => {
    await seed(async (db) => {
      for (let i = 0; i < 450; i++) await setDoc(doc(db, `users/gros/works/tmdb-tv-${1000 + i}`), work(`tmdb-tv-${1000 + i}`, { seasons: [season(1, 2)] }))
    })
    const res = await migrateAccount(as('gros'), 'gros')
    expect(res.verification.ok).toBe(true)
    expect(res.written.libraryWritten).toBe(450)
  })
})

describe('règles v2', () => {
  it('library et migrations sont privées à leur propriétaire', async () => {
    await seed((db) => setDoc(doc(db, 'users/alice/library/w1'), { title: 'x' }))
    await assertSucceeds(getDoc(doc(as('alice'), 'users/alice/library/w1')))
    await assertFails(getDoc(doc(as('bob'), 'users/alice/library/w1')))
    await assertFails(setDoc(doc(as('bob'), 'users/alice/library/w2'), { title: 'y' }))
    await assertFails(setDoc(doc(as('bob'), 'users/alice/migrations/v2'), { ok: true }))
  })
  it('catalog : lecture pour les connectés, création seule, pas de modification', async () => {
    const fiche = { title: 'Série', category: 'series' }
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), 'catalog/x')))
    await assertSucceeds(setDoc(doc(as('alice'), 'catalog/tmdb-tv-1'), fiche))
    await assertSucceeds(getDoc(doc(as('bob'), 'catalog/tmdb-tv-1')))
    await assertFails(setDoc(doc(as('bob'), 'catalog/tmdb-tv-1'), { ...fiche, title: 'Piraté' }))
    await assertFails(updateDoc(doc(as('alice'), 'catalog/tmdb-tv-1'), { title: 'Autre' }))
  })
  it('catalog : refuse les fiches invalides et les fiches « local » d’un autre', async () => {
    await assertFails(setDoc(doc(as('alice'), 'catalog/a'), { category: 'series' }))
    await assertFails(setDoc(doc(as('alice'), 'catalog/b'), { title: 'x'.repeat(301), category: 'series' }))
    await assertSucceeds(setDoc(doc(as('alice'), 'catalog/local-alice-x'), { title: 'ok', category: 'series' }))
    await assertFails(setDoc(doc(as('alice'), 'catalog/local-bob-x'), { title: 'ok', category: 'series' }))
  })
})

describe('administrateur de migration (règles temporaires)', () => {
  beforeEach(() => seed(async (db) => {
    await setDoc(doc(db, 'users/alice'), { settings: { publicProfile: false } })
    await setDoc(doc(db, 'users/alice/works/tmdb-tv-1'), work('tmdb-tv-1'))
    await setDoc(doc(db, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 1 } })
  }))

  it('lit l’ancien modèle des autres comptes mais ne peut rien y écrire', async () => {
    const admin = as(ADMIN)
    await assertSucceeds(getDoc(doc(admin, 'users/alice')))
    await assertSucceeds(getDoc(doc(admin, 'users/alice/works/tmdb-tv-1')))
    await assertSucceeds(getDoc(doc(admin, 'users/alice/watched/tmdb-tv-1')))
    await assertFails(setDoc(doc(admin, 'users/alice/works/tmdb-tv-1'), work('tmdb-tv-1', { title: 'modifié' })))
    await assertFails(setDoc(doc(admin, 'users/alice/watched/tmdb-tv-1'), { eps: {} }))
    await assertFails(setDoc(doc(admin, 'users/alice'), { settings: { publicProfile: true } }))
  })
  it('écrit seulement le nouveau modèle des autres comptes', async () => {
    const admin = as(ADMIN)
    await assertSucceeds(setDoc(doc(admin, 'users/alice/library/w1'), { title: 'x' }))
    await assertSucceeds(setDoc(doc(admin, 'users/alice/migrations/v2'), { ok: true }))
  })
  it('un autre utilisateur n’obtient aucun de ces droits', async () => {
    const bob = as('bob')
    await assertFails(getDoc(doc(bob, 'users/alice/works/tmdb-tv-1')))
    await assertFails(getDocs(collection(bob, 'users/alice/works')))
    await assertFails(setDoc(doc(bob, 'users/alice/library/w1'), { title: 'x' }))
  })

  it('migrateAllAccounts migre tous les comptes, garde la fiche la plus complète, ne touche pas à l’ancien modèle', async () => {
    await seed(async (db) => {
      await setDoc(doc(db, 'users/bob/works/tmdb-tv-1'), work('tmdb-tv-1', { seasons: [season(1, 5)], status: 'a_voir' }))
      await setDoc(doc(db, 'users/bob/watched/tmdb-tv-1'), { eps: { '1-1': 7, '1-2': 8 } })
      await setDoc(doc(db, 'users/carl/works/ma-serie'), (({ sourceId, ...w }) => w)(work('ma-serie'))) // sans document users
      await setDoc(doc(db, 'users/dina/watched/disparue'), { eps: { '1-1': 9 } })                       // progression seule
    })
    const admin = as(ADMIN)
    const res = await migrateAllAccounts(admin)
    expect(res.accounts).toBe(4)
    expect(Object.values(res.results).every((r) => r.verification.ok)).toBe(true)

    expect((await getDoc(doc(admin, 'catalog/tmdb-tv-1'))).data().seasons[0].episodes).toHaveLength(5)
    expect((await getDoc(doc(admin, 'catalog/local-carl-ma-serie'))).exists()).toBe(true)
    expect((await getDoc(doc(admin, 'users/alice/library/tmdb-tv-1'))).data()).toMatchObject({ status: 'en_cours', eps: { '1-1': 1 } })
    expect((await getDoc(doc(admin, 'users/bob/library/tmdb-tv-1'))).data()).toMatchObject({ status: 'a_voir', watchedCount: 2 })
    expect((await getDoc(doc(admin, 'users/dina/library/disparue'))).data()).toMatchObject({ orphanProgress: true })
    expect((await getDoc(doc(admin, 'users/bob/migrations/v2'))).data()).toMatchObject({ ok: true })

    // ancien modèle intact
    expect((await getDoc(doc(admin, 'users/bob/works/tmdb-tv-1'))).data().seasons[0].episodes).toHaveLength(5)
    expect((await getDoc(doc(admin, 'users/alice/watched/tmdb-tv-1'))).data().eps).toEqual({ '1-1': 1 })

    // idempotent
    const again = await migrateAllAccounts(admin)
    expect(again.catalogWritten).toBe(0)
    expect(Object.values(again.results).every((r) => r.written.libraryWritten === 0 && r.verification.ok)).toBe(true)
  })

  it('migrateAllAccounts échoue pour un utilisateur ordinaire', async () => {
    await expect(migrateAllAccounts(as('bob'))).rejects.toMatchObject({ code: 'permission-denied' })
  })
})
