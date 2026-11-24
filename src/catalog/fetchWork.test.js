import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./tmdb.js', () => ({ tmdbGetWork: vi.fn() }))
vi.mock('./anilist.js', () => ({ anilistGetWork: vi.fn(), anilistFindId: vi.fn(), anilistGetDetail: vi.fn() }))
vi.mock('./spotify.js', () => ({ spotifyGetWork: vi.fn() }))
vi.mock('./googleBooks.js', () => ({ googleBooksGetWork: vi.fn(), openLibraryGetWork: vi.fn() }))
vi.mock('./igdb.js', () => ({ igdbGetWork: vi.fn() }))

import { fetchWork, canFetchWork } from './fetchWork.js'
import { tmdbGetWork } from './tmdb.js'
import { anilistGetWork, anilistFindId, anilistGetDetail } from './anilist.js'
import { spotifyGetWork } from './spotify.js'
import { googleBooksGetWork, openLibraryGetWork } from './googleBooks.js'
import { igdbGetWork } from './igdb.js'

const season = (n, c) => ({ n, episodes: Array.from({ length: c }, (_, i) => ({ n: i + 1 })) })
beforeEach(() => vi.clearAllMocks())

describe('fetchWork : la fiche vient de la source, d’après le seul identifiant', () => {
  it('reconnaît chaque type d’identifiant et appelle la bonne source', async () => {
    for (const fn of [tmdbGetWork, anilistGetWork, spotifyGetWork, googleBooksGetWork, openLibraryGetWork, igdbGetWork]) fn.mockResolvedValue({ title: 'T' })
    await fetchWork('tmdb-tv-1396'); expect(tmdbGetWork).toHaveBeenLastCalledWith('tv', '1396')
    await fetchWork('tmdb-movie-42'); expect(tmdbGetWork).toHaveBeenLastCalledWith('movie', '42')
    await fetchWork('anilist-manga-30013'); expect(anilistGetWork).toHaveBeenLastCalledWith('manga', '30013')
    await fetchWork('anilist-16498'); expect(anilistGetWork).toHaveBeenLastCalledWith('anime', '16498')
    await fetchWork('spotify-4tZwfgrHOc3mvqYlEYSvVi'); expect(spotifyGetWork).toHaveBeenLastCalledWith('4tZwfgrHOc3mvqYlEYSvVi')
    await fetchWork('googlebooks-oNY0DwAAQBAJ'); expect(googleBooksGetWork).toHaveBeenLastCalledWith('oNY0DwAAQBAJ')
    await fetchWork('openlibrary-OL45804W'); expect(openLibraryGetWork).toHaveBeenLastCalledWith('OL45804W')
    await fetchWork('igdb-1942'); expect(igdbGetWork).toHaveBeenLastCalledWith('1942')
  })
  it('refuse les identifiants inconnus ou mal formés (rien n’est demandé aux sources)', async () => {
    for (const id of ['rawg-3328', 'local-u-x', 'tmdb-tv-1/../x', 'tmdb-person-1', 'spotify-x', '', 'anilist-abc']) {
      expect(canFetchWork(id)).toBe(false)
      expect(await fetchWork(id)).toBeNull()
    }
    expect(tmdbGetWork).not.toHaveBeenCalled()
  })
  it('null si la source ne connaît pas l’œuvre ou ne renvoie pas de titre', async () => {
    tmdbGetWork.mockResolvedValueOnce(null).mockResolvedValueOnce({ title: '' })
    expect(await fetchWork('tmdb-tv-1')).toBeNull()
    expect(await fetchWork('tmdb-tv-1')).toBeNull()
  })
  it('animé venu de TMDB : saisons AniList (plus fidèles), sauf si TMDB en a plus et AniList une seule', async () => {
    tmdbGetWork.mockResolvedValue({ source: 'tmdb', category: 'animes', title: 'A', originalTitle: 'あ', year: 2020, seasons: [season(1, 12)], ended: true })
    anilistFindId.mockResolvedValue(77)
    anilistGetDetail.mockResolvedValueOnce({ seasons: [season(1, 12), season(2, 12)], ended: false })
    expect(await fetchWork('tmdb-tv-5')).toMatchObject({ anilistId: 77, ended: false, seasons: [{ n: 1 }, { n: 2 }] })
    expect(anilistFindId).toHaveBeenCalledWith('あ', 2020)
    tmdbGetWork.mockResolvedValue({ source: 'tmdb', category: 'animes', title: 'A', seasons: [season(1, 12), season(2, 12)] })
    anilistGetDetail.mockResolvedValueOnce({ seasons: [season(1, 24)], ended: true })
    expect((await fetchWork('tmdb-tv-5')).seasons).toHaveLength(2)
    anilistFindId.mockRejectedValueOnce(new Error('429'))
    await expect(fetchWork('tmdb-tv-5')).rejects.toThrow('429') // AniList indisponible : échec, pas le découpage TMDB
  })
})
