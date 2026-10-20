// Écritures dans le modèle v2 : transforme une modification de l'application (le « patch » de mutate)
// en opérations sur les documents de bibliothèque — UNE écriture par document touché, champs ciblés
// (cocher un épisode = 1 écriture de `eps.1-3`, au lieu de réécrire toute la progression).
import { collection, deleteField, doc, writeBatch } from 'firebase/firestore'
import {
  assignRatings, buildUserMigration, countTruthy, deepEqual, idsThatExist,
} from '../lib/migration.js'

export const DELETE = Symbol('delete')
const WORK_USER_FIELDS = ['status', 'added', 'finishedAt']
const SUMMARY_FIELDS = ['title', 'titles', 'poster', 'posters', 'category', 'genre', 'year', 'originalTitle']
const BATCH_SIZE = 400

// "tmdb-tv-1-2-3" -> { workId: 'tmdb-tv-1', sub: '2-3' }
function splitWatchedKey(key) {
  const parts = key.split('-')
  if (parts.length < 3) return null
  const e = parts.pop()
  const s = parts.pop()
  return { workId: parts.join('-'), sub: `${s}-${e}` }
}

const present = (v) => v !== undefined && v !== null

// prev : données actuelles (forme v1) · patch : ce que mutate() reçoit · retourne les opérations à appliquer
export function planV2Writes({ uid, prev, patch, now = Date.now() }) {
  const next = { ...prev, ...patch }
  const patches = {}          // id -> { 'champ' | 'eps.1-3' | 'ratings.w' : valeur | DELETE }
  const removes = new Set()
  const created = {}          // id -> œuvre complète (nouvelle dans la bibliothèque)
  const touch = (id) => (patches[id] ||= {})

  if (patch.works !== undefined) {
    const prevW = prev.works || {}
    const nextW = patch.works || {}
    for (const id of Object.keys(prevW)) if (!nextW[id]) removes.add(id)
    for (const [id, w] of Object.entries(nextW)) {
      if (!prevW[id]) { created[id] = { ...w, id: w.id ?? id }; continue }
      for (const f of WORK_USER_FIELDS) {
        if (!deepEqual(prevW[id][f], w[f])) touch(id)[f] = present(w[f]) ? w[f] : DELETE
      }
      for (const f of SUMMARY_FIELDS) {
        if (!deepEqual(prevW[id][f], w[f])) touch(id)[f] = present(w[f]) ? w[f] : DELETE
      }
    }
  }

  const knownIds = [...new Set([...Object.keys(prev.works || {}), ...Object.keys(next.works || {})])]

  if (patch.watched !== undefined) {
    const prevMap = prev.watched || {}
    const nextMap = patch.watched || {}
    const affected = new Set()
    for (const key of new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])) {
      if (deepEqual(prevMap[key], nextMap[key])) continue
      const k = splitWatchedKey(key)
      if (!k) continue
      affected.add(k.workId)
      touch(k.workId)[`eps.${k.sub}`] = present(nextMap[key]) ? nextMap[key] : DELETE
    }
    const counts = {}
    for (const [key, ts] of Object.entries(nextMap)) {
      const k = splitWatchedKey(key)
      if (k && affected.has(k.workId) && ts) counts[k.workId] = (counts[k.workId] || 0) + 1
    }
    for (const id of affected) touch(id).watchedCount = counts[id] || 0
  }

  if (patch.ratings !== undefined) {
    const prevMap = prev.ratings || {}
    const nextMap = patch.ratings || {}
    for (const key of new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])) {
      if (deepEqual(prevMap[key], nextMap[key])) continue
      const { byWork } = assignRatings({ [key]: nextMap[key] ?? 0 }, knownIds)
      for (const [id, sub] of Object.entries(byWork)) {
        for (const subKey of Object.keys(sub)) touch(id)[`ratings.${subKey}`] = present(nextMap[key]) ? nextMap[key] : DELETE
      }
    }
  }

  if (patch.favorites !== undefined) {
    const prevMap = prev.favorites || {}
    const nextMap = patch.favorites || {}
    for (const id of new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])) {
      if (!!prevMap[id] === !!nextMap[id]) continue
      touch(id).favorite = nextMap[id] ? true : DELETE
    }
  }

  if (patch.games !== undefined) {
    const prevMap = prev.games || {}
    const nextMap = patch.games || {}
    for (const id of new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])) {
      if (deepEqual(prevMap[id], nextMap[id])) continue
      touch(id).game = present(nextMap[id]) ? nextMap[id] : DELETE
    }
  }

  if (patch.reviews !== undefined) {
    const prevMap = Object.fromEntries((prev.reviews || []).map((r) => [r.id, r]))
    const nextMap = Object.fromEntries((patch.reviews || []).map((r) => [r.id, r]))
    for (const id of new Set([...Object.keys(prevMap), ...Object.keys(nextMap)])) {
      if (deepEqual(prevMap[id], nextMap[id])) continue
      touch(id).personalReview = nextMap[id] ?? DELETE
    }
  }

  // Œuvres nouvelles : document complet construit comme à la migration (progression, notes, favoris compris)
  const createdIds = Object.keys(created)
  let libraryCreates = {}
  let catalogCreates = {}
  if (createdIds.length) {
    const watchedDocs = {}
    for (const [key, ts] of Object.entries(next.watched || {})) {
      const k = splitWatchedKey(key)
      if (k && created[k.workId]) (watchedDocs[k.workId] ||= {})[k.sub] = ts
    }
    const built = buildUserMigration({
      uid, works: created, watchedDocs,
      main: { ratings: next.ratings, favorites: next.favorites, games: next.games, reviews: next.reviews },
      now,
    })
    libraryCreates = built.library
    catalogCreates = built.catalog
    for (const id of createdIds) delete patches[id]
  }

  for (const id of removes) delete patches[id]
  for (const id of Object.keys(patches)) patches[id].updatedAt = now
  for (const doc of Object.values(libraryCreates)) doc.updatedAt = now

  return { libraryCreates, catalogCreates, patches, removes: [...removes], now }
}

export const isEmptyPlan = (p) => !Object.keys(p.libraryCreates).length && !Object.keys(p.patches).length && !p.removes.length

// Applique le plan à la copie locale de la bibliothèque { id: libraryDoc }
export function applyPlanToLibrary(library, plan) {
  const out = { ...library }
  for (const [id, d] of Object.entries(plan.libraryCreates)) out[id] = { ...d, id }
  for (const [id, set] of Object.entries(plan.patches)) {
    const d = { ...(out[id] || { id }) }
    for (const [path, value] of Object.entries(set)) {
      const dot = path.indexOf('.')
      if (dot === -1) {
        if (value === DELETE) delete d[path]; else d[path] = value
      } else {
        const head = path.slice(0, dot)
        const tail = path.slice(dot + 1)
        const sub = { ...(d[head] || {}) }
        if (value === DELETE) delete sub[tail]; else sub[tail] = value
        d[head] = sub
      }
    }
    out[id] = d
  }
  for (const id of plan.removes) delete out[id]
  return out
}

// { 'eps.1-3': 5, favorite: DELETE } -> { eps: { '1-3': 5 }, favorite: deleteField() }
export function nestForFirestore(set) {
  const out = {}
  for (const [path, value] of Object.entries(set)) {
    const v = value === DELETE ? deleteField() : value
    const dot = path.indexOf('.')
    if (dot === -1) out[path] = v
    else (out[path.slice(0, dot)] ||= {})[path.slice(dot + 1)] = v
  }
  return out
}

export async function commitPlan(db, uid, plan) {
  // Fiches de catalogue : création seule (les règles interdisent la modification) -> seulement celles qui manquent
  const catalogIds = Object.keys(plan.catalogCreates)
  const existing = catalogIds.length ? await idsThatExist(collection(db, 'catalog'), catalogIds) : new Set()
  const ops = []
  for (const [id, d] of Object.entries(plan.catalogCreates)) {
    if (!existing.has(id)) ops.push((b) => b.set(doc(db, 'catalog', id), d))
  }
  for (const [id, d] of Object.entries(plan.libraryCreates)) ops.push((b) => b.set(doc(db, 'users', uid, 'library', id), d))
  for (const [id, set] of Object.entries(plan.patches)) {
    ops.push((b) => b.set(doc(db, 'users', uid, 'library', id), nestForFirestore(set), { merge: true }))
  }
  for (const id of plan.removes) {
    ops.push((b) => b.set(doc(db, 'users', uid, 'library', id), { deleted: true, updatedAt: plan.now }, { merge: true }))
  }
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    ops.slice(i, i + BATCH_SIZE).forEach((op) => op(batch))
    await batch.commit()
  }
  return { writes: ops.length }
}

export { countTruthy }
