// Cœur du rafraîchissement d'une fiche du catalogue partagé (testable : tout est injecté).
//
//  - une fiche rafraîchie depuis moins de MIN_AGE_MS n'est jamais re-demandée aux API (même si 10 personnes cliquent)
//  - un verrou (lease) évite que deux requêtes simultanées appellent les API pour la même fiche
//  - un résultat vide ne remplace jamais une fiche existante (une panne d'API ne doit pas abîmer le catalogue de tous)
import { clean, totalEpisodes } from '../../src/lib/catalogUtils.js'
import { DETAIL_FETCHERS } from '../../src/catalog/refresh.js'

export const MIN_AGE_MS = 6 * 60 * 60 * 1000
export const LEASE_MS = 2 * 60 * 1000
const USER_FIELDS = ['status', 'added', 'finishedAt', 'refreshedAt', 'leaseUntil']

export class RefreshError extends Error {
  constructor(code) {
    super(code)
    this.code = code
  }
}

export async function refreshCatalogWork({ store, fetchFresh, id, now = Date.now() }) {
  const current = await store.get(id)
  if (!current) return { status: 'not_found' }
  if (current.sourceId == null || !current.source || !DETAIL_FETCHERS[current.source]) return { status: 'unsupported' }
  if (current.refreshedAt && now - current.refreshedAt < MIN_AGE_MS) return { status: 'fresh', refreshedAt: current.refreshedAt }

  const lease = await store.acquireLease(id, now, LEASE_MS, MIN_AGE_MS)
  if (!lease.ok) return { status: lease.reason, refreshedAt: lease.refreshedAt }

  try {
    const fresh = await fetchFresh(lease.doc)
    const next = clean(Object.fromEntries(Object.entries(fresh).filter(([k]) => !USER_FIELDS.includes(k))))
    if (!next.title) throw new RefreshError('empty_title')
    if (totalEpisodes(lease.doc) > 0 && totalEpisodes(next) === 0) throw new RefreshError('empty_result')
    await store.save(id, { ...next, id: lease.doc.id ?? id, refreshedAt: now, updatedAt: now })
    return { status: 'refreshed', refreshedAt: now }
  } catch (e) {
    await store.releaseLease(id)
    throw e
  }
}
