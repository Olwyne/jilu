import { onlyGet, pickParams, forward } from './_proxy.js'

const PARAMS = ['search', 'ordering', 'page_size', 'page', 'genres']

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  const qs = pickParams(req.query, PARAMS)
  qs.set('key', process.env.RAWG_API_KEY)
  await forward(res, `https://api.rawg.io/api/games?${qs}`)
}
