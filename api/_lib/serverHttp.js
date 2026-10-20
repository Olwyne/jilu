// Transport HTTP côté serveur pour les modules de src/catalog : traduit les adresses relatives
// du navigateur (/api/tmdb, /api/mangadex, /api/spotify-token) en appels directs aux API amont,
// avec les clés lues dans l'environnement. Tout le reste (adresses absolues) passe tel quel.

export function createServerHttp({ env = process.env, fetchImpl = (...a) => globalThis.fetch(...a) } = {}) {
  let spotify = { token: null, expiresAt: 0 }

  async function spotifyToken() {
    if (spotify.token && Date.now() < spotify.expiresAt - 60_000) return spotify.token
    const basic = Buffer.from(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`).toString('base64')
    const res = await fetchImpl('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    })
    if (!res.ok) throw new Error(`spotify token: ${res.status}`)
    const json = await res.json()
    spotify = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 }
    return spotify.token
  }

  return async function serverHttp(input, init) {
    const raw = typeof input === 'string' ? input : input.url
    if (!raw.startsWith('/')) return fetchImpl(input, init)

    const url = new URL(raw, 'http://internal')
    if (url.pathname === '/api/tmdb') {
      const path = url.searchParams.get('path')
      url.searchParams.delete('path')
      url.searchParams.set('api_key', env.TMDB_API_KEY)
      return fetchImpl(`https://api.themoviedb.org/3${path}?${url.searchParams}`, init)
    }
    if (url.pathname === '/api/mangadex') {
      const path = url.searchParams.get('path')
      url.searchParams.delete('path')
      const qs = url.searchParams.toString()
      return fetchImpl(`https://api.mangadex.org${path}${qs ? '?' + qs : ''}`, { ...init, headers: { 'User-Agent': 'jilu-app', ...(init?.headers || {}) } })
    }
    if (url.pathname === '/api/spotify-token') {
      return new Response(JSON.stringify({ access_token: await spotifyToken() }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    throw new Error(`serverHttp: adresse non prise en charge ${url.pathname}`)
  }
}
