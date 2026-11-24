import { mangadexGetChapterMap } from './mangadex.js'
import { http } from './http.js'

const ENDPOINT = 'https://graphql.anilist.co' // CORS ouvert : appel direct, en dev comme en prod
const DAY = 86400000
const MIN_INTERVAL = 800
let lastGqlCall = 0

async function gql(query, variables, attempt = 0) {
  const wait = Math.max(0, lastGqlCall + MIN_INTERVAL - Date.now())
  if (wait > 0) await new Promise((r) => setTimeout(r, wait))
  lastGqlCall = Date.now()

  const res = await http(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  if (res.status === 429 && attempt < 3) {
    // Serveur : la fonction est coupée à 60 s, attendre la tuerait. On échoue, l'œuvre sera reprise plus tard.
    if (typeof window === 'undefined') throw new Error('anilist: rate limited')
    const retryAfter = parseInt(res.headers.get('retry-after') || '60', 10)
    lastGqlCall = Date.now() + retryAfter * 1000
    await new Promise((r) => setTimeout(r, (retryAfter + 1) * 1000))
    return gql(query, variables, attempt + 1)
  }
  // Une panne ne doit pas passer pour « aucun résultat » (404 = œuvre inconnue d'AniList : réponse normale)
  if (res.status >= 400 && res.status !== 404) throw new Error(`anilist: ${res.status}`)
  return res.json()
}

const FIELDS = 'id title { romaji } genres startDate { year } description coverImage { large }'

// Média AniList -> œuvre (sans saisons : elles viennent de anilistGetDetail / anilistGetMangaDetail)
const toWork = (m, manga = false) => ({
  source: manga ? 'anilist-manga' : 'anilist',
  sourceId: m.id,
  id: `${manga ? 'anilist-manga' : 'anilist'}-${m.id}`,
  title: m.title.romaji,
  category: manga ? 'mangas' : 'animes',
  genre: (m.genres || [])[0] || 'Divers',
  year: m.startDate?.year || null,
  overview: (m.description || '').replace(/<[^>]+>/g, ''),
  poster: m.coverImage?.large || null,
  seasons: null,
  release: null,
})

// Liste d'œuvres : `args` = arguments GraphQL de media(...), `manga` = type MANGA
async function list(perPage, args, manga, variables = {}) {
  // GraphQL refuse une variable déclarée mais inutilisée : $search seulement pour une recherche
  const q = `${'search' in variables ? 'query ($search: String) ' : ''}{ Page(perPage: ${perPage}) { media(${args}, type: ${manga ? 'MANGA' : 'ANIME'}) { ${FIELDS} } } }`
  const json = await gql(q, variables)
  return (json.data?.Page?.media || []).map((m) => toWork(m, manga))
}
const genreFilter = (genres) => (genres?.length ? `, genre_in: ${JSON.stringify(genres)}` : '')

export const anilistSearch = (query) => list(10, 'search: $search', false, { search: query })
export const anilistSearchManga = (query) => list(10, 'search: $search, isAdult: false', true, { search: query })
export const anilistTrending = () => list(5, 'sort: TRENDING_DESC, isAdult: false', false)
export const anilistTrendingManga = () => list(5, 'sort: TRENDING_DESC, isAdult: false', true)
export const anilistDiscoverAnime = (genres) => list(20, `sort: POPULARITY_DESC, isAdult: false${genreFilter(genres)}`, false)
export const anilistDiscoverManga = (genres) => list(20, `sort: POPULARITY_DESC, isAdult: false${genreFilter(genres)}`, true)

export async function anilistFindId(originalTitle, year) {
  const q = `query ($search: String) {
    Page(perPage: 5) {
      media(search: $search, type: ANIME) { id startDate { year } }
    }
  }`
  const json = await gql(q, { search: originalTitle })
  const results = json.data?.Page?.media || []
  if (!results.length) return null
  if (!year) return results[0].id
  const match = results.find((r) => r.startDate?.year && Math.abs(r.startDate.year - year) <= 1)
  return match?.id || null
}

const SPECIAL_FORMATS = new Set(['MOVIE', 'OVA', 'SPECIAL', 'MUSIC'])

async function fetchEntry(id) {
  const q = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes status format startDate { year month day }
      relations { edges { relationType node { id } } }
    }
  }`
  const json = await gql(q, { id })
  return json.data?.Media || null
}

export async function anilistGetDetail(anilistId) {
  const visited = new Set()
  const seasons = []
  const specials = []
  let currentId = anilistId
  let ended = false

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const m = await fetchEntry(currentId)
    if (!m) break

    const notYetReleased = m.status === 'NOT_YET_RELEASED'
    const start = (!notYetReleased && m.startDate?.year)
      ? new Date(m.startDate.year, (m.startDate.month || 1) - 1, m.startDate.day || 1).getTime()
      : 0
    const count = m.episodes || 1
    const episodes = Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      title: 'Épisode ' + (i + 1),
      air: start > 0 ? start + i * 7 * DAY : 0
    }))

    if (SPECIAL_FORMATS.has(m.format)) {
      specials.push(...episodes)
    } else {
      seasons.push({ n: seasons.length + 1, name: null, episodes })
      ended = m.status === 'FINISHED' || m.status === 'CANCELLED'
    }

    const sequel = (m.relations?.edges || []).find((e) => e.relationType === 'SEQUEL')
    currentId = sequel?.node?.id || null
  }

  if (specials.length) {
    // Numéro fixe (0) : avec « dernière saison + 1 », une nouvelle saison prenait le numéro des spéciaux
    // et héritait de leur progression. Reprise des données existantes : scripts/migrate-specials.mjs
    seasons.push({ n: 0, name: 'Spéciaux', episodes: specials.map((e, i) => ({ ...e, n: i + 1 })) })
  }

  return { seasons, ended }
}

export async function anilistGetMangaDetail(anilistId) {
  const q = `query ($id: Int) {
    Media(id: $id, type: MANGA) {
      chapters volumes status title { romaji }
    }
  }`
  const json = await gql(q, { id: anilistId })
  const m = json.data?.Media
  if (!m) return { seasons: [], ended: false, chapters: 0, volumes: 0 }

  const ended = m.status === 'FINISHED' || m.status === 'CANCELLED'
  const { map: chapterMap, lastChapter: mangadexChapters, volumeDates, chapterDates } = await mangadexGetChapterMap(m.title.romaji)

  // AniList chapters is null for ongoing manga — fall back to MangaDex lastChapter
  const totalChapters = m.chapters || mangadexChapters || 0

  const volumeEpisodes = {}
  const scanEpisodes = []

  // Scans = chapitres après le dernier tome connu. Avant, un chapitre sans tome est un trou de MangaDex
  // (ex. One Piece : tomes 8–60 absents), pas un scan.
  const known = [...chapterMap].filter(([, v]) => v !== null).sort((a, b) => a[0] - b[0])
  const lastVolChapter = known.length ? known[known.length - 1][0] : 0
  // shortcut: répartition linéaire des chapitres du trou entre les tomes voisins (approx. à ±1 tome) ;
  // brancher une vraie source chapitre→tome si la précision devient nécessaire.
  const volumeOf = (n) => {
    const v = chapterMap.get(n)
    if (v != null) return v
    if (n > lastVolChapter) return null
    const i = known.findIndex(([c]) => c > n)
    const next = known[i]
    const prev = known[i - 1]
    if (!prev) return next[1]
    const gap = next[1] - prev[1] - 1
    if (gap <= 0) return prev[1]
    return prev[1] + 1 + Math.floor((n - prev[0] - 1) * gap / (next[0] - prev[0] - 1))
  }

  for (let n = 1; n <= totalChapters; n++) {
    const volNum = volumeOf(n)
    const air = (volNum === null ? chapterDates?.get(n) : null) || 1
    const ep = { n, title: '', air }
    if (volNum !== null) {
      if (!volumeEpisodes[volNum]) volumeEpisodes[volNum] = []
      volumeEpisodes[volNum].push(ep)
    } else {
      scanEpisodes.push(ep)
    }
  }

  const seasons = []
  if (scanEpisodes.length > 0) {
    seasons.push({ n: 0, name: 'Scans', episodes: scanEpisodes })
  }
  const sortedVols = Object.keys(volumeEpisodes).map(Number).sort((a, b) => a - b)
  for (const v of sortedVols) {
    const release = volumeDates?.get(v) || null
    seasons.push({ n: v, name: `Tome ${v}`, episodes: volumeEpisodes[v], release })
  }

  return { seasons, ended, chapters: totalChapters, volumes: m.volumes || 0 }
}

// Fiche complète depuis AniList : animé (saisons reconstituées via les relations) ou manga (chapitres via MangaDex)
export async function anilistGetWork(type, id) {
  const manga = type === 'manga'
  const q = `query ($id: Int) { Media(id: $id, type: ${manga ? 'MANGA' : 'ANIME'}) { ${FIELDS} } }`
  const m = (await gql(q, { id: Number(id) })).data?.Media
  if (!m) return null
  return { ...toWork(m, manga), ...(manga ? await anilistGetMangaDetail(m.id) : await anilistGetDetail(m.id)) }
}
