// Transport HTTP côté serveur des modules de src/catalog : les adresses relatives du navigateur (/api/tmdb, …)
// sont servies en appelant directement les fonctions api/ correspondantes (mêmes listes blanches, mêmes clés).
// Les adresses absolues (AniList, Spotify, Open Library) passent telles quelles.
import tmdb from '../tmdb.js'
import mangadex from '../mangadex.js'
import books from '../books.js'
import igdb from '../igdb.js'
import spotifyToken from '../spotify-token.js'

const HANDLERS = { tmdb, mangadex, books, igdb, 'spotify-token': spotifyToken }

// 10 s par appel : une API qui ne répond pas ne doit pas occuper la fonction jusqu'à sa coupure (60 s)
const withTimeout = (input, init) => globalThis.fetch(input, { signal: AbortSignal.timeout(10_000), ...init })

export function createServerHttp({ handlers = HANDLERS, fetchImpl = withTimeout } = {}) {
  return async function serverHttp(input, init) {
    const raw = typeof input === 'string' ? input : input.url
    if (!raw.startsWith('/')) return fetchImpl(input, init)

    const url = new URL(raw, 'http://internal')
    const handler = url.pathname.startsWith('/api/') && handlers[url.pathname.slice(5)]
    if (!handler) throw new Error(`serverHttp: adresse non prise en charge ${url.pathname}`)
    const query = {}
    for (const k of new Set(url.searchParams.keys())) {
      const all = url.searchParams.getAll(k)
      query[k] = all.length > 1 ? all : all[0]
    }
    let status = 200
    let body = null
    const res = { setHeader() {}, status(c) { status = c; return res }, json(b) { body = b; return res } }
    await handler({ method: 'GET', query, headers: {} }, res)
    return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  }
}
