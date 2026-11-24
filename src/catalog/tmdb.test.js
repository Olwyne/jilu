import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmdbSearch, tmdbGetWork } from './tmdb'
import { setLanguageProvider } from './locale'

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

// Répond selon le chemin TMDB demandé (paramètre path) et la langue
const tmdbRoutes = (routes) => vi.fn(async (url) => {
  const q = new URL(url, 'http://x').searchParams
  const body = routes[`${q.get('path')}|${q.get('language') || ''}`] ?? routes[q.get('path')]
  if (!body) throw new Error('route inattendue ' + url)
  return { ok: true, json: async () => body }
})

describe('tmdbGetWork (fiche complète depuis TMDB)', () => {
  beforeEach(() => setLanguageProvider(() => 'fr')) // langue du serveur
  it('série : titres et affiches FR/EN, genre, année, saisons et épisodes, statut de diffusion', async () => {
    global.fetch = tmdbRoutes({
      '/tv/1396|fr-FR': { name: 'Breaking Bad FR', original_name: 'Breaking Bad', poster_path: '/fr.jpg', overview: 'Résumé', first_air_date: '2008-01-20', genres: [{ id: 18 }], status: 'Ended', seasons: [{ season_number: 0 }, { season_number: 1, name: 'Saison 1' }] },
      '/tv/1396|en-US': { name: 'Breaking Bad', poster_path: '/en.jpg', genres: [{ id: 18 }] },
      '/tv/1396/season/1': { episodes: [{ episode_number: 2, name: 'B', air_date: '2008-01-27' }, { episode_number: 1, name: 'Pilote', air_date: '2008-01-20' }] },
    })
    const w = await tmdbGetWork('tv', '1396')
    expect(w).toMatchObject({
      source: 'tmdb', sourceId: 1396, id: 'tmdb-tv-1396', title: 'Breaking Bad FR', originalTitle: 'Breaking Bad',
      titles: { fr: 'Breaking Bad FR', en: 'Breaking Bad' }, category: 'series', genre: 'Drame', year: 2008, overview: 'Résumé',
      poster: 'https://image.tmdb.org/t/p/w300/fr.jpg', posters: { fr: 'https://image.tmdb.org/t/p/w300/fr.jpg', en: 'https://image.tmdb.org/t/p/w300/en.jpg' },
      ended: true,
    })
    expect(w.seasons).toHaveLength(1) // la saison 0 (spéciaux) est ignorée
    expect(w.seasons[0].episodes.map((e) => e.n)).toEqual([1, 2])
  })
  it('animation (genre 16) : catégorie animés', async () => {
    global.fetch = tmdbRoutes({ '/tv/5|fr-FR': { name: 'A', genres: [{ id: 16 }], seasons: [] }, '/tv/5|en-US': { name: 'A' } })
    expect((await tmdbGetWork('tv', '5')).category).toBe('animes')
  })
  it('film : pas de saisons', async () => {
    global.fetch = tmdbRoutes({ '/movie/42|fr-FR': { title: 'Dune', release_date: '2021-10-22', genres: [{ id: 878 }] }, '/movie/42|en-US': { title: 'Dune' } })
    expect(await tmdbGetWork('movie', '42')).toMatchObject({ id: 'tmdb-movie-42', category: 'films', seasons: null, year: 2021 })
  })
})
