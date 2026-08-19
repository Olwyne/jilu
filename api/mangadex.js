export default async function handler(req, res) {
  const { path, ...params } = req.query
  if (!path) { res.status(400).json({ error: 'missing path' }); return }
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((val) => qs.append(k, val))
    else qs.set(k, v)
  }
  const qsStr = qs.toString()
  try {
    const upstream = await fetch(`https://api.mangadex.org${path}${qsStr ? '?' + qsStr : ''}`)
    const json = await upstream.json()
    res.status(upstream.status).json(json)
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
}
