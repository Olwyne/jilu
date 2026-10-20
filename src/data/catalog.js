// Chargement des fiches du catalogue partagé, avec cache local : une fiche déjà connue n'est pas relue
// tant qu'elle n'est pas périmée. Les lectures serveur ne portent que sur les fiches manquantes.
import { collection, documentId, getDocs, query, where } from 'firebase/firestore'

export const CATALOG_MAX_AGE_MS = 24 * 60 * 60 * 1000
const IN_LIMIT = 30
const key = (id) => `cat:${id}`

// ids : ids de catalogue à charger · force : ids à relire même si le cache est récent
export async function loadCatalog(db, ids, cache, { now = Date.now(), maxAgeMs = CATALOG_MAX_AGE_MS, force = [] } = {}) {
  const unique = [...new Set(ids)]
  const forced = new Set(force)
  const result = {}
  const toFetch = []

  for (const id of unique) {
    const entry = await cache.get(key(id))
    if (entry?.doc) result[id] = entry.doc
    const fresh = entry && now - entry.at < maxAgeMs
    if (!fresh || forced.has(id)) toFetch.push(id)
  }

  let fetched = 0
  for (let i = 0; i < toFetch.length; i += IN_LIMIT) {
    const chunk = toFetch.slice(i, i + IN_LIMIT)
    const snap = await getDocs(query(collection(db, 'catalog'), where(documentId(), 'in', chunk)))
    fetched += snap.size
    const found = new Set()
    const entries = []
    snap.forEach((d) => {
      found.add(d.id)
      result[d.id] = d.data()
      entries.push([key(d.id), { doc: d.data(), at: now }])
    })
    // fiche absente du serveur : on le mémorise aussi (évite de la redemander à chaque ouverture)
    chunk.filter((id) => !found.has(id)).forEach((id) => entries.push([key(id), { doc: result[id] ?? null, at: now }]))
    await cache.setMany(entries)
  }
  return { catalog: result, fetched }
}
