// Écriture dans l'ancien modèle (v1) : users/{uid}/works, users/{uid}/watched et le document users/{uid}.
// Conservé pendant la transition : en mode v2, toute modification est écrite dans les DEUX modèles
// pour pouvoir revenir en arrière sans perte.
import { doc, writeBatch } from 'firebase/firestore'

export function sanitize(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(sanitize)
  return Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined).map(([k, val]) => [k, sanitize(val)]))
}

export function groupWatched(flat) {
  const byWork = {}
  for (const key of Object.keys(flat)) {
    const parts = key.split('-')
    const eNum = parts.pop()
    const sNum = parts.pop()
    const workId = parts.join('-')
    if (!byWork[workId]) byWork[workId] = {}
    byWork[workId][`${sNum}-${eNum}`] = flat[key]
  }
  return byWork
}

export async function batchWrite(db, ops) {
  for (let i = 0; i < ops.length; i += 499) {
    const b = writeBatch(db)
    ops.slice(i, i + 499).forEach((fn) => fn(b))
    await b.commit()
  }
}

// prev : données actuelles · patch : ce que mutate() reçoit
export async function writeV1(db, uid, prev, patch) {
  const userRef = doc(db, 'users', uid)
  const ops = []
  const { works, watched, ...mainPatch } = patch

  if (works !== undefined) {
    const current = prev.works || {}
    const nextWorks = works || {}
    Object.keys(current).forEach((id) => {
      if (!nextWorks[id]) ops.push((b) => b.delete(doc(db, 'users', uid, 'works', id)))
    })
    Object.entries(nextWorks).forEach(([id, work]) => {
      if (JSON.stringify(current[id]) !== JSON.stringify(work)) {
        ops.push((b) => b.set(doc(db, 'users', uid, 'works', id), sanitize(work)))
      }
    })
  }

  if (watched !== undefined) {
    const currentByWork = groupWatched(prev.watched || {})
    const nextByWork = groupWatched(watched || {})
    const allIds = new Set([...Object.keys(currentByWork), ...Object.keys(nextByWork)])
    allIds.forEach((workId) => {
      const cur = currentByWork[workId]
      const nxt = nextByWork[workId]
      if (!nxt) {
        ops.push((b) => b.delete(doc(db, 'users', uid, 'watched', workId)))
      } else if (JSON.stringify(cur) !== JSON.stringify(nxt)) {
        ops.push((b) => b.set(doc(db, 'users', uid, 'watched', workId), { eps: sanitize(nxt) }))
      }
    })
  }

  if (Object.keys(mainPatch).length > 0) {
    ops.push((b) => b.set(userRef, sanitize(mainPatch), { merge: true }))
  }

  if (ops.length > 0) await batchWrite(db, ops)
}

// Réécrit tout l'état courant (bouton « synchroniser » du compte)
export async function syncAllV1(db, uid, d) {
  const userRef = doc(db, 'users', uid)
  const ops = []

  ops.push((b) => b.set(userRef, sanitize({
    ratings: d.ratings, reviews: d.reviews, settings: d.settings,
    profile: d.profile, feed: d.feed, games: d.games, favorites: d.favorites, ccLikes: d.ccLikes,
  }), { merge: true }))

  Object.entries(d.works || {}).forEach(([id, work]) => {
    ops.push((b) => b.set(doc(db, 'users', uid, 'works', id), sanitize(work)))
  })

  const byWork = groupWatched(d.watched || {})
  Object.entries(byWork).forEach(([workId, eps]) => {
    ops.push((b) => b.set(doc(db, 'users', uid, 'watched', workId), { eps: sanitize(eps) }))
  })

  await batchWrite(db, ops)
}
