import { onlyGet, pickParams, forward } from './_proxy.js'

const PARAMS = ['q', 'maxResults', 'orderBy', 'langRestrict', 'startIndex']

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  const qs = pickParams(req.query, PARAMS)
  qs.set('key', process.env.GOOGLE_BOOKS_API_KEY)
  await forward(res, `https://www.googleapis.com/books/v1/volumes?${qs}`)
}
