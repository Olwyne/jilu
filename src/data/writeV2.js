// Écritures dans la bibliothèque v2 : UNE écriture par document touché, champs ciblés
// (cocher un épisode = 1 écriture de `eps.1-3`, au lieu de réécrire toute la progression).
import { collection, deleteField, doc, writeBatch } from 'firebase/firestore'
import { buildLibraryDocs, countTruthy, idsThatExist } from './libraryDocs.js'

export const DELETE = Symbol('delete')
const BATCH_SIZE = 400

// Opérations explicites -> plan d'écriture (fonction pure)
//   add : { id: œuvre } · extras : { watchedDocs, main } pour les œuvres ajoutées (import)
//   set : { id: { champ | 'eps.1-3' | 'ratings.w' : valeur | DELETE } } · remove : [id] (suppression douce)
//   library : copie locale actuelle, pour recalculer watchedCount quand des épisodes changent
export function buildPlan({ uid, library = {}, add = {}, extras = {}, set = {}, remove = [], now = Date.now() }) {
  const { library: libraryCreates, catalog: catalogCreates } = buildLibraryDocs({ uid, works: add, ...extras, now })
  const patches = {}
  for (const [id, changes] of Object.entries(set)) {
    if (!Object.keys(changes).length || libraryCreates[id] || remove.includes(id)) continue
    const patch = { ...changes, updatedAt: now }
    const epsKeys = Object.keys(changes).filter((k) => k === 'eps' || k.startsWith('eps.'))
    if (epsKeys.length) {
      const eps = changes.eps === DELETE ? {} : { ...(library[id]?.eps || {}) }
      for (const k of epsKeys) {
        if (k === 'eps') continue
        if (changes[k] === DELETE) delete eps[k.slice(4)]; else eps[k.slice(4)] = changes[k]
      }
      patch.watchedCount = countTruthy(eps)
    }
    patches[id] = patch
  }
  return { libraryCreates, catalogCreates, patches, removes: remove, now }
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

