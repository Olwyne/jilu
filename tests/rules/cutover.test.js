// Rattrapage au basculement vers le nouveau modèle, contre l'émulateur et les vraies règles.
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore'
import { createCache } from '../../src/data/cache.js'
import { syncLibrary } from '../../src/data/library.js'
import { loadCatalog } from '../../src/data/catalog.js'
import { assembleData } from '../../src/data/assemble.js'
import { migrateAccount } from '../../src/lib/migration.js'
import { ensureCutover } from '../../src/data/cutover.js'

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))
const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const W = (id, over = {}) => ({ id, source: 'tmdb', sourceId: Number(id.split('-').pop()), title: `Titre ${id}`, category: 'series', seasons: [season(1, 4)], status: 'a_voir', added: 1, ...over })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

async function readV2(db, uid) {
  const cache = await createCache(`c-${Math.random()}`)
  const { library } = await syncLibrary(db, uid, cache)
  const { catalog } = await loadCatalog(db, Object.values(library).map((l) => l.catalogId).filter(Boolean), cache)
  return assembleData({ library, catalog })
}

describe('ensureCutover : rattrape ce qui a changé dans l’ancien modèle depuis la première copie', () => {
  it('reprend progression, statut, nouvelle œuvre et œuvre retirée ; ne tourne qu’une fois', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice/works/tmdb-tv-1'), W('tmdb-tv-1', { status: 'en_cours' }))
      await setDoc(doc(d, 'users/alice/works/tmdb-tv-2'), W('tmdb-tv-2'))
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 11 } })
    })
    const db = as('alice')
    await migrateAccount(db, 'alice') // première copie (la veille)

    // l'utilisateur continue d'utiliser le site actuel : cela n'écrit que dans l'ancien modèle
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 11, '1-2': 22 } })
      await updateDoc(doc(d, 'users/alice/works/tmdb-tv-1'), { status: 'termine', finishedAt: 99 })
      await setDoc(doc(d, 'users/alice/works/tmdb-tv-3'), W('tmdb-tv-3'))
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-3'), { eps: { '1-1': 33 } })
      await deleteDoc(doc(d, 'users/alice/works/tmdb-tv-2'))
    })
    expect((await readV2(db, 'alice')).watched).toEqual({ 'tmdb-tv-1-1-1': 11 }) // le nouveau modèle est en retard

    const first = await ensureCutover(db, 'alice')
    expect(first).toEqual({ ok: true, ran: true })

    const after = await readV2(db, 'alice')
    expect(Object.keys(after.works).sort()).toEqual(['tmdb-tv-1', 'tmdb-tv-3'])
    expect(after.works['tmdb-tv-1']).toMatchObject({ status: 'termine', finishedAt: 99 })
    expect(after.watched).toEqual({ 'tmdb-tv-1-1-1': 11, 'tmdb-tv-1-1-2': 22, 'tmdb-tv-3-1-1': 33 })

    expect((await getDoc(doc(db, 'users/alice/migrations/v2'))).data().cutoverAt).toEqual(expect.any(Number))
    expect(await ensureCutover(db, 'alice')).toEqual({ ok: true, ran: false })
  })

  it('une œuvre retirée puis ré-ajoutée dans l’ancien modèle réapparaît', async () => {
    await seed((d) => setDoc(doc(d, 'users/alice/works/tmdb-tv-1'), W('tmdb-tv-1')))
    const db = as('alice')
    await migrateAccount(db, 'alice')
    await seed((d) => deleteDoc(doc(d, 'users/alice/works/tmdb-tv-1')))
    await migrateAccount(db, 'alice', { overwrite: 'changed' })
    expect(Object.keys((await readV2(db, 'alice')).works)).toEqual([])
    await seed((d) => setDoc(doc(d, 'users/alice/works/tmdb-tv-1'), W('tmdb-tv-1')))
    await migrateAccount(db, 'alice', { overwrite: 'changed' })
    expect(Object.keys((await readV2(db, 'alice')).works)).toEqual(['tmdb-tv-1'])
  })

  it('migre d’abord un compte jamais copié', async () => {
    await seed((d) => setDoc(doc(d, 'users/bob/works/tmdb-tv-5'), W('tmdb-tv-5')))
    expect(await ensureCutover(as('bob'), 'bob')).toEqual({ ok: true, ran: true })
    expect(Object.keys((await readV2(as('bob'), 'bob')).works)).toEqual(['tmdb-tv-5'])
  })

  it('un rattrapage identique ne réécrit rien', async () => {
    await seed((d) => setDoc(doc(d, 'users/alice/works/tmdb-tv-1'), W('tmdb-tv-1')))
    const db = as('alice')
    await migrateAccount(db, 'alice')
    const res = await migrateAccount(db, 'alice', { overwrite: 'changed' })
    expect(res.written).toMatchObject({ libraryWritten: 0, catalogWritten: 0, libraryRemoved: 0 })
  })
})
