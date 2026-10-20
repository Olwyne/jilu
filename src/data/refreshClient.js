// Appel de la fonction serveur de rafraîchissement du catalogue partagé (api/refresh-work).
// Le serveur ne rappelle les API (TMDB, AniList, MangaDex…) que si la fiche est périmée : plusieurs
// utilisateurs qui cliquent en même temps déclenchent UN seul appel.
import { auth } from '../firebase'

export const REFRESHABLE_SOURCES = ['tmdb', 'anilist', 'anilist-manga', 'spotify']
export const MANUAL_REFRESH_MIN_AGE_MS = 6 * 60 * 60 * 1000
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
