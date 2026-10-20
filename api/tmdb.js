import { onlyGet, pickParams, forward } from './_proxy.js'

// Uniquement les routes TMDB réellement utilisées par l'application
const ALLOWED_PATHS = [
  /^\/search\/(multi|tv|movie)$/,
  /^\/trending\/(movie|tv)\/week$/,
  /^\/discover\/(movie|tv)$/,
  /^\/(movie|tv)\/\d+$/,
  /^\/tv\/\d+\/season\/\d+$/,
  /^\/tv\/\d+\/season\/\d+\/episode\/\d+$/,
  /^\/find\/[\w-]+$/,
]
const PARAMS = ['language', 'query', 'page', 'with_genres', 'sort_by', 'vote_count.gte', 'external_source']

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  const { path } = req.query
  if (typeof path !== 'string' || !ALLOWED_PATHS.some((re) => re.test(path))) {
    res.status(400).json({ error: 'invalid path' })
    return
  }
  const qs = pickParams(req.query, PARAMS)
  qs.set('api_key', process.env.TMDB_API_KEY)
  await forward(res, `https://api.themoviedb.org/3${path}?${qs}`)
}
