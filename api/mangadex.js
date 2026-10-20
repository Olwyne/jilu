import { onlyGet, pickParams, forward } from './_proxy.js'

const ALLOWED_PATHS = [
  /^\/manga$/,
  /^\/manga\/[0-9a-f-]{36}\/aggregate$/,
  /^\/chapter$/,
]
const PARAMS = ['title', 'limit', 'ids[]', 'translatedLanguage[]']

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  const { path } = req.query
  if (typeof path !== 'string' || !ALLOWED_PATHS.some((re) => re.test(path))) {
    res.status(400).json({ error: 'invalid path' })
    return
  }
  const qs = pickParams(req.query, PARAMS, ['ids[]', 'translatedLanguage[]'])
  const qsStr = qs.toString()
  await forward(res, `https://api.mangadex.org${path}${qsStr ? '?' + qsStr : ''}`)
}
