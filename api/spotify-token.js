import { onlyGet } from './_proxy.js'

// Jeton client-credentials mis en cache dans l'instance (≈ 1 h de validité) et côté CDN.
let cached = { token: null, expiresAt: 0 }

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  try {
    if (!cached.token || Date.now() > cached.expiresAt - 60_000) {
      const id = process.env.SPOTIFY_CLIENT_ID
      const secret = process.env.SPOTIFY_CLIENT_SECRET
      const basic = Buffer.from(`${id}:${secret}`).toString('base64')
      const tokenRes = await fetch('https://accounts.spotify.com/api/token', {
        method: 'POST',
        headers: { 'Authorization': `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'grant_type=client_credentials',
      })
      if (!tokenRes.ok) { res.status(502).json({ error: 'upstream error' }); return }
      const json = await tokenRes.json()
      cached = { token: json.access_token, expiresAt: Date.now() + (json.expires_in || 3600) * 1000 }
    }
    res.setHeader('Cache-Control', 'private, max-age=1800')
    res.status(200).json({ access_token: cached.token })
  } catch {
    res.status(502).json({ error: 'upstream error' })
  }
}
