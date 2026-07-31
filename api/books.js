export default async function handler(req, res) {
  const qs = new URLSearchParams({ key: process.env.GOOGLE_BOOKS_API_KEY, ...req.query }).toString()
  try {
    const upstream = await fetch(`https://www.googleapis.com/books/v1/volumes?${qs}`)
    const json = await upstream.json()
    res.status(upstream.status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
