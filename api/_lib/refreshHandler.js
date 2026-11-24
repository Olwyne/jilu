// Point d'entrée HTTP du rafraîchissement : POST /api/refresh-work { id } + Authorization: Bearer <jeton Firebase>
import { refreshCatalogWork, RefreshError } from './refreshCatalog.js'
import { uidFromRequest, jsonBody } from './auth.js'

export const REFRESH_DAILY_MAX = 500 // demandes par utilisateur et par jour (le bouton « tout rafraîchir » en fait 100 au plus)
const HTTP_STATUS ={ refreshed: 200, fresh: 200, busy: 202, not_found: 404, unsupported: 422 }

export function createHandler({ verifyToken, store, fetchFresh, now = Date.now }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).json({ error: 'method not allowed' })
      return
    }

    const uid = await uidFromRequest(req, verifyToken)
    if (!uid) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }

    const body = jsonBody(req)
    const id = body?.id
    if (typeof id !== 'string' || !id || id.length > 200 || id.includes('/') || id.startsWith('local-')) {
      res.status(400).json({ error: 'invalid id' })
      return
    }
    if (!(await store.consumeQuota(uid, 'refresh', 1, REFRESH_DAILY_MAX, now()))) {
      res.status(429).json({ error: 'daily quota reached' })
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
