export default async function handler(req, res) {
  const { path, ...params } = req.query
  if (!path) { res.status(400).json({ error: 'missing path' }); return }
  const qs = new URLSearchParams({ api_key: process.env.TMDB_API_KEY, ...params }).toString()
  try {
    const upstream = await fetch(`https://api.themoviedb.org/3${path}?${qs}`)
    const json = await upstream.json()
    res.status(upstream.status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
