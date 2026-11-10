// Rafraîchissement planifié (cron Vercel, une fois par jour) : les œuvres encore en cours de diffusion,
// les plus anciennes d'abord, tant qu'il reste du temps. Les œuvres que personne n'ouvre restent ainsi à jour.
import { refreshCatalogWork } from './refreshCatalog.js'

export const CRON_MIN_AGE_MS = 20 * 60 * 60 * 1000 // déjà rafraîchie dans la journée (par un utilisateur) : on passe
export const CRON_BUDGET_MS = 45 * 1000 // la fonction est coupée à 60 s
export const CRON_CONCURRENCY = 3 // œuvres traitées en parallèle (AniList limite lui-même son rythme)

export function createCronHandler({ store, fetchFresh, secret, now = Date.now, budgetMs = CRON_BUDGET_MS, concurrency = CRON_CONCURRENCY }) {
  return async function handler(req, res) {
    // Vercel envoie « Authorization: Bearer <CRON_SECRET> » ; sans secret configuré, personne n'entre
    if (!secret || req.headers?.authorization !== `Bearer ${secret}`) {
      res.status(401).json({ error: 'unauthorized' })
      return
    }
    const start = now()
    const queue = (await store.listAiring())
      .filter((w) => start - w.refreshedAt >= CRON_MIN_AGE_MS)
      .sort((a, b) => a.refreshedAt - b.refreshedAt)
    const counts = { refreshed: 0, skipped: 0, failed: 0 }
    let next = 0
    let done = 0
    // Chaque « ouvrier » prend l'œuvre suivante de la file tant qu'il reste du temps
    async function worker() {
      while (next < queue.length && now() - start <= budgetMs) {
        const { id } = queue[next++]
        try {
          const r = await refreshCatalogWork({ store, fetchFresh, id, now: now(), minAgeMs: CRON_MIN_AGE_MS })
          counts[r.status === 'refreshed' ? 'refreshed' : 'skipped']++
        } catch (e) {
          counts.failed++
          console.error('[cron-refresh]', id, e.message)
        }
        done++
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker))
    const report = { ...counts, due: queue.length, remaining: queue.length - done }
    console.log('[cron-refresh]', JSON.stringify(report))
    res.status(200).json(report)
  }
}
