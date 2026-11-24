import { http } from './http.js'
import { currentLanguage } from './locale.js'

const BASE = '/api/tmdb'

function tmdbLocale() {
  const lang = currentLanguage()?.startsWith('fr') ? 'fr' : 'en'
  return lang === 'fr' ? 'fr-FR' : 'en-US'
}

function genreLabel(ids) {
  const isFr = currentLanguage()?.startsWith('fr')
  const MAP = isFr
    ? { 18: 'Drame', 878: 'SF', 28: 'Action', 35: 'Comédie', 27: 'Horreur', 9648: 'Mystère', 16: 'Animation' }
    : { 18: 'Drama', 878: 'Sci-Fi', 28: 'Action', 35: 'Comedy', 27: 'Horror', 9648: 'Mystery', 16: 'Animation' }
  const fallback = isFr ? 'Divers' : 'Other'
  return ids && ids.length ? (MAP[ids[0]] || fallback) : fallback
}

async function tmdbFetch(path, params = {}) {
  const qs = new URLSearchParams({ path, ...params }).toString()
  const res = await http(`${BASE}?${qs}`)
  return res.json()
}

export async function tmdbSearch(query) {
  const json = await tmdbFetch('/search/multi', { language: tmdbLocale(), query })
  return (json.results || [])
    .filter((r) => r.media_type === 'tv' || r.media_type === 'movie')
    .map((r) => {
      const isTv = r.media_type === 'tv'
      const dateStr = isTv ? r.first_air_date : r.release_date
      const year = dateStr ? Number(dateStr.slice(0, 4)) : null
      const isAnime = isTv && (r.genre_ids || []).includes(16)
      return {
        source: 'tmdb',
        sourceId: r.id,
        id: `tmdb-${r.media_type}-${r.id}`,
        title: isTv ? r.name : r.title,
        originalTitle: r.original_name || null,
        category: isAnime ? 'animes' : isTv ? 'series' : 'films',
        genre: genreLabel(r.genre_ids),
        year,
        overview: r.overview || '',
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
        seasons: null,
        release: dateStr ? Date.parse(dateStr) : null
      }
    })
}

export async function tmdbTrending(cat) {
  const type = cat === 'films' ? 'movie' : 'tv'
  const json = await tmdbFetch(`/trending/${type}/week`, { language: tmdbLocale() })
  const isAnimeGenre = (ids) => (ids || []).includes(16)
  return (json.results || [])
    .filter((r) => cat === 'series' ? !isAnimeGenre(r.genre_ids) : true)
    .slice(0, 5)
    .map((r) => {
      const isTv = type === 'tv'
      const dateStr = isTv ? r.first_air_date : r.release_date
      const year = dateStr ? Number(dateStr.slice(0, 4)) : null
      return {
        source: 'tmdb',
        sourceId: r.id,
        id: `tmdb-${isTv ? 'tv' : 'movie'}-${r.id}`,
        title: isTv ? r.name : r.title,
        originalTitle: r.original_name || null,
        category: cat,
        genre: genreLabel(r.genre_ids),
        year,
        overview: r.overview || '',
        poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
        seasons: null,
        release: dateStr ? Date.parse(dateStr) : null
      }
    })
}

export async function tmdbDiscover(genreId, cat) {
  const type = cat === 'films' ? 'movie' : 'tv'
  const json = await tmdbFetch(`/discover/${type}`, { language: tmdbLocale(), with_genres: genreId, sort_by: 'vote_average.desc', 'vote_count.gte': 200, page: 1 })
  return (json.results || []).slice(0, 10).map((r) => {
    const isTv = type === 'tv'
    const dateStr = isTv ? r.first_air_date : r.release_date
    return {
      source: 'tmdb',
      sourceId: r.id,
      id: `tmdb-${isTv ? 'tv' : 'movie'}-${r.id}`,
      title: isTv ? r.name : r.title,
      category: cat,
      genre: genreLabel(r.genre_ids),
      year: dateStr ? Number(dateStr.slice(0, 4)) : null,
      overview: r.overview || '',
      poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
    }
  })
}

const tmdbPoster = (path) => (path ? `https://image.tmdb.org/t/p/w300${path}` : null)

async function tmdbSeasons(tvId) {
  const show = await tmdbFetch(`/tv/${tvId}`, { language: tmdbLocale() })
  const seasons = []
  for (const s of show.seasons || []) {
    if (s.season_number === 0) continue
    const seasonJson = await tmdbFetch(`/tv/${tvId}/season/${s.season_number}`, { language: tmdbLocale() })
    // Réponse d'erreur (pas de liste d'épisodes) : ne pas enregistrer une saison vide à la place de la vraie
    if (!seasonJson.episodes) throw new Error(`tmdb: season ${s.season_number} of ${tvId} unavailable`)
    seasons.push({
      n: s.season_number,
      name: s.name || null,
      episodes: (seasonJson.episodes || []).map((e) => ({
        n: e.episode_number,
        title: e.name,
        air: e.air_date ? Date.parse(e.air_date) : Infinity
      })).sort((a, b) => a.n - b.n)
    })
  }
  return { seasons, ended: show.status === 'Ended' || show.status === 'Canceled' }
}

// Fiche complète depuis TMDB (type : 'tv' | 'movie'), titres et affiches en français et en anglais
export async function tmdbGetWork(type, sourceId) {
  const [fr, en] = await Promise.all([
    tmdbFetch(`/${type}/${sourceId}`, { language: 'fr-FR' }),
    tmdbFetch(`/${type}/${sourceId}`, { language: 'en-US' }),
  ])
  const main = currentLanguage()?.startsWith('fr') ? fr : en
  const isTv = type === 'tv'
  const genreIds = (fr.genres || en.genres || []).map((g) => g.id) // identiques dans les deux langues
  const dateStr = isTv ? main.first_air_date : main.release_date
  const titles = { fr: isTv ? fr.name : fr.title, en: isTv ? en.name : en.title }
  const posterFr = tmdbPoster(fr.poster_path)
  const posterEn = tmdbPoster(en.poster_path)
  const work = {
    source: 'tmdb',
    sourceId: Number(sourceId),
    id: `tmdb-${type}-${sourceId}`,
    title: isTv ? main.name : main.title,
    titles,
    originalTitle: (isTv ? main.original_name : main.original_title) || null,
    category: !isTv ? 'films' : genreIds.includes(16) ? 'animes' : 'series',
    genre: genreLabel(genreIds),
    year: dateStr ? Number(dateStr.slice(0, 4)) : null,
    overview: main.overview || '',
    poster: tmdbPoster(main.poster_path),
    posters: { fr: posterFr || posterEn, en: posterEn || posterFr },
    release: dateStr ? Date.parse(dateStr) : null,
    seasons: null,
  }
  return isTv ? { ...work, ...(await tmdbSeasons(sourceId)) } : work
}

export async function tmdbFetchEpisode(sourceId, sNum, eNum, language) {
  return tmdbFetch(`/tv/${sourceId}/season/${sNum}/episode/${eNum}`, { language })
}
