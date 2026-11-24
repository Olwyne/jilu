import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkActions } from './useWorkActions'
import { DELETE } from '../data/writeV2.js'
import { renderHook, act } from '@testing-library/react'


let mutate, writeLibrary
const store = () => ({ mutate, writeLibrary })
const written = () => writeLibrary.mock.calls[0][0]
beforeEach(() => {
  vi.clearAllMocks()
  mutate = vi.fn().mockResolvedValue()
  writeLibrary = vi.fn().mockResolvedValue()
})

describe('useWorkActions', () => {
  it('toggleEpisode marks episode and updates status atomically', async () => {
    const data = { works: { w1: { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(writeLibrary).toHaveBeenCalledWith({ set: { w1: { 'eps.1-1': expect.any(Number), status: 'en_cours' } } })
  })

  it('toggleEpisode un-marks and status reverts to a_voir when nothing left watched', async () => {
    const data = { works: { w1: { id: 'w1', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: { 'w1-1-1': 123 } }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(written().set.w1).toEqual({ 'eps.1-1': DELETE, status: 'a_voir' })
  })

  it('setRating toggles off when clicking the same value again', async () => {
    const data = { works: { w1: { id: 'w1' } }, watched: {}, ratings: { 'w:w1': 4 }, reviews: [] }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.setRating('w', 'w1', 4) })
    expect(written().set.w1).toEqual({ 'ratings.w': DELETE })
  })

  it('setStatus updates the work status directly', async () => {
    const data = { works: { w1: { id: 'w1', status: 'a_voir' } } }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.setStatus('w1', 'abandonne') })
    expect(written().set.w1.status).toBe('abandonne')
  })

  it('stamps finishedAt when setting status to termine on a work that lacks it', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, store()))

    const before = Date.now()
    await act(async () => { await result.current.setStatus('w1', 'termine') })
    const after = Date.now()

    const saved = written().set.w1
    expect(saved.status).toBe('termine')
    expect(saved.finishedAt).toBeGreaterThanOrEqual(before)
    expect(saved.finishedAt).toBeLessThanOrEqual(after)
  })

  it('does not overwrite finishedAt when already set', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'en_cours', finishedAt: 999 }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, store()))

    await act(async () => { await result.current.setStatus('w1', 'termine') })

    expect(written().set.w1.finishedAt).toBeUndefined() // pas réécrit : l'ancienne date reste
  })

  it('does not stamp finishedAt when status is not termine', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, store()))

    await act(async () => { await result.current.setStatus('w1', 'en_cours') })

    const saved = written().set.w1
    expect(saved.finishedAt).toBeUndefined()
  })

  it('toggleEpisode stamps finishedAt when the last episode becomes watched', async () => {
    const work = { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1 }] }] }
    const data = { works: { w1: work }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, store()))

    const before = Date.now()
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    const after = Date.now()

    const saved = written().set.w1
    expect(saved.finishedAt).toBeGreaterThanOrEqual(before)
    expect(saved.finishedAt).toBeLessThanOrEqual(after)
  })

  it('toggleEpisode does not overwrite finishedAt when already set', async () => {
    const work = { id: 'w1', status: 'a_voir', finishedAt: 999, seasons: [{ n: 1, episodes: [{ n: 1 }] }] }
    const data = { works: { w1: work }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, store()))

    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })

    expect(written().set.w1.finishedAt).toBeUndefined() // pas réécrit : l'ancienne date reste
  })
  it('markAllWatched keeps existing watch dates and never stores booleans', async () => {
    window.confirm = vi.fn(() => true)
    const data = {
      works: { w1: { id: 'w1', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }, { n: 3, air: Infinity }] }] } },
      watched: { 'w1-1-1': 123, 'other-1-1': 456 }
    }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.markAllWatched() })
    // seuls les épisodes diffusés et pas encore vus sont écrits, avec une vraie date
    expect(written()).toEqual({ set: { w1: { 'eps.1-2': expect.any(Number) } } })
    expect(written().set.w1['eps.1-2']).toBeGreaterThan(1)
  })

  it('markAllWatched demande confirmation et n\'écrit rien si on refuse', async () => {
    window.confirm = vi.fn(() => false)
    const data = { works: { w1: { id: 'w1', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.markAllWatched() })
    expect(window.confirm).toHaveBeenCalledTimes(1)
    expect(writeLibrary).not.toHaveBeenCalled()
  })

  it('le rafraîchissement est délégué au serveur (aucun appel d’API depuis le navigateur)', async () => {
    const services = { refreshWork: vi.fn().mockResolvedValue({ refreshed: ['w1'] }), refreshAll: vi.fn().mockResolvedValue({ refreshed: [] }) }
    const { result } = renderHook(() => useWorkActions({ works: { w1: { id: 'w1' } }, watched: {} }, store(), services))
    await act(async () => { await result.current.refreshWork('w1') })
    await act(async () => { await result.current.refreshAllWorks(() => {}) })
    expect(services.refreshWork).toHaveBeenCalledWith('w1')
    expect(services.refreshAll).toHaveBeenCalledTimes(1)
    expect(result.current.refreshStaleWorks).toBeUndefined()
  })
  it('noter une œuvre : note + avis personnel dans la fiche, avis recopié pour le fil d’amis', async () => {
    const data = { works: { w1: { id: 'w1' } }, watched: {}, ratings: {}, reviews: [{ id: 'w1', note: 'top', rating: 2, ts: 1 }] }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.setRating('w', 'w1', 5) })
    const [ops, mainPatch] = writeLibrary.mock.calls[0]
    expect(ops.set.w1).toMatchObject({ 'ratings.w': 5, personalReview: { id: 'w1', note: 'top', rating: 5 } })
    expect(mainPatch.reviews).toEqual([ops.set.w1.personalReview])
  })

  it('noter un épisode d’une œuvre dont l’id contient des tirets', async () => {
    const data = { works: { 'my-show': { id: 'my-show' }, 'my-show-2': { id: 'my-show-2' } }, watched: {}, ratings: {}, reviews: [] }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.setRating('e', 'my-show-2-1-3', 4) })
    expect(written()).toEqual({ set: { 'my-show-2': { 'ratings.e:1-3': 4 } } })
  })

  it('favori, retrait, réinitialisation, tout effacer : une opération ciblée chacun', async () => {
    const data = { works: { w1: { id: 'w1' }, 'a-b': { id: 'a-b' } }, watched: { 'w1-1-1': 1, 'a-b-2-3': 2 }, favorites: { w1: true }, feed: [], reviews: [] }
    window.confirm = vi.fn(() => true)
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.toggleFavorite('w1') })
    await act(async () => { await result.current.removeWork('a-b') })
    await act(async () => { await result.current.resetProgress() })
    await act(async () => { await result.current.clearAll() })
    expect(writeLibrary.mock.calls).toEqual([
      [{ set: { w1: { favorite: DELETE } } }],
      [{ remove: ['a-b'] }],
      [{ set: { w1: { eps: DELETE }, 'a-b': { eps: DELETE } } }],
      [{ remove: ['w1', 'a-b'] }, { feed: [], reviews: [] }],
    ])
  })

  it('retirer une œuvre retire aussi son avis du document utilisateur (fil d’amis)', async () => {
    const data = { works: { w1: { id: 'w1' } }, watched: {}, reviews: [{ id: 'w1', rating: 4 }, { id: 'w2', rating: 2 }] }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.removeWork('w1') })
    expect(writeLibrary.mock.calls).toEqual([[{ remove: ['w1'] }, { reviews: [{ id: 'w2', rating: 2 }] }]])
  })

  it('reprendre une œuvre abandonnée : refusé, seule la progression est écrite', async () => {
    window.confirm = vi.fn(() => false)
    const data = { works: { w1: { id: 'w1', status: 'abandonne', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, store()))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(written()).toEqual({ set: { w1: { 'eps.1-1': expect.any(Number) } } })
  })

  it('ajout : la fiche est demandée au serveur (identifiant seul), puis la bibliothèque est écrite', async () => {
    const shared = { id: 'tmdb-tv-7', source: 'tmdb', sourceId: 7, title: 'Partagée', category: 'series', seasons: [{ n: 1, episodes: [] }], updatedAt: 5, refreshedAt: 4, leaseUntil: 0 }
    const createCatalogDocs = vi.fn(async () => ({ 'tmdb-tv-7': shared }))
    const { result } = renderHook(() => useWorkActions({ works: {}, watched: {} }, store(), { createCatalogDocs }))
    await act(async () => { await result.current.addWork({ id: 'tmdb-tv-7', source: 'tmdb', title: 'Résultat de recherche (ignoré)' }) })
    expect(createCatalogDocs).toHaveBeenCalledWith(['tmdb-tv-7'])
    const work = written().add['tmdb-tv-7']
    expect(work).toMatchObject({ title: 'Partagée', status: 'a_voir', seasons: expect.any(Array) })
    for (const k of ['updatedAt', 'refreshedAt', 'leaseUntil']) expect(work).not.toHaveProperty(k) // champs internes du catalogue
  })

  it('ajout impossible (source inconnue ou serveur en panne) : rien n’est écrit', async () => {
    const createCatalogDocs = vi.fn(async () => ({}))
    const { result } = renderHook(() => useWorkActions({ works: {}, watched: {} }, store(), { createCatalogDocs }))
    await act(async () => { await expect(result.current.addWork({ id: 'tmdb-tv-8' })).rejects.toThrow('catalog unavailable') })
    expect(writeLibrary).not.toHaveBeenCalled()
  })

  it('une œuvre déjà dans la bibliothèque n’est pas redemandée', async () => {
    const createCatalogDocs = vi.fn()
    const { result } = renderHook(() => useWorkActions({ works: { w1: { id: 'w1' } }, watched: {} }, store(), { createCatalogDocs }))
    await act(async () => { await result.current.addWork({ id: 'w1' }) })
    expect(createCatalogDocs).not.toHaveBeenCalled()
  })

})
