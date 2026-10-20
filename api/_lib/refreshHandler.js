// Point d'entrée HTTP du rafraîchissement : POST /api/refresh-work { id } + Authorization: Bearer <jeton Firebase>
import { refreshCatalogWork, RefreshError } from './refreshCatalog.js'

const HTTP_STATUS = { refreshed: 200, fresh: 200, busy: 202, not_found: 404, unsupported: 422 }

export function createHandler({ verifyToken, store, fetchFresh, now = Date.now }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).json({ error: 'method not allowed' })
      return
    }

    const token = /^Bearer (.+)$/.exec(req.headers?.authorization || '')?.[1]
    let uid
    try {
      uid = token ? await verifyToken(token) : null
    } catch {
      uid = null
    }
    if (!uid) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const body = typeof req.body === 'string' ? safeParse(req.body) : req.body
    const id = body?.id
    if (typeof id !== 'string' || !id || id.length > 200 || id.includes('/') || id.startsWith('local-')) {
      res.status(400).json({ error: 'invalid id' })
      return
    }

    try {
      const result = await refreshCatalogWork({ store, fetchFresh, id, now: now(), minAgeMs: body?.minAgeMs })
      res.status(HTTP_STATUS[result.status] ?? 500).json(result)
    } catch (e) {
      console.error('[refresh-work]', id, e)
      res.status(502).json({ error: e instanceof RefreshError ? e.code : 'upstream error' })
    }
  }
}

function safeParse(s) {
  try { return JSON.parse(s) } catch { return null }
}
