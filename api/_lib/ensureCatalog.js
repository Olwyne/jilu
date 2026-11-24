// POST /api/catalog-ensure { ids } + jeton Firebase : seul le serveur crée une fiche partagée, construite depuis la source, jamais depuis du contenu client.
import { clean } from '../../src/lib/catalogUtils.js'
import { canFetchWork } from '../../src/catalog/fetchWork.js'
import { uidFromRequest, jsonBody } from './auth.js'

export const ENSURE_MAX_IDS = 20
// Fiches demandées par utilisateur et par jour (les redemandes « pending » comptent). Un import de plus de
// 2 000 œuvres se termine le lendemain : les œuvres refusées sont listées dans les échecs de l'import.
export const ENSURE_DAILY_MAX = 2000
const BUDGET_MS = 45 * 1000 // la fonction est coupée à 60 s ; le reste est signalé « pending »
const CONCURRENCY = 3

export function createEnsureHandler({ verifyToken, store, fetchWork, now = Date.now, budgetMs = BUDGET_MS }) {
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
    const ids = jsonBody(req)?.ids
    if (!Array.isArray(ids) || !ids.length || ids.length > ENSURE_MAX_IDS || !ids.every((id) => typeof id === 'string' && id.length <= 100)) {
      res.status(400).json({ error: 'invalid ids' })
      return
    }
    if (!(await store.consumeQuota(uid, 'ensure', ids.length, ENSURE_DAILY_MAX, now()))) {
      res.status(429).json({ error: 'daily quota reached' })
      return
    }

    const queue = [...new Set(ids)]
    const results = Object.fromEntries(queue.map((id) => [id, 'pending']))
    const start = now()
    let next = 0
    async function worker() {
      while (next < queue.length && now() - start <= budgetMs) {
        const id = queue[next++]
        try {
          if (!canFetchWork(id)) results[id] = 'unsupported'
          else if (await store.get(id)) results[id] = 'exists'
          else {
            const work = await fetchWork(id)
            if (!work) results[id] = 'not_found'
            else results[id] = (await store.create(id, clean({ ...work, id, refreshedAt: now(), updatedAt: now() }))) ? 'created' : 'exists'
          }
        } catch (e) {
          results[id] = 'failed'
          console.error('[catalog-ensure]', id, e.message)
        }
      }
    }
    await Promise.all(Array.from({ length: CONCURRENCY }, worker))
    res.status(200).json({ results })
  }
}
