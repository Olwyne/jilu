import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'

const snapshotCallbacks = []
vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (...a) => a,
  onSnapshot: (ref, onNext, onError) => { snapshotCallbacks.push({ onNext, onError }); return () => {} },
}))
const mods = vi.hoisted(() => ({
  cache: { setMany: vi.fn(async () => {}), deleteMany: vi.fn(async () => {}) },
  syncLibrary: vi.fn(),
  loadCatalog: vi.fn(),
  commitPlan: vi.fn(async () => ({ writes: 1 })),
  writeV1: vi.fn(async () => {}),
  syncAllV1: vi.fn(async () => {}),
}))
vi.mock('../data/cache.js', () => ({ createCache: async () => mods.cache }))
vi.mock('../data/library.js', () => ({ syncLibrary: mods.syncLibrary, clearLibraryCache: vi.fn() }))
vi.mock('../data/catalog.js', () => ({ loadCatalog: mods.loadCatalog }))
vi.mock('../data/writeV1.js', () => ({ writeV1: mods.writeV1, syncAllV1: mods.syncAllV1 }))
vi.mock('../data/writeV2.js', async (orig) => ({ ...(await orig()), commitPlan: mods.commitPlan }))
vi.mock('./useAppData', () => ({ EMPTY_DATA: { works: {}, watched: {}, ratings: {}, reviews: [], settings: { darkMode: true }, profile: {}, feed: [], games: {}, ccLikes: {}, favorites: {} } }))

import { useAppDataV2 } from './useAppDataV2.js'

const season = (n, c) => ({ n, name: null, episodes: Array.from({ length: c }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: 1000 })) })
const lib = (id, over = {}) => ({ id, catalogId: id, title: `T ${id}`, status: 'en_cours', eps: {}, watchedCount: 0, updatedAt: 1, ...over })
const catalogDoc = (id) => ({ id, source: 'tmdb', sourceId: 1, title: `T ${id}`, category: 'series', seasons: [season(1, 2)] })

beforeEach(() => {
  vi.clearAllMocks()
  snapshotCallbacks.length = 0
  mods.syncLibrary.mockResolvedValue({ library: { a: lib('a'), z: lib('z', { status: 'termine' }) }, fetched: 2 })
  mods.loadCatalog.mockImplementation(async (db, ids) => ({ catalog: Object.fromEntries(ids.map((id) => [id, catalogDoc(id)])), fetched: ids.length }))
})

async function mount() {
  const hook = renderHook(() => useAppDataV2({ uid: 'u1' }))
  await waitFor(() => expect(snapshotCallbacks.length).toBe(1))
  act(() => { snapshotCallbacks[0].onNext({ exists: () => true, data: () => ({ settings: { darkMode: false }, profile: { handle: 'moi' }, ratings: { 'w:ignore': 1 } }) }) })
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

describe('useAppDataV2', () => {
  it('charge la bibliothèque et le catalogue des œuvres en cours seulement', async () => {
    const { result } = await mount()
    expect(mods.loadCatalog.mock.calls[0][1]).toEqual(['a'])             // « terminée » : épisodes à la demande
    expect(result.current.data.works.a.seasons).toHaveLength(1)
    expect(result.current.data.works.z.seasons).toBeUndefined()           // résumé seulement
    expect(result.current.data.settings.darkMode).toBe(false)             // le reste vient du document utilisateur
    expect(result.current.data.ratings).toEqual({})                       // les notes viennent de la bibliothèque
  })

  it('charge les épisodes d’une œuvre à la demande', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.ensureWorkCatalog('z') })
    expect(result.current.data.works.z.seasons).toHaveLength(1)
  })

  it('mutate : écrit dans les deux modèles et met l’affichage à jour tout de suite', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.mutate({ watched: { 'a-1-1': 123 } }) })
    expect(result.current.data.watched).toEqual({ 'a-1-1': 123 })
    expect(mods.writeV1).toHaveBeenCalledTimes(1)
    expect(mods.commitPlan).toHaveBeenCalledTimes(1)
    const plan = mods.commitPlan.mock.calls[0][2]
    expect(plan.patches.a).toMatchObject({ 'eps.1-1': 123, watchedCount: 1 })
    expect(mods.cache.setMany).toHaveBeenCalled()
  })

  it('mutate sans effet sur la bibliothèque : seule l’écriture « ancien modèle » a lieu', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.mutate({ settings: { darkMode: true } }) })
    expect(mods.writeV1).toHaveBeenCalledTimes(1)
    expect(mods.commitPlan).not.toHaveBeenCalled()
  })

  it('remonte l’erreur si l’écriture échoue', async () => {
    const { result } = await mount()
    mods.commitPlan.mockRejectedValueOnce(new Error('quota'))
    await act(async () => { await expect(result.current.mutate({ favorites: { a: true } })).rejects.toThrow('quota') })
    await waitFor(() => expect(result.current.error?.message).toBe('quota'))
  })

  it('ajouter une œuvre rend ses épisodes disponibles immédiatement', async () => {
    const { result } = await mount()
    const w = { id: 'n', source: 'tmdb', sourceId: 5, title: 'Nouvelle', category: 'series', seasons: [season(1, 3)], status: 'a_voir', added: 1 }
    await act(async () => { await result.current.mutate({ works: { ...result.current.data.works, n: w } }) })
    expect(mods.commitPlan.mock.calls[0][2].catalogCreates.n).toMatchObject({ title: 'Nouvelle' })
  })

  it('syncAll réécrit l’ancien modèle', async () => {
    const { result } = await mount()
    await act(async () => { await result.current.syncAll() })
    expect(mods.syncAllV1).toHaveBeenCalledTimes(1)
  })

  it('signale une erreur de chargement', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    mods.syncLibrary.mockRejectedValue(new Error('permission-denied'))
    const { result } = renderHook(() => useAppDataV2({ uid: 'u1' }))
    await waitFor(() => expect(result.current.error?.message).toBe('permission-denied'))
    expect(result.current.loading).toBe(false)
  })
})
