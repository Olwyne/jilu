// Lecture v2 (synchronisation par delta + catalogue en cache) contre l'émulateur et les vraies règles.
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment } from '@firebase/rules-unit-testing'
import { doc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore'
import { createCache } from '../../src/data/cache.js'
import { syncLibrary, clearLibraryCache, OVERLAP_MS, FULL_RESYNC_MS } from '../../src/data/library.js'
import { loadCatalog } from '../../src/data/catalog.js'
import { assembleData, catalogIdsNeededAtStartup } from '../../src/data/assemble.js'
import { migrateAccount } from '../../src/lib/migration.js'

let env, cache
const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))
const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const work = (id, over = {}) => ({ id, source: 'tmdb', sourceId: Number(id.split('-').pop()), title: `Titre ${id}`, category: 'series', seasons: [season(1, 3)], status: 'en_cours', added: 1, ...over })
const lib = (id, over = {}) => ({ id, catalogId: id, title: id, status: 'en_cours', eps: {}, watchedCount: 0, updatedAt: 1_000_000, ...over })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  cache = await createCache(`t-${Math.random()}`)
})

describe('syncLibrary (delta)', () => {
  const T0 = 1_700_000_000_000
  const H = 3600 * 1000

  it('1re synchro : lit tout ; ensuite rien ; puis seulement ce qui change', async () => {
    await seed(async (db) => {
      for (const id of ['w1', 'w2', 'w3']) await setDoc(doc(db, `users/alice/library/${id}`), lib(id, { updatedAt: T0 }))
    })
    const db = as('alice')
    const first = await syncLibrary(db, 'alice', cache, { now: T0 + H })
    expect(first.fetched).toBe(3)
    expect(Object.keys(first.library).sort()).toEqual(['w1', 'w2', 'w3'])

    const second = await syncLibrary(db, 'alice', cache, { now: T0 + 2 * H })
    expect(second.fetched).toBe(0)                       // rien n'a changé : 0 lecture de document
    expect(Object.keys(second.library)).toHaveLength(3)  // et pourtant la bibliothèque complète est disponible

    await seed((d) => updateDoc(doc(d, 'users/alice/library/w2'), { status: 'termine', updatedAt: T0 + 2 * H + 1000 }))
    const third = await syncLibrary(db, 'alice', cache, { now: T0 + 2 * H + 5000 })
    expect(third.fetched).toBe(1)
    expect(third.library.w2.status).toBe('termine')
    expect(third.library.w1.status).toBe('en_cours')
  })

  it('applique les suppressions douces et les nouveaux documents', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice/library/w1'), lib('w1', { updatedAt: T0 }))
      await setDoc(doc(d, 'users/alice/library/w2'), lib('w2', { updatedAt: T0 }))
    })
    const db = as('alice')
    await syncLibrary(db, 'alice', cache, { now: T0 + H })
    await seed(async (d) => {
      await updateDoc(doc(d, 'users/alice/library/w1'), { deleted: true, updatedAt: T0 + 2 * H })
      await setDoc(doc(d, 'users/alice/library/w4'), lib('w4', { updatedAt: T0 + 2 * H + 1 }))
    })
    const { library, fetched } = await syncLibrary(db, 'alice', cache, { now: T0 + 3 * H })
    expect(fetched).toBe(2)
    expect(Object.keys(library).sort()).toEqual(['w2', 'w4'])
  })

  it('relit une fenêtre de recouvrement : une modification juste avant la synchro précédente n’est pas perdue', async () => {
    await seed((d) => setDoc(doc(d, 'users/alice/library/w1'), lib('w1', { updatedAt: T0 })))
    const db = as('alice')
    await syncLibrary(db, 'alice', cache, { now: T0 + 60_000 })
    // écrite par un autre appareil dont l'horloge retarde de 5 minutes
    await seed((d) => setDoc(doc(d, 'users/alice/library/w2'), lib('w2', { updatedAt: T0 + 60_000 - 5 * 60_000 })))
    const { library } = await syncLibrary(db, 'alice', cache, { now: T0 + 120_000 })
    expect(Object.keys(library).sort()).toEqual(['w1', 'w2'])
  })

  it('refait une lecture complète au bout d’une semaine (et retire les fantômes du cache)', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice/library/w1'), lib('w1', { updatedAt: T0 }))
      await setDoc(doc(d, 'users/alice/library/w2'), lib('w2', { updatedAt: T0 }))
    })
    const db = as('alice')
    await syncLibrary(db, 'alice', cache, { now: T0 + H })
    await seed((d) => deleteDoc(doc(d, 'users/alice/library/w2'))) // supprimé « en dur » : le delta ne peut pas le voir
    expect(Object.keys((await syncLibrary(db, 'alice', cache, { now: T0 + 2 * H })).library)).toEqual(['w1', 'w2'])
    const weekly = await syncLibrary(db, 'alice', cache, { now: T0 + FULL_RESYNC_MS + 2 * H })
    expect(weekly.full).toBe(true)
    expect(Object.keys(weekly.library)).toEqual(['w1'])
  })

  it('ne mélange pas les comptes dans le cache et sait l’effacer à la déconnexion', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice/library/w1'), lib('w1', { updatedAt: T0 }))
      await setDoc(doc(d, 'users/bob/library/w9'), lib('w9', { updatedAt: T0 }))
    })
    expect(Object.keys((await syncLibrary(as('alice'), 'alice', cache, { now: T0 + H })).library)).toEqual(['w1'])
    expect(Object.keys((await syncLibrary(as('bob'), 'bob', cache, { now: T0 + H })).library)).toEqual(['w9'])
    await clearLibraryCache(cache, 'alice')
    expect(await cache.entries('lib:alice:')).toEqual([])
    expect((await cache.entries('lib:bob:')).length).toBe(1)
    expect(OVERLAP_MS).toBeGreaterThan(0)
  })
})

describe('loadCatalog (cache)', () => {
  it('ne relit que les fiches absentes ou périmées, par lots de 30', async () => {
    const ids = Array.from({ length: 65 }, (_, i) => `tmdb-tv-${i + 1}`)
    await seed(async (d) => { for (const id of ids) await setDoc(doc(d, `catalog/${id}`), work(id)) })
    const db = as('alice')
    const a = await loadCatalog(db, ids, cache, { now: 1000 })
    expect(a.fetched).toBe(65)
    expect(Object.keys(a.catalog)).toHaveLength(65)
    expect(a.catalog['tmdb-tv-1'].seasons[0].episodes[0].air).toBe(Infinity)

    expect((await loadCatalog(db, ids, cache, { now: 2000 })).fetched).toBe(0)                       // en cache
    expect((await loadCatalog(db, ids, cache, { now: 1000 + 25 * 3600 * 1000 })).fetched).toBe(65)   // périmées
    expect((await loadCatalog(db, ['tmdb-tv-2'], cache, { now: 3000, force: ['tmdb-tv-2'] })).fetched).toBe(1)
  })

  it('durée de validité par fiche : courte pour une série en diffusion, longue pour une œuvre terminée', async () => {
    await seed(async (d) => {
      await setDoc(doc(d, 'catalog/live-1'), work('live-1', { ended: false }))
      await setDoc(doc(d, 'catalog/done-2'), work('done-2', { ended: true }))
      await setDoc(doc(d, 'catalog/film-3'), work('film-3', { category: 'films', seasons: null }))
    })
    const db = as('alice')
    const ids = ['live-1', 'done-2', 'film-3']
    const ttl = (doc) => (doc?.ended === false ? 24 * 3600 * 1000 : 30 * 24 * 3600 * 1000)
    expect((await loadCatalog(db, ids, cache, { now: 1000, maxAgeMs: ttl })).fetched).toBe(3)
    expect((await loadCatalog(db, ids, cache, { now: 1000 + 2 * 24 * 3600 * 1000, maxAgeMs: ttl })).fetched).toBe(1) // seule la série en diffusion
    expect((await loadCatalog(db, ids, cache, { now: 1000 + 31 * 24 * 3600 * 1000, maxAgeMs: ttl })).fetched).toBe(3)
  })

  it('mémorise aussi les fiches absentes pour ne pas les redemander', async () => {
    const db = as('alice')
    const first = await loadCatalog(db, ['inconnue'], cache, { now: 1000 })
    expect(first.catalog).toEqual({})
    expect((await loadCatalog(db, ['inconnue'], cache, { now: 2000 })).fetched).toBe(0)
  })

  it('garde l’ancienne fiche en cas d’absence côté serveur après péremption', async () => {
    await seed((d) => setDoc(doc(d, 'catalog/x-1'), work('x-1')))
    const db = as('alice')
    await loadCatalog(db, ['x-1'], cache, { now: 1000 })
    await seed((d) => deleteDoc(doc(d, 'catalog/x-1')))
    const again = await loadCatalog(db, ['x-1'], cache, { now: 1000 + 25 * 3600 * 1000 })
    expect(again.catalog['x-1']).toMatchObject({ title: 'Titre x-1' })
  })
})

describe('parcours complet : ancien modèle → vraie migration → lecture v2 → reconstitution', () => {
  it('redonne à l’identique les données d’un compte', async () => {
    const works = {
      'tmdb-tv-1': work('tmdb-tv-1', { status: 'termine', finishedAt: 50 }),
      'tmdb-tv-2': work('tmdb-tv-2', { seasons: [season(1, 2), season(2, 4)], status: 'a_voir' }),
      'tmdb-movie-3': work('tmdb-movie-3', { category: 'films', seasons: null, status: 'termine' }),
    }
    await seed(async (d) => {
      await setDoc(doc(d, 'users/alice'), { ratings: { 'w:tmdb-tv-1': 5, 'e:tmdb-tv-2-2-1': 3 }, favorites: { 'tmdb-movie-3': true }, settings: {} })
      for (const [id, w] of Object.entries(works)) await setDoc(doc(d, `users/alice/works/${id}`), w)
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 11, '1-2': 12 } })
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-2'), { eps: { '2-1': 21 } })
    })
    const db = as('alice')
    const migration = await migrateAccount(db, 'alice')
    expect(migration.verification.ok).toBe(true)

    const { library, fetched } = await syncLibrary(db, 'alice', cache)
    expect(fetched).toBe(3)
    const needed = catalogIdsNeededAtStartup(library)
    expect(needed.sort()).toEqual(['tmdb-tv-2'])                       // seules les œuvres « à voir / en cours »
    const { catalog } = await loadCatalog(db, Object.values(library).map((l) => l.catalogId), cache)
    const data = assembleData({ library, catalog })

    expect(data.works).toEqual(works)
    expect(data.watched).toEqual({ 'tmdb-tv-1-1-1': 11, 'tmdb-tv-1-1-2': 12, 'tmdb-tv-2-2-1': 21 })
    expect(data.ratings).toEqual({ 'w:tmdb-tv-1': 5, 'e:tmdb-tv-2-2-1': 3 })
    expect(data.favorites).toEqual({ 'tmdb-movie-3': true })
  })
})
