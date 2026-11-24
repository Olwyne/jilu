// Utilitaires partagés par les fonctions serverless (le préfixe "_" empêche Vercel d'en faire une route).
import { getAuth } from 'firebase-admin/auth'
import { initAdminApp } from './_lib/adminApp.js'

// Réponses mises en cache par le CDN Vercel : les mêmes requêtes de plusieurs utilisateurs
// n'atteignent l'API amont qu'une fois, ce qui protège les quotas.
const CACHE = 'public, s-maxage=3600, stale-while-revalidate=86400'

async function verifyFirebaseToken(token) {
  initAdminApp()
  await getAuth().verifyIdToken(token)
}

// Réservé aux comptes connectés (quotas partagés). Jeton dans X-Firebase-Token : Vercel ne met pas en cache une requête qui porte Authorization.
// Le serveur appelle directement la fonction interne (api/_lib/serverHttp.js), sans ce contrôle.
export function authenticated(handler, verify = verifyFirebaseToken) {
  return async function (req, res) {
    try {
      const token = req.headers?.['x-firebase-token']
      if (!token) throw new Error('jeton absent')
      await verify(token)
    } catch {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    return handler(req, res)
  }
}

export function onlyGet(req, res) {
  if (req.method === 'GET' || req.method === 'HEAD') return true
  res.setHeader('Allow', 'GET, HEAD')
  res.status(405).json({ error: 'method not allowed' })
  return false
}

// Ne conserve que les paramètres autorisés (liste blanche) ; ignore les tableaux/objets imbriqués sauf si `arrays` les liste.
export function pickParams(query, allowed, arrays = []) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query)) {
    const base = k.replace(/\[\]$/, '')
    if (!allowed.includes(k) && !allowed.includes(base)) continue
    if (Array.isArray(v)) {
      if (!arrays.includes(k)) continue
      v.slice(0, 100).forEach((val) => qs.append(k, String(val)))
    } else if (v !== undefined) {
      qs.set(k, String(v))
    }
  }
  return qs
}

export async function forward(res, url, init) {
  try {
    const upstream = await fetch(url, { signal: AbortSignal.timeout(10_000), ...init }) // API muette : 502, pas 60 s d'attente
    const json = await upstream.json()
    if (upstream.ok) res.setHeader('Cache-Control', CACHE)
    res.status(upstream.status).json(json)
  } catch {
    res.status(502).json({ error: 'upstream error' })
  }
}
