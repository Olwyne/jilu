import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkActions } from './useWorkActions'
import { renderHook, act } from '@testing-library/react'
import { tmdbGetDetail } from '../catalog/tmdb'
import { anilistFindId, anilistGetDetail, anilistGetMangaDetail } from '../catalog/anilist'

vi.mock('../catalog/tmdb', () => ({ tmdbGetDetail: vi.fn(), tmdbGetBothMeta: vi.fn().mockResolvedValue({}), tmdbSearch: vi.fn() }))
vi.mock('../catalog/anilist', () => ({ anilistFindId: vi.fn(), anilistGetDetail: vi.fn(), anilistSearch: vi.fn(), anilistGetMangaDetail: vi.fn() }))
vi.mock('../catalog/spotify', () => ({ spotifyGetDetail: vi.fn() }))

beforeEach(() => { vi.clearAllMocks() })

describe('useWorkActions', () => {
  it('toggleEpisode marks episode and updates status atomically', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({
      watched: { 'w1-1-1': expect.any(Number) },
      works: expect.objectContaining({ w1: expect.objectContaining({ status: 'en_cours' }) })
    })
  })

  it('toggleEpisode un-marks and status reverts to a_voir when nothing left watched', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: { 'w1-1-1': 123 } }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({
      watched: {},
      works: expect.objectContaining({ w1: expect.objectContaining({ status: 'a_voir' }) })
    })
  })

  it('setRating toggles off when clicking the same value again', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {}, watched: {}, ratings: { 'w:w1': 4 }, reviews: [] }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.setRating('w', 'w1', 4) })
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ ratings: { 'w:w1': 0 } }))
  })

  it('setStatus updates the work status directly', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'a_voir' } } }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.setStatus('w1', 'abandonne') })
    expect(mutate.mock.calls[0][0].works.w1.status).toBe('abandonne')
  })

  it('addWork fetches full detail before storing, keyed by search result id', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {} }
    vi.mocked(tmdbGetDetail).mockResolvedValue({ id: 'tmdb-tv-1', title: 'X', seasons: [] })
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-1', title: 'X' }) })
    expect(mutate.mock.calls[0][0].works['tmdb-tv-1']).toMatchObject({ title: 'X', status: 'a_voir' })
  })

  it('addWork stores anilistId and AniList seasons for anime', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {} }
    vi.mocked(tmdbGetDetail).mockResolvedValue({
      id: 'tmdb-tv-131041', sourceId: 131041, title: 'Blue Lock', category: 'animes',
      originalTitle: 'ブルーロック', year: 2022, seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }]
    })
    vi.mocked(anilistFindId).mockResolvedValue(163134)
    vi.mocked(anilistGetDetail).mockResolvedValue({
      seasons: [
        { n: 1, name: null, episodes: [{ n: 1, title: 'Épisode 1', air: 0 }] },
        { n: 2, name: null, episodes: [{ n: 1, title: 'Épisode 1', air: 1 }] }
      ],
      ended: false
    })
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => {
      await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-131041', sourceId: 131041, title: 'Blue Lock', category: 'animes', originalTitle: 'ブルーロック', year: 2022 })
    })
    const stored = mutate.mock.calls[0][0].works['tmdb-tv-131041']
    expect(stored.anilistId).toBe(163134)
    expect(stored.seasons).toHaveLength(2)
    expect(stored.title).toBe('Blue Lock')
  })

  it('addWork with source anilist-manga calls anilistGetMangaDetail with sourceId', async () => {
    const mutate = vi.fn().mockResolvedValue()
    anilistGetMangaDetail.mockResolvedValue({
      seasons: [{ n: 1, name: 'Tome 1', episodes: [{ n: 1, title: '', air: 1 }] }],
      ended: false, chapters: 1, volumes: 1
    })
    const data = { works: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => {
      await result.current.addWork({ source: 'anilist-manga', sourceId: 13, id: 'anilist-manga-13', title: 'One Piece', category: 'mangas', status: 'a_voir' })
    })
    expect(anilistGetMangaDetail).toHaveBeenCalledWith(13)
  })

  it('addWork falls back to TMDB seasons when anilistFindId returns null', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {} }
    vi.mocked(tmdbGetDetail).mockResolvedValue({
      id: 'tmdb-tv-999', sourceId: 999, title: 'Some Anime', category: 'animes',
      originalTitle: 'Some Anime', year: 2023,
      seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }]
    })
    vi.mocked(anilistFindId).mockResolvedValue(null)
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => {
      await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-999', sourceId: 999, title: 'Some Anime', category: 'animes', originalTitle: 'Some Anime', year: 2023 })
    })
    const stored = mutate.mock.calls[0][0].works['tmdb-tv-999']
    expect(stored.anilistId).toBeUndefined()
    expect(stored.seasons).toHaveLength(1)
  })

  it('stamps finishedAt when setting status to termine on a work that lacks it', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, mutate))

    const before = Date.now()
    await act(async () => { await result.current.setStatus('w1', 'termine') })
    const after = Date.now()

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.status).toBe('termine')
    expect(saved.finishedAt).toBeGreaterThanOrEqual(before)
    expect(saved.finishedAt).toBeLessThanOrEqual(after)
  })

  it('does not overwrite finishedAt when already set', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'en_cours', finishedAt: 999 }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, mutate))

    await act(async () => { await result.current.setStatus('w1', 'termine') })

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBe(999)
  })

  it('does not stamp finishedAt when status is not termine', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const { result } = renderHook(() => useWorkActions(data, mutate))

    await act(async () => { await result.current.setStatus('w1', 'en_cours') })

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBeUndefined()
  })

  it('toggleEpisode stamps finishedAt when the last episode becomes watched', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const work = { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1 }] }] }
    const data = { works: { w1: work }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))

    const before = Date.now()
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    const after = Date.now()

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBeGreaterThanOrEqual(before)
    expect(saved.finishedAt).toBeLessThanOrEqual(after)
  })

  it('toggleEpisode does not overwrite finishedAt when already set', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const work = { id: 'w1', status: 'a_voir', finishedAt: 999, seasons: [{ n: 1, episodes: [{ n: 1 }] }] }
    const data = { works: { w1: work }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))

    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBe(999)
  })
  it('markAllWatched keeps existing watch dates and never stores booleans', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = {
      works: { w1: { id: 'w1', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }, { n: 3, air: Infinity }] }] } },
      watched: { 'w1-1-1': 123, 'other-1-1': 456 }
    }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.markAllWatched() })
    const { watched } = mutate.mock.calls[0][0]
    expect(watched['w1-1-1']).toBe(123)
    expect(watched['other-1-1']).toBe(456)
    expect(watched['w1-1-2']).toEqual(expect.any(Number))
    expect(watched['w1-1-2']).toBeGreaterThan(1)
    expect(watched['w1-1-3']).toBeUndefined()
  })

  it('addWork réutilise la fiche du catalogue partagé sans appeler les API', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const shared = { id: 'tmdb-tv-7', source: 'tmdb', sourceId: 7, title: 'Partagée', category: 'series', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }], updatedAt: 5, refreshedAt: 4, leaseUntil: 0 }
    const services = { getCatalogDoc: vi.fn().mockResolvedValue(shared) }
    const { result } = renderHook(() => useWorkActions({ works: {}, watched: {} }, mutate, services))
    await act(async () => { await result.current.addWork({ id: 'tmdb-tv-7', source: 'tmdb', sourceId: 7, category: 'series', title: 'Résultat de recherche' }) })
    expect(tmdbGetDetail).not.toHaveBeenCalled()
    expect(anilistFindId).not.toHaveBeenCalled()
    const { works } = mutate.mock.calls[0][0]
    expect(works['tmdb-tv-7']).toMatchObject({ title: 'Partagée', status: 'a_voir', seasons: expect.any(Array) })
    expect(works['tmdb-tv-7']).not.toHaveProperty('updatedAt')   // champs internes du catalogue
    expect(works['tmdb-tv-7']).not.toHaveProperty('refreshedAt')
    expect(works['tmdb-tv-7']).not.toHaveProperty('leaseUntil')
  })

  it('addWork interroge les API seulement si personne ne l’a encore ajoutée', async () => {
    const mutate = vi.fn().mockResolvedValue()
    tmdbGetDetail.mockResolvedValue({ id: 'tmdb-tv-8', title: 'Nouvelle', seasons: [{ n: 1, episodes: [] }] })
    const services = { getCatalogDoc: vi.fn().mockResolvedValue(null) }
    const { result } = renderHook(() => useWorkActions({ works: {}, watched: {} }, mutate, services))
    await act(async () => { await result.current.addWork({ id: 'tmdb-tv-8', source: 'tmdb', sourceId: 8, category: 'series', title: 'Nouvelle' }) })
    expect(tmdbGetDetail).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0].works['tmdb-tv-8']).toMatchObject({ status: 'a_voir' })
  })

  it('le rafraîchissement est délégué au serveur (aucun appel d’API depuis le navigateur)', async () => {
    const services = { refreshWork: vi.fn().mockResolvedValue({ refreshed: ['w1'] }), refreshAll: vi.fn().mockResolvedValue({ refreshed: [] }) }
    const { result } = renderHook(() => useWorkActions({ works: { w1: { id: 'w1' } }, watched: {} }, vi.fn(), services))
    await act(async () => { await result.current.refreshWork('w1') })
    await act(async () => { await result.current.refreshAllWorks(() => {}) })
    expect(services.refreshWork).toHaveBeenCalledWith('w1')
    expect(services.refreshAll).toHaveBeenCalledTimes(1)
    expect(tmdbGetDetail).not.toHaveBeenCalled()
    expect(result.current.refreshStaleWorks).toBeUndefined()
  })
})
