import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const snapshotCallbacks = []
const firestore = vi.hoisted(() => ({ setDoc: vi.fn(async () => {}), deleteField: vi.fn(() => 'DELETE') }))
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (...a) => a,
  onSnapshot: (ref, onNext, onError) => { snapshotCallbacks.push({ onNext, onError }); return () => {} },
  setDoc: firestore.setDoc,
  deleteField: firestore.deleteField,
}))
const mods = vi.hoisted(() => ({
  cache: { setMany: vi.fn(async () => {}), deleteMany: vi.fn(async () => {}) },
  syncLibrary: vi.fn(),
  clearLibraryCache: vi.fn(async () => {}),
  loadCatalog: vi.fn(),
  commitPlan: vi.fn(async () => ({ writes: 1 })),
  requestCatalogRefresh: vi.fn(),
}))
vi.mock('../data/cache.js', () => ({ createCache: async () => mods.cache }))
vi.mock('../data/library.js', () => ({ syncLibrary: mods.syncLibrary, clearLibraryCache: mods.clearLibraryCache }))
vi.mock('../data/catalog.js', () => ({ loadCatalog: mods.loadCatalog }))
vi.mock('../data/writeV2.js', async (orig) => ({ ...(await orig()), commitPlan: mods.commitPlan }))
vi.mock('../data/refreshClient.js', () => ({
  requestCatalogRefresh: mods.requestCatalogRefresh,
  REFRESHABLE_SOURCES: ['tmdb', 'anilist', 'anilist-manga', 'spotify'],
  AUTO_REFRESH_MIN_AGE_MS: 24 * 3600 * 1000,
}))

import { useAppData } from './useAppData.js'

const season = (n, c) => ({ n, name: null, episodes: Array.from({ length: c }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: 1000 })) })
const lib = (id, over = {}) => ({ id, catalogId: id, title: `T ${id}`, status: 'en_cours', eps: {}, watchedCount: 0, updatedAt: 1, ...over })
const cat = (id, over = {}) => ({ id, source: 'tmdb', sourceId: 1, title: `T ${id}`, category: 'series', seasons: [season(1, 2)], ended: false, refreshedAt: 0, ...over })

beforeEach(() => {
  vi.clearAllMocks()
  snapshotCallbacks.length = 0
  mods.syncLibrary.mockResolvedValue({ library: { a: lib('a'), z: lib('z', { status: 'termine' }) }, fetched: 2 })
  mods.loadCatalog.mockImplementation(async (db, ids) => ({ catalog: Object.fromEntries(ids.map((id) => [id, cat(id)])), fetched: ids.length }))
  mods.requestCatalogRefresh.mockResolvedValue({ status: 'refreshed' })
})

async function mount(mainDoc = { settings: { darkMode: false }, profile: { handle: 'moi' }, ratings: { 'w:ignore': 1 } }) {
  const hook = renderHook(() => useAppData({ uid: 'u1' }))
  await waitFor(() => expect(snapshotCallbacks.length).toBe(1))
  act(() => { snapshotCallbacks[0].onNext({ exists: () => true, data: () => mainDoc }) })
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useAppData : lecture', () => {
  it('charge la bibliothèque et le catalogue des œuvres en cours seulement', async () => {
    const { result } = await mount()
    expect(mods.loadCatalog.mock.calls[0][1]).toEqual(['a'])
    expect(result.current.data.works.a.seasons).toHaveLength(1)
    expect(result.current.data.works.z.seasons).toBeUndefined()   // résumé seulement : épisodes à la demande
    expect(result.current.data.settings.darkMode).toBe(false)     // le reste vient du document utilisateur
    expect(result.current.data.ratings).toEqual({})               // les notes viennent de la bibliothèque
  })

  it('charge les épisodes à la demande et pour l’export complet', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.ensureWorkCatalog('z') })
    expect(result.current.data.works.z.seasons).toHaveLength(1)
    const full = await result.current.getFullData()
    expect(full.works.a.seasons).toBeDefined()
    expect(full.works.z.seasons).toBeDefined()
  })

  it('retire l’e-mail du document utilisateur', async () => {
    await mount({ profile: { handle: 'moi', email: 'a@b.c' } })
    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { profile: { email: 'DELETE' } }, { merge: true })
  })

  it('signale une erreur de chargement', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mods.syncLibrary.mockRejectedValue(new Error('permission-denied'))
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'))
    expect(result.current.loading).toBe(false)
  })
})

describe('useAppData : écriture (une seule fois, dans le nouveau modèle)', () => {
  it('cocher un épisode : 1 fiche écrite, rien dans le document utilisateur', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.mutate({ watched: { 'a-1-1': 123 } }) })
    expect(result.current.data.watched).toEqual({ 'a-1-1': 123 })
    expect(mods.commitPlan).toHaveBeenCalledTimes(1)
    expect(mods.commitPlan.mock.calls[0][2].patches.a).toMatchObject({ 'eps.1-1': 123, watchedCount: 1 })
    expect(firestore.setDoc).not.toHaveBeenCalled()           // plus aucune écriture dans l'ancien modèle
    expect(mods.cache.setMany).toHaveBeenCalled()
  })

  it('réglages : seul le document utilisateur est écrit', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.mutate({ settings: { darkMode: true } }) })
    expect(mods.commitPlan).not.toHaveBeenCalled()
    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { settings: { darkMode: true } }, { merge: true })
  })

  it('avis personnels : écrits dans la bibliothèque et recopiés pour le fil d’amis', async () => {
    const { result } = await mount()
    const reviews = [{ id: 'a', note: 'top', rating: 5, ts: 9 }]
    await act(async () => { await result.current.mutate({ reviews }) })
    expect(mods.commitPlan.mock.calls[0][2].patches.a.personalReview).toEqual(reviews[0])
    expect(firestore.setDoc).toHaveBeenCalledWith(expect.anything(), { reviews }, { merge: true })
  })

  it('remonte l’erreur si l’écriture échoue', async () => {
    const { result } = await mount()
    mods.commitPlan.mockRejectedValueOnce(new Error('quota'))
    await act(async () => { await expect(result.current.mutate({ favorites: { a: true } })).rejects.toThrow('quota') })
    await waitFor(() => expect(result.current.error?.message).toBe('quota'))
  })

  it('ajouter une œuvre rend ses épisodes disponibles tout de suite', async () => {
    const { result } = await mount()
    const w = { id: 'n', source: 'tmdb', sourceId: 5, title: 'Nouvelle', category: 'series', seasons: [season(1, 3)], status: 'a_voir', added: 1 }
    await act(async () => { await result.current.mutate({ works: { ...result.current.data.works, n: w } }) })
    expect(mods.commitPlan.mock.calls[0][2].catalogCreates.n).toMatchObject({ title: 'Nouvelle' })
    expect((await result.current.getCatalogDoc('n')).title).toBe('Nouvelle')
  })

  it('« synchroniser » repart du serveur', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.syncAll() })
    expect(mods.clearLibraryCache).toHaveBeenCalled()
    expect(mods.syncLibrary).toHaveBeenCalledTimes(2)
  })
})

describe('useAppData : rafraîchissement côté serveur', () => {
  it('une œuvre : demande au serveur puis relit la fiche', async () => {
    mods.loadCatalog.mockImplementation(async (db, ids, cache, opts) => ({ catalog: Object.fromEntries(ids.map((id) => [id, cat(id, { title: opts?.force ? 'Rafraîchie' : `T ${id}` })])) }))
    const { result } = await mount()
    await act(async () => { await result.current.refreshWork('a') })
    expect(mods.requestCatalogRefresh).toHaveBeenCalledWith('a', { minAgeMs: undefined })
    await waitFor(() => expect(result.current.data.works.a.title).toBe('Rafraîchie'))
  })

  it('ne demande rien pour une œuvre sans source rafraîchissable', async () => {
    mods.syncLibrary.mockResolvedValue({ library: { g: lib('g') }, fetched: 1 })
    mods.loadCatalog.mockImplementation(async (db, ids) => ({ catalog: { g: cat('g', { source: 'rawg' }) } }))
    const { result } = await mount()
    await act(async () => { await result.current.refreshWork('g') })
    expect(mods.requestCatalogRefresh).not.toHaveBeenCalled()
  })

  it('automatique : au plus 5 œuvres en diffusion, les plus anciennes d’abord, fraîcheur 24 h', async () => {
    const ids = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7']
    mods.syncLibrary.mockResolvedValue({ library: Object.fromEntries(ids.map((id) => [id, lib(id)])), fetched: 7 })
    mods.loadCatalog.mockImplementation(async (db, want) => ({ catalog: Object.fromEntries(want.map((id) => [id, cat(id, { refreshedAt: 1000 - Number(id.slice(1)) })])) }))
    const { result } = await mount()
    await act(async () => { await result.current.refreshStale() })
    const asked = mods.requestCatalogRefresh.mock.calls.map((c) => c[0])
    expect(asked).toEqual(['a7', 'a6', 'a5', 'a4', 'a3'])
    expect(mods.requestCatalogRefresh.mock.calls[0][1]).toEqual({ minAgeMs: 24 * 3600 * 1000 })
  })

  it('automatique : ignore les œuvres terminées, récemment rafraîchies ou finies de diffuser', async () => {
    mods.syncLibrary.mockResolvedValue({ library: { fresh: lib('fresh'), done: lib('done'), old: lib('old') }, fetched: 3 })
    mods.loadCatalog.mockImplementation(async (db, want) => ({ catalog: {
      fresh: cat('fresh', { refreshedAt: Date.now() }),
      done: cat('done', { ended: true, refreshedAt: 0 }),
      old: cat('old', { refreshedAt: 0 }),
    } }))
    const { result } = await mount()
    await act(async () => { await result.current.refreshStale() })
    expect(mods.requestCatalogRefresh.mock.calls.map((c) => c[0])).toEqual(['old'])
  })

  it('manuel : les œuvres en diffusion de toute la bibliothèque, avec progression', async () => {
    const { result } = await mount()
    const progress = vi.fn()
    await act(async () => { await result.current.refreshAll(progress) })
    expect(mods.requestCatalogRefresh).toHaveBeenCalledTimes(2) // a et z : toutes deux « ended: false » ici
    expect(progress).toHaveBeenCalledWith(expect.stringContaining('mise'))
  })

  it('une panne du serveur n’interrompt pas les autres', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mods.requestCatalogRefresh.mockRejectedValueOnce(new Error('502')).mockResolvedValue({ status: 'refreshed' })
    const { result } = await mount()
    let out
    await act(async () => { out = await result.current.refreshAll() })
    expect(out.refreshed).toHaveLength(1)
  })
})
