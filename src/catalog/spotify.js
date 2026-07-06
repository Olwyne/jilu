const BASE = 'https://api.spotify.com/v1'

async function getToken() {
  const res = await fetch('/api/spotify-token')
  const json = await res.json()
  return json.access_token
}

export async function spotifySearch(query) {
  const token = await getToken()
  const res = await fetch(`${BASE}/search?type=artist&q=${encodeURIComponent(query)}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const json = await res.json()
  return (json.artists?.items || []).map((a) => ({
    source: 'spotify',
    sourceId: a.id,
    id: `spotify-${a.id}`,
    title: a.name,
    category: 'musique',
    genre: (a.genres || [])[0] || 'Divers',
    year: null,
    overview: '',
    poster: a.images?.[0]?.url || null,
    seasons: null,
    release: null
  }))
}

export async function spotifyGetDetail(work) {
  const token = await getToken()
  const albumsRes = await fetch(`${BASE}/artists/${work.sourceId}/albums?include_groups=album&limit=20`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  const albumsJson = await albumsRes.json()
  const seasons = []
  let n = 1
  for (const album of albumsJson.items || []) {
    const tracksRes = await fetch(`${BASE}/albums/${album.id}/tracks?limit=50`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    const tracksJson = await tracksRes.json()
    seasons.push({
      n: n++,
      name: album.name,
      episodes: (tracksJson.items || []).map((t) => ({
        n: t.track_number,
        title: t.name,
        air: album.release_date ? Date.parse(album.release_date) : Infinity
      }))
    })
  }
  return { ...work, seasons }
}
