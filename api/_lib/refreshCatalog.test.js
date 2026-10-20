import { describe, it, expect, vi, beforeEach } from 'vitest'
import { refreshCatalogWork, MIN_AGE_MS, LEASE_MS, RefreshError } from './refreshCatalog.js'

const season = (count) => ({ n: 1, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: 1000 })) })
const NOW = 10 * MIN_AGE_MS

// Faux magasin en mémoire, même contrat que api/_lib/adminStore.js
function fakeStore(initial) {
  const docs = new Map(Object.entries(initial))
  return {
    docs,
    get: async (id) => docs.get(id) ?? null,
    acquireLease: vi.fn(async (id, now, leaseMs, minAge) => {
      const d = docs.get(id)
      if (!d) return { ok: false, reason: 'not_found' }
      if (d.leaseUntil && d.leaseUntil > now) return { ok: false, reason: 'busy' }
      if (d.refreshedAt && now - d.refreshedAt < minAge) return { ok: false, reason: 'fresh', refreshedAt: d.refreshedAt }
      docs.set(id, { ...d, leaseUntil: now + leaseMs })
      return { ok: true, doc: d }
    }),
    save: vi.fn(async (id, data) => { docs.set(id, data) }),
    releaseLease: vi.fn(async (id) => { docs.set(id, { ...docs.get(id), leaseUntil: 0 }) }),
  }
}

const stale = (over = {}) => ({ id: 'tmdb-tv-1', source: 'tmdb', sourceId: 1, title: 'Série', category: 'series', seasons: [season(3)], refreshedAt: NOW - 2 * MIN_AGE_MS, ...over })
let fetchFresh
beforeEach(() => { fetchFresh = vi.fn(async (w) => ({ ...w, title: 'Série (maj)', seasons: [season(5)], status: 'en_cours', added: 5 })) })

describe('refreshCatalogWork', () => {
  it('rafraîchit une fiche périmée et enregistre la version fraîche', async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale() })
    const res = await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })
    expect(res).toEqual({ status: 'refreshed', refreshedAt: NOW })
    expect(fetchFresh).toHaveBeenCalledTimes(1)
    const saved = store.docs.get('tmdb-tv-1')
    expect(saved).toMatchObject({ title: 'Série (maj)', refreshedAt: NOW, updatedAt: NOW })
    expect(saved.seasons[0].episodes).toHaveLength(5)
    expect(saved).not.toHaveProperty('status') // champs propres à l'utilisateur : jamais dans le catalogue
    expect(saved).not.toHaveProperty('added')
    expect(saved).not.toHaveProperty('leaseUntil')
  })

  it("n'appelle PAS les API si la fiche a été rafraîchie récemment", async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale({ refreshedAt: NOW - 60_000 }) })
    const res = await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })
    expect(res.status).toBe('fresh')
    expect(fetchFresh).not.toHaveBeenCalled()
    expect(store.acquireLease).not.toHaveBeenCalled()
  })

  it('rafraîchit une fiche jamais rafraîchie (migrée)', async () => {
    const { refreshedAt, ...neverRefreshed } = stale()
    const store = fakeStore({ 'tmdb-tv-1': neverRefreshed })
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).status).toBe('refreshed')
  })

  it('répond not_found / unsupported sans appeler les API', async () => {
    const store = fakeStore({ 'local-u-x': stale({ id: 'local-u-x', sourceId: undefined }), 'x-1': stale({ source: 'inconnue' }) })
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'absent', now: NOW })).status).toBe('not_found')
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'local-u-x', now: NOW })).status).toBe('unsupported')
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'x-1', now: NOW })).status).toBe('unsupported')
    expect(fetchFresh).not.toHaveBeenCalled()
  })

  it('une seule requête rafraîchit quand deux arrivent en même temps (verrou)', async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale() })
    let release
    fetchFresh.mockImplementation(() => new Promise((resolve) => { release = () => resolve({ ...stale(), title: 'Série (maj)', seasons: [season(4)] }) }))
    const first = refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })
    await new Promise((r) => setTimeout(r, 0))
    const second = await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW + 1000 })
    expect(second.status).toBe('busy')
    release()
    expect((await first).status).toBe('refreshed')
    expect(fetchFresh).toHaveBeenCalledTimes(1)
  })

  it('un verrou expiré (requête morte) peut être repris', async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale({ leaseUntil: NOW - 1 }) })
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).status).toBe('refreshed')
    expect(LEASE_MS).toBeGreaterThan(0)
  })

  it('ne remplace jamais une fiche par un résultat vide (panne d’API) et lève le verrou', async () => {
    const original = stale()
    const store = fakeStore({ 'tmdb-tv-1': original })
    fetchFresh.mockResolvedValue({ ...original, seasons: [] })
    await expect(refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).rejects.toMatchObject({ code: 'empty_result' })
    expect(store.save).not.toHaveBeenCalled()
    expect(store.releaseLease).toHaveBeenCalledWith('tmdb-tv-1')
    expect(store.docs.get('tmdb-tv-1').seasons).toHaveLength(1)
    expect(store.docs.get('tmdb-tv-1').leaseUntil).toBe(0)
  })

  it('refuse une fiche sans titre', async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale() })
    fetchFresh.mockResolvedValue({ ...stale(), title: '' })
    await expect(refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).rejects.toBeInstanceOf(RefreshError)
    expect(store.save).not.toHaveBeenCalled()
  })

  it('lève le verrou si les API échouent, pour permettre un nouvel essai', async () => {
    const store = fakeStore({ 'tmdb-tv-1': stale() })
    fetchFresh.mockRejectedValue(new Error('timeout'))
    await expect(refreshCatalogWork({ store, fetchFresh, id: 'tmdb-tv-1', now: NOW })).rejects.toThrow('timeout')
    expect(store.releaseLease).toHaveBeenCalled()
    expect((await refreshCatalogWork({ store, fetchFresh: vi.fn(async (w) => w), id: 'tmdb-tv-1', now: NOW + 1 })).status).toBe('refreshed')
  })

  it('accepte un film (sans saisons) sans le prendre pour un résultat vide', async () => {
    const film = { id: 'tmdb-movie-2', source: 'tmdb', sourceId: 2, title: 'Film', category: 'films', seasons: null, refreshedAt: 1 }
    const store = fakeStore({ 'tmdb-movie-2': film })
    fetchFresh.mockResolvedValue({ ...film, title: 'Film (maj)', seasons: null })
    expect((await refreshCatalogWork({ store, fetchFresh, id: 'tmdb-movie-2', now: NOW })).status).toBe('refreshed')
  })
})
