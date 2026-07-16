import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmdbSearch, tmdbGetDetail } from './tmdb'

beforeEach(() => { global.fetch = vi.fn() })

describe('tmdbSearch', () => {
  it('normalizes multi-search results into Work shape', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: 1396, media_type: 'tv', name: 'Breaking Bad', original_name: 'Breaking Bad', overview: '...', first_air_date: '2008-01-20', genre_ids: [18] },
          { id: 42, media_type: 'movie', title: 'Dune', original_name: 'Dune', overview: '...', release_date: '2021-10-22', genre_ids: [878] }
        ]
      })
    })
    const results = await tmdbSearch('bre')
    expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-1396', title: 'Breaking Bad', originalTitle: 'Breaking Bad', category: 'series', year: 2008 })
    expect(results[1]).toMatchObject({ source: 'tmdb', id: 'tmdb-movie-42', title: 'Dune', originalTitle: 'Dune', category: 'films', year: 2021 })
  })

  it('categorizes animation tv as animes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: 130590, media_type: 'tv', name: 'Blue Lock', original_name: 'ブルーロック', overview: '...', first_air_date: '2022-10-08', genre_ids: [16, 28] }
        ]
      })
    })
    const results = await tmdbSearch('blue lock')
    expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-130590', title: 'Blue Lock', originalTitle: 'ブルーロック', category: 'animes' })
  })

  it('ignores non-tv/movie results (e.g. person)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: 9, media_type: 'person', name: 'Someone' }] }) })
    const results = await tmdbSearch('someone')
    expect(results).toHaveLength(0)
  })
})

describe('tmdbGetDetail', () => {
  it('fetches season/episode lists for a tv work', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ seasons: [{ season_number: 1, name: 'Season 1' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ episodes: [{ episode_number: 1, name: 'Pilot', air_date: '2008-01-20' }] }) })
    const work = { source: 'tmdb', id: 'tmdb-tv-1396', sourceId: 1396, category: 'series', title: 'Breaking Bad' }
    const detailed = await tmdbGetDetail(work)
    expect(detailed.seasons).toHaveLength(1)
    expect(detailed.seasons[0].episodes[0]).toMatchObject({ n: 1, title: 'Pilot' })
  })

  it('returns seasons: null for a film', async () => {
    const work = { source: 'tmdb', id: 'tmdb-movie-42', sourceId: 42, category: 'films', title: 'Dune', release: Date.parse('2021-10-22') }
    const detailed = await tmdbGetDetail(work)
    expect(detailed.seasons).toBeNull()
  })
})
