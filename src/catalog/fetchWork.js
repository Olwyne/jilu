// Fiche complète d'une œuvre depuis sa seule source, d'après son identifiant : c'est ce que le serveur écrit dans le catalogue partagé, jamais du contenu venu d'un navigateur.
import { tmdbGetWork } from './tmdb.js'
import { anilistFindId, anilistGetDetail, anilistGetWork } from './anilist.js'
import { spotifyGetWork } from './spotify.js'
import { googleBooksGetWork, openLibraryGetWork } from './googleBooks.js'
import { igdbGetWork } from './igdb.js'

// Identifiants reconnus -> récupération. Les anciennes fiches rawg-… (RAWG hors service) ne sont pas récupérables.
const SOURCES = [
  [/^tmdb-(tv|movie)-(\d+)$/, (m) => tmdbGetWork(m[1], m[2])],
  [/^anilist-manga-(\d+)$/, (m) => anilistGetWork('manga', m[1])],
  [/^anilist-(\d+)$/, (m) => anilistGetWork('anime', m[1])],
  [/^spotify-([A-Za-z0-9]{10,40})$/, (m) => spotifyGetWork(m[1])],
  [/^googlebooks-([\w-]{4,40})$/, (m) => googleBooksGetWork(m[1])],
  [/^openlibrary-(OL\d+W)$/, (m) => openLibraryGetWork(m[1])],
  [/^igdb-(\d+)$/, (m) => igdbGetWork(m[1])],
]

export const canFetchWork = (id) => SOURCES.some(([re]) => re.test(String(id)))

// Animés TMDB : les saisons d'AniList sont plus fidèles. AniList en panne : on échoue (ancienne fiche gardée) au lieu d'enregistrer le découpage TMDB, qui décalerait la progression de tous.
async function withAnilistSeasons(work) {
  const anilistId = await anilistFindId(work.originalTitle || work.title, work.year)
  if (!anilistId) return work
  const d = await anilistGetDetail(anilistId)
  const keepTmdb = d.seasons.length <= 1 && (work.seasons?.length || 0) > 1
  return keepTmdb ? { ...work, anilistId } : { ...work, anilistId, seasons: d.seasons, ended: d.ended }
}

// null si l'identifiant est inconnu ou si la source ne connaît pas l'œuvre
export async function fetchWork(id) {
  for (const [re, get] of SOURCES) {
    const m = re.exec(String(id))
    if (!m) continue
    let work = await get(m)
    if (!work?.title) return null
    if (work.source === 'tmdb' && work.category === 'animes') work = await withAnilistSeasons(work)
    return work
  }
  return null
}
