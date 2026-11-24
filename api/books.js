import { authenticated, onlyGet, pickParams, forward } from './_proxy.js'

const PARAMS = ['q', 'maxResults', 'orderBy', 'langRestrict', 'startIndex']

export async function handler(req, res) {
  if (!onlyGet(req, res)) return
  // Un volume précis (création ou rafraîchissement d'une fiche)
  if (req.query.id !== undefined) {
    if (!/^[\w-]{4,40}$/.test(String(req.query.id))) { res.status(400).json({ error: 'invalid id' }); return }
    await forward(res, `https://www.googleapis.com/books/v1/volumes/${req.query.id}?key=${process.env.GOOGLE_BOOKS_API_KEY}`)
    return
  }
  const qs = pickParams(req.query, PARAMS)
  qs.set('key', process.env.GOOGLE_BOOKS_API_KEY)
  await forward(res, `https://www.googleapis.com/books/v1/volumes?${qs}`)
}

export default authenticated(handler)
