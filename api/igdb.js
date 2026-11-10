import { onlyGet, forward } from './_proxy.js'

// IGDB (Twitch) : jeux vidéo. Gratuit pour un usage non commercial, 4 requêtes/s pour toute l'application.
// Seules quelques opérations fixes sont exposées : la requête IGDB est construite ici, jamais par le client.
const FIELDS = 'fields id,name,first_release_date,cover.image_id,genres.name,themes.name,summary;'
const str = (s) => `"${String(s).replace(/["\\]/g, '').slice(0, 100)}"` // chaîne sûre pour la syntaxe IGDB (Apicalypse)
const DAY = 24 * 60 * 60

export const OPS = {
  search: ({ q }) => q && ['games', `search ${str(q)}; ${FIELDS} where version_parent = null; limit 10;`],
  // Sorties récentes les plus notées
  trending: () => ['games', `${FIELDS} where first_release_date > ${Math.floor(Date.now() / 1000) - 120 * DAY} & total_rating_count > 3 & version_parent = null; sort total_rating_count desc; limit 5;`],
  // Les mieux notés d'un genre ou d'un thème (les noms RAWG déjà enregistrés, ex. « Action », sont des thèmes chez IGDB)
  genre: ({ genre }) => genre && ['games', `${FIELDS} where (genres.name ~ *${str(genre)}* | themes.name ~ *${str(genre)}*) & total_rating_count > 50 & version_parent = null; sort total_rating desc; limit 20;`],
  // Durées de jeu (en secondes) : rapide (histoire), normal (extras), complet (100 %)
  ttb: ({ id }) => /^\d+$/.test(id || '') && ['game_time_to_beats', `fields game_id,hastily,normally,completely,count; where game_id = ${id};`],
}

let cached = { token: null, expiresAt: 0 }

async function twitchToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token
  const qs = new URLSearchParams({ client_id: process.env.TWITCH_CLIENT_ID, client_secret: process.env.TWITCH_CLIENT_SECRET, grant_type: 'client_credentials' })
  const res = await fetch(`https://id.twitch.tv/oauth2/token?${qs}`, { method: 'POST' })
  if (!res.ok) throw new Error(`twitch token: ${res.status}`)
  const json = await res.json()
  cached = { token: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 }
  return cached.token
}

export default async function handler(req, res) {
  if (!onlyGet(req, res)) return
  const op = OPS[req.query.op]
  const built = op && op(req.query)
  if (!built) {
    res.status(400).json({ error: 'invalid op' })
    return
  }
  let token
  try {
    token = await twitchToken()
  } catch {
    res.status(502).json({ error: 'upstream error' })
    return
  }
  const [endpoint, body] = built
  await forward(res, `https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': process.env.TWITCH_CLIENT_ID, Authorization: `Bearer ${token}`, 'Content-Type': 'text/plain' },
    body,
  })
}
