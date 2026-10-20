// Verrou et sauvegarde du rafraîchissement contre un vrai Firestore (émulateur, Admin SDK).
import { beforeAll, afterAll, beforeEach, describe, it, expect, vi } from 'vitest'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { createAdminStore } from '../../api/_lib/adminStore.js'
import { refreshCatalogWork, MIN_AGE_MS } from '../../api/_lib/refreshCatalog.js'

let app, db, store
const NOW = 10 * MIN_AGE_MS
const season = (n) => ({ n: 1, name: null, episodes: Array.from({ length: n }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const seed = (over = {}) => db.doc('catalog/tmdb-tv-1').set({ id: 'tmdb-tv-1', source: 'tmdb', sourceId: 1, title: 'Série', category: 'series', seasons: [season(3)], refreshedAt: 1, ...over })

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-jilu' }, 'refresh-store-test')
  db = getFirestore(app)
  store = createAdminStore(db)
})
afterAll(() => deleteApp(app))
beforeEach(async () => {
  for (const d of (await db.collection('catalog').get()).docs) await d.ref.delete()
})

describe('rafraîchissement contre Firestore', () => {
  it('5 requêtes simultanées : une seule appelle les API', async () => {
    await seed()
    const fetchFresh = vi.fn(async (w) => { await new Promise((r) => setTimeout(r, 150)); return { ...w, title: 'Série (maj)', seasons: [season(6)] } })
    const results = await Promise.all(Array.from({ length: 5 }, () => refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })))
    expect(fetchFresh).toHaveBeenCalledTimes(1)
    expect(results.filter((r) => r.status === 'refreshed')).toHaveLength(1)
    expect(results.filter((r) => r.status !== 'refreshed').every((r) => ['busy', 'fresh'].includes(r.status))).toBe(true)
    const saved = (await db.doc('catalog/tmdb-tv-1').get()).data()
    expect(saved).toMatchObject({ title: 'Série (maj)', refreshedAt: NOW })
    expect(saved.seasons[0].episodes).toHaveLength(6)
    expect(saved.seasons[0].episodes[0].air).toBe(Infinity)
    expect(saved).not.toHaveProperty('leaseUntil')
  })

  it('une fiche rafraîchie récemment ne rappelle plus les API', async () => {
    await seed({ refreshedAt: NOW - 1000 })
    const fetchFresh = vi.fn()
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).status).toBe('fresh')
    expect(fetchFresh).not.toHaveBeenCalled()
  })

  it('après un échec des API, le verrou est levé et un nouvel essai fonctionne', async () => {
    await seed()
    await expect(refreshCatalogWork({ store, fetchFresh: async () => { throw new Error('panne') }, id: 'tmdb-tv-1', now: NOW })).rejects.toThrow('panne')
    const before = (await db.doc('catalog/tmdb-tv-1').get()).data()
    expect(before.leaseUntil).toBe(0)
    expect(before.seasons[0].episodes).toHaveLength(3)
    const retry = await refreshCatalogWork({ store, fetchFresh: async (w) => ({ ...w, title: 'ok' }), id: 'tmdb-tv-1', now: NOW + 10 })
    expect(retry.status).toBe('refreshed')
  })

  it('un résultat vide ne remplace pas la fiche existante', async () => {
    await seed()
    await expect(refreshCatalogWork({ store, fetchFresh: async (w) => ({ ...w, seasons: [] }), id: 'tmdb-tv-1', now: NOW })).rejects.toMatchObject({ code: 'empty_result' })
    expect((await db.doc('catalog/tmdb-tv-1').get()).data().seasons[0].episodes).toHaveLength(3)
  })

  it('fiche inconnue : not_found', async () => {
    expect((await refreshCatalogWork({ store, fetchFresh: vi.fn(), id: 'absente', now: NOW })).status).toBe('not_found')
  })
})
