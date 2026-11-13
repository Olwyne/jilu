// Création des fiches du catalogue partagé : POST /api/catalog-ensure { ids } + Authorization: Bearer <jeton Firebase>
// Seul le serveur crée une fiche partagée, entièrement construite depuis la source (fetchWork) : un navigateur ne
// peut y injecter aucun contenu. Les fiches déjà présentes ne sont pas touchées.
import { clean } from '../../src/lib/catalogUtils.js'
import { canFetchWork } from '../../src/catalog/fetchWork.js'
import { uidFromRequest, jsonBody } from './auth.js'

export const ENSURE_MAX_IDS = 20
const BUDGET_MS = 45 * 1000 // la fonction est coupée à 60 s ; le reste est signalé « pending »
const CONCURRENCY = 3

export function createEnsureHandler({ verifyToken, store, fetchWork, now = Date.now, budgetMs = BUDGET_MS }) {
  return async function handler(req, res) {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST')
      res.status(405).json({ error: 'method not allowed' })
      return
    }
    if (!(await uidFromRequest(req, verifyToken))) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    const ids = jsonBody(req)?.ids
    if (!Array.isArray(ids) || !ids.length || ids.length > ENSURE_MAX_IDS || !ids.every((id) => typeof id === 'string' && id.length <= 100)) {
      res.status(400).json({ error: 'invalid ids' })
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
