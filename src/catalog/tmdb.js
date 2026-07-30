import i18n from '../i18n/index.js'

const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'

function tmdbLocale() {
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en'
  return lang === 'fr' ? 'fr-FR' : 'en-US'
}

function genreLabel(ids) {
  const isFr = i18n.language?.startsWith('fr')
  const MAP = isFr
    ? { 18: 'Drame', 878: 'SF', 28: 'Action', 35: 'Comédie', 27: 'Horreur', 9648: 'Mystère', 16: 'Animation' }
    : { 18: 'Drama', 878: 'Sci-Fi', 28: 'Action', 35: 'Comedy', 27: 'Horror', 9648: 'Mystery', 16: 'Animation' }
  const fallback = isFr ? 'Divers' : 'Other'
  return ids && ids.length ? (MAP[ids[0]] || fallback) : fallback
}

export async function tmdbSearch(query) {
  const res = await fetch(`${BASE}/search/multi?api_key=${KEY}&language=${tmdbLocale()}&query=${encodeURIComponent(query)}`)
  const json = await res.json()
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
  const res = await fetch(`${BASE}/trending/${type}/week?api_key=${KEY}&language=${tmdbLocale()}`)
  const json = await res.json()
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

export async function tmdbGetBothMeta(work) {
  const type = work.category === 'films' ? 'movie' : 'tv'
  const [resFr, resEn] = await Promise.all([
    fetch(`${BASE}/${type}/${work.sourceId}?api_key=${KEY}&language=fr-FR`),
    fetch(`${BASE}/${type}/${work.sourceId}?api_key=${KEY}&language=en-US`)
  ])
  const [fr, en] = await Promise.all([resFr.json(), resEn.json()])
  const titleFr = type === 'tv' ? fr.name : fr.title
  const titleEn = type === 'tv' ? en.name : en.title
  const posterFr = fr.poster_path ? `https://image.tmdb.org/t/p/w300${fr.poster_path}` : null
  const posterEn = en.poster_path ? `https://image.tmdb.org/t/p/w300${en.poster_path}` : null
  return {
    titles: { fr: titleFr, en: titleEn },
    posters: { fr: posterFr || posterEn, en: posterEn || posterFr }
  }
}

export async function tmdbGetDetail(work) {
  if (work.category === 'films') return { ...work, seasons: null }
  const showRes = await fetch(`${BASE}/tv/${work.sourceId}?api_key=${KEY}&language=${tmdbLocale()}`)
  const show = await showRes.json()
  const seasons = []
  for (const s of show.seasons || []) {
    if (s.season_number === 0) continue
    const seasonRes = await fetch(`${BASE}/tv/${work.sourceId}/season/${s.season_number}?api_key=${KEY}&language=${tmdbLocale()}`)
    const seasonJson = await seasonRes.json()
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
  const ended = show.status === 'Ended' || show.status === 'Canceled'
  return { ...work, seasons, ended }
}
