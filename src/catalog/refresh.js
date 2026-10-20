// Récupération des données fraîches d'une œuvre auprès des sources (TMDB, AniList, MangaDex, Spotify).
// Partagé par le navigateur (rafraîchissement actuel) et par la fonction serveur (api/refresh-work.js).
import { tmdbGetDetail, tmdbGetBothMeta } from './tmdb.js'
import { anilistFindId, anilistGetDetail, anilistGetMangaDetail } from './anilist.js'
import { spotifyGetDetail } from './spotify.js'

export const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: (work) => anilistGetDetail(work.anilistId || work.sourceId).then((d) => ({ ...work, ...d })),
  'anilist-manga': (work) => anilistGetMangaDetail(work.sourceId).then((d) => ({ ...work, ...d })),
  spotify: spotifyGetDetail
}

export async function fetchFreshWork(work) {
  const fetcher = DETAIL_FETCHERS[work.source]
  const fresh = await fetcher(work)
  const meta = work.source === 'tmdb' ? await tmdbGetBothMeta(work) : {}
  let next = { ...work, ...fresh, ...meta, status: work.status, added: work.added }
  if (work.category === 'animes') {
    let anilistId = work.anilistId
    if (!anilistId) anilistId = await anilistFindId(work.originalTitle || work.title, work.year)
    if (anilistId) {
      const anilistDetail = await anilistGetDetail(anilistId)
      const keepTmdb = anilistDetail.seasons.length <= 1 && (next.seasons?.length || 0) > 1
      next = keepTmdb ? { ...next, anilistId } : { ...next, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
    }
  }
  return next
}
