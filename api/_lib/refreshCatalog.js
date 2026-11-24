// Rafraîchissement d'une fiche partagée (tout est injecté, donc testable). Une fiche récente n'est jamais redemandée aux API, un verrou (lease)
// évite les appels simultanés, et un résultat vide ne remplace jamais une fiche existante (une panne d'API ne doit pas abîmer le catalogue de tous).
import { clean, totalEpisodes } from '../../src/lib/catalogUtils.js'
import { canFetchWork } from '../../src/catalog/fetchWork.js'

export const MIN_AGE_MS = 6 * 60 * 60 * 1000
export const MAX_REQUESTED_AGE_MS = 7 * 24 * 60 * 60 * 1000
export const LEASE_MS = 2 * 60 * 1000
const USER_FIELDS = ['status', 'added', 'finishedAt', 'refreshedAt', 'leaseUntil']

export class RefreshError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

// minAgeMs : l'appelant peut demander une fraîcheur plus exigeante que le plancher (ex. rafraîchissement automatique : 24 h),
// jamais moins que MIN_AGE_MS : le serveur reste maître de la protection des quotas.
export async function refreshCatalogWork({ store, fetchFresh, id, now = Date.now(), minAgeMs = MIN_AGE_MS }) {
  const minAge = Math.min(MAX_REQUESTED_AGE_MS, Math.max(MIN_AGE_MS, Number(minAgeMs) || MIN_AGE_MS))
  const current = await store.get(id)
  if (!current) return { status: 'not_found' }
  if (!canFetchWork(id)) return { status: 'unsupported' }
  if (current.refreshedAt && now - current.refreshedAt < minAge) return { status: 'fresh', refreshedAt: current.refreshedAt }

  const lease = await store.acquireLease(id, now, LEASE_MS, minAge)
  if (!lease.ok) return { status: lease.reason, refreshedAt: lease.refreshedAt }

  try {
    // La fiche est entièrement reconstruite depuis la source : rien de l'ancienne version n'est recopié
    const fresh = await fetchFresh(id)
    if (!fresh) throw new RefreshError('not_found_upstream')
    const next = clean(Object.fromEntries(Object.entries(fresh).filter(([k]) => !USER_FIELDS.includes(k))))
    if (!next.title) throw new RefreshError('empty_title')
    if (totalEpisodes(lease.doc) > 0 && totalEpisodes(next) === 0) throw new RefreshError('empty_result')
    await store.save(id, { ...next, id, refreshedAt: now, updatedAt: now })
    return { status: 'refreshed', refreshedAt: now }
  } catch (e) {
    await store.releaseLease(id)
    throw e
  }
}
