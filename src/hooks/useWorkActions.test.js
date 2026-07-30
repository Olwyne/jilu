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
})
