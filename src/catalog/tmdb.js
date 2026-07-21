const KEY = import.meta.env.VITE_TMDB_API_KEY
const BASE = 'https://api.themoviedb.org/3'

function genreLabel(ids) {
  const MAP = { 18: 'Drame', 878: 'SF', 28: 'Action', 35: 'Comédie', 27: 'Horreur', 9648: 'Mystère', 16: 'Animation' }
  return ids && ids.length ? (MAP[ids[0]] || 'Divers') : 'Divers'
}

export async function tmdbSearch(query) {
  const res = await fetch(`${BASE}/search/multi?api_key=${KEY}&language=fr-FR&query=${encodeURIComponent(query)}`)
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

export async function tmdbGetDetail(work) {
  if (work.category === 'films') return { ...work, seasons: null }
  const showRes = await fetch(`${BASE}/tv/${work.sourceId}?api_key=${KEY}&language=fr-FR`)
  const show = await showRes.json()
  const seasons = []
  for (const s of show.seasons || []) {
    if (s.season_number === 0) continue
    const seasonRes = await fetch(`${BASE}/tv/${work.sourceId}/season/${s.season_number}?api_key=${KEY}&language=fr-FR`)
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
