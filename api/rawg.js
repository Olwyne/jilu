export default async function handler(req, res) {
  const qs = new URLSearchParams({ key: process.env.RAWG_API_KEY, ...req.query }).toString()
  try {
    const upstream = await fetch(`https://api.rawg.io/api/games?${qs}`)
    const json = await upstream.json()
    res.status(upstream.status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
