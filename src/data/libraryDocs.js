// Construction des documents v2 d'une œuvre ajoutée : fiche du catalogue partagé `catalog/{catalogId}`
// + fiche de bibliothèque `users/{uid}/library/{id}`. Fonctions pures, sauf idsThatExist.
import { documentId, getDocs, query, where } from 'firebase/firestore'
import { clean } from '../lib/catalogUtils.js'

const USER_FIELDS = ['status', 'added', 'finishedAt', 'refreshedAt'] // propres à l'utilisateur : hors catalogue
const IN_LIMIT = 30

// Une œuvre sans sourceId (import sans correspondance) n'entre pas dans le catalogue partagé :
// elle est issue de l'historique de l'utilisateur, pas d'une source fiable.
export function catalogIdFor(uid, work) {
  return work.source && work.sourceId != null ? work.id : `local-${uid}-${work.id}`
}

// Fiche de catalogue d'une œuvre : tout sauf les champs propres à l'utilisateur.
export function catalogDocFrom(work, now = Date.now()) {
  return clean({ ...Object.fromEntries(Object.entries(work).filter(([k]) => !USER_FIELDS.includes(k))), updatedAt: now })
}

// Résumé affiché dans la liste sans lire le catalogue
function summaryFrom(work) {
  return {
    title: work.title, titles: work.titles, poster: work.poster, posters: work.posters,
    category: work.category, genre: work.genre, year: work.year, originalTitle: work.originalTitle,
  }
}

// Égalité profonde qui accepte Infinity/NaN (JSON.stringify ne les représente pas)
export function deepEqual(a, b) {
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true
  if (!a || !b || typeof a !== 'object' || typeof b !== 'object') return false
  const ka = Object.keys(a).filter((k) => a[k] !== undefined)
  const kb = Object.keys(b).filter((k) => b[k] !== undefined)
  return ka.length === kb.length && ka.every((k) => deepEqual(a[k], b[k]))
}

export const countTruthy = (eps) => Object.values(eps || {}).filter(Boolean).length

// Rattache chaque clé de note ("w:ID", "s:ID-1", "e:ID-1-2") à l'œuvre dont l'id est le plus long préfixe.
export function assignRatings(ratings, workIds) {
  const ids = [...workIds].sort((a, b) => b.length - a.length)
  const byWork = {}
  const unassigned = []
  for (const [key, value] of Object.entries(ratings || {})) {
    const scope = key.slice(0, 1)
    const rest = key.slice(2)
    const id = key[1] === ':' ? ids.find((i) => rest === i || rest.startsWith(i + '-')) : undefined
    if (!id) { unassigned.push(key); continue }
    const sub = rest === id ? '' : rest.slice(id.length + 1)
    ;(byWork[id] ||= {})[sub ? `${scope}:${sub}` : scope] = value
  }
  return { byWork, unassigned }
}

// works : { id: œuvre } · watchedDocs : { id: { 's-e': ts } } · main : notes, favoris, jeux, avis de l'utilisateur
export function buildLibraryDocs({ uid, works = {}, watchedDocs = {}, main = {}, now = Date.now() }) {
  const workIds = Object.keys(works)
  const { byWork: ratingsByWork } = assignRatings(main.ratings, workIds)
  const reviewByWork = Object.fromEntries((main.reviews || []).map((r) => [r.id, r]))
  const catalog = {}
  const library = {}

  for (const id of workIds) {
    const w = { ...works[id], id: works[id].id ?? id }
    const catalogId = catalogIdFor(uid, w)
    catalog[catalogId] = catalogDocFrom(w, now)

    const eps = watchedDocs[id] || {}
    library[id] = clean({
      id,
      catalogId,
      ...summaryFrom(w),
      status: w.status, added: w.added, finishedAt: w.finishedAt,
      ratings: ratingsByWork[id],
      favorite: main.favorites?.[id] ? true : undefined,
      game: main.games?.[id],
      personalReview: reviewByWork[id],
      eps,
      watchedCount: countTruthy(eps),
      updatedAt: now,
    })
  }
  return { catalog, library }
}

export async function idsThatExist(colRef, ids) {
  const found = new Set()
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    const snap = await getDocs(query(colRef, where(documentId(), 'in', ids.slice(i, i + IN_LIMIT))))
    snap.forEach((d) => found.add(d.id))
  }
  return found
}
