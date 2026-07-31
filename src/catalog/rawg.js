export async function rawgTrending() {
  const res = await fetch('/api/rawg?ordering=-added&page_size=5')
  const json = await res.json()
  return (json.results || []).map((g) => ({
    source: 'rawg',
    sourceId: g.id,
    id: `rawg-${g.id}`,
    title: g.name,
    category: 'jeux',
    genre: (g.genres || [])[0]?.name || 'Divers',
    year: g.released ? Number(g.released.slice(0, 4)) : null,
    overview: '',
    poster: g.background_image || null,
    seasons: null,
    release: g.released ? Date.parse(g.released) : null
  }))
}

export async function rawgDiscover(genre) {
  const params = new URLSearchParams({ ordering: '-rating', page_size: 20 })
  if (genre) params.set('genres', genre.toLowerCase())
  const res = await fetch(`/api/rawg?${params}`)
  const json = await res.json()
  return (json.results || []).map((g) => ({
    source: 'rawg',
    sourceId: g.id,
    id: `rawg-${g.id}`,
    title: g.name,
    category: 'jeux',
    genre: (g.genres || [])[0]?.name || 'Divers',
    year: g.released ? Number(g.released.slice(0, 4)) : null,
    overview: '',
    poster: g.background_image || null,
    seasons: null,
    release: g.released ? Date.parse(g.released) : null
  }))
}

export async function rawgSearch(query) {
  const res = await fetch(`/api/rawg?search=${encodeURIComponent(query)}&page_size=10`)
  const json = await res.json()
  return (json.results || []).map((g) => ({
    source: 'rawg',
    sourceId: g.id,
    id: `rawg-${g.id}`,
    title: g.name,
    category: 'jeux',
    genre: (g.genres || [])[0]?.name || 'Divers',
    year: g.released ? Number(g.released.slice(0, 4)) : null,
    overview: '',
    poster: g.background_image || null,
    seasons: null,
    release: g.released ? Date.parse(g.released) : null
  }))
}
