export default async function handler(req, res) {
  const { path, ...params } = req.query
  if (!path) { res.status(400).json({ error: 'missing path' }); return }
  const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
  try {
    const upstream = await fetch(`https://api.mangadex.org${path}${qs}`)
    const json = await upstream.json()
    res.status(upstream.status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
