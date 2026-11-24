// Appelle api/refresh-work : le serveur ne rappelle les API (TMDB, AniList, MangaDex…) que si la fiche est périmée, donc un seul appel même si plusieurs utilisateurs cliquent.
import { auth } from '../firebase'

export const REFRESHABLE_SOURCES = ['tmdb', 'anilist', 'anilist-manga', 'spotify', 'googlebooks', 'openlibrary', 'igdb']
const MANUAL_REFRESH_MIN_AGE_MS = 6 * 60 * 60 * 1000
export const AUTO_REFRESH_MIN_AGE_MS = 24 * 60 * 60 * 1000

export async function requestCatalogRefresh(catalogId, { minAgeMs = MANUAL_REFRESH_MIN_AGE_MS, fetchImpl = (...a) => fetch(...a), getToken = () => auth.currentUser?.getIdToken() } = {}) {
  const token = await getToken()
  if (!token) throw new Error('not signed in')
  const res = await fetchImpl('/api/refresh-work', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ id: catalogId, minAgeMs }),
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok && res.status !== 202) throw new Error(body.error || `refresh failed (${res.status})`)
  return body
}

// Fiches du catalogue partagé : seul le serveur les crée, depuis la source (api/catalog-ensure).
// Retourne { id: 'created' | 'exists' | 'not_found' | 'unsupported' | 'failed' | 'pending' }
export const ENSURE_CHUNK = 20
export async function requestCatalogCreation(ids, { onProgress, fetchImpl = (...a) => fetch(...a), getToken = () => auth.currentUser?.getIdToken() } = {}) {
  const token = await getToken()
  if (!token) throw new Error('not signed in')
  const results = {}
  const queue = [...ids]
  while (queue.length) {
    const chunk = queue.splice(0, ENSURE_CHUNK)
    onProgress?.(ids.length - queue.length - chunk.length, ids.length)
    // Un paquet en erreur (504, réseau) ne fait pas échouer les autres : ses fiches sont « failed »
    const got = await fetchImpl('/api/catalog-ensure', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: chunk }),
    }).then((res) => (res.ok ? res.json() : {})).then((body) => body.results || {}).catch(() => ({}))
    for (const id of chunk) results[id] = got[id] || 'failed'
    // « pending » : le serveur a manqué de temps. On redemande, tant que le paquet a avancé (sinon boucle sans fin).
    const pending = chunk.filter((id) => results[id] === 'pending')
    if (pending.length < chunk.length) queue.unshift(...pending)
  }
  return results
}
