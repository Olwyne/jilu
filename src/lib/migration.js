// Migration v1 -> v2 (voir docs/superpowers/specs/2026-10-20-data-model-v2.md)
//
//   v1 : users/{uid}/works/{id} (copie complète) + users/{uid}/watched/{id} + ratings/favorites/games dans users/{uid}
//   v2 : catalog/{catalogId} (partagé) + users/{uid}/library/{id} (un document par œuvre)
//
// La migration COPIE uniquement : elle n'écrit jamais dans l'ancien modèle et ne supprime rien.
// Elle est idempotente : relancée, elle ignore ce qui existe déjà.
// Code temporaire : à retirer quand tous les comptes sont migrés et le nouveau modèle validé.
import {
  collection, collectionGroup, doc, documentId, getDoc, getDocs, query, where, writeBatch,
} from 'firebase/firestore'

export const MIGRATION_VERSION = 1
const USER_FIELDS = ['status', 'added', 'finishedAt', 'refreshedAt'] // propres à l'utilisateur : hors catalogue
const BATCH_SIZE = 400
const IN_LIMIT = 30

// --- Partie pure ------------------------------------------------------------

// Firestore refuse `undefined` ; on retire les clés vides et remplace les trous de tableau par null.
export function clean(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(clean)
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, clean(x)]))
}

export function totalEpisodes(work) {
  return (work?.seasons || []).reduce((n, s) => n + (s.episodes?.length || 0), 0)
}

// Une œuvre sans sourceId (import sans correspondance) n'entre pas dans le catalogue partagé :
// elle est issue de l'historique de l'utilisateur, pas d'une source fiable.
export function catalogIdFor(uid, work) {
  return work.source && work.sourceId != null ? work.id : `local-${uid}-${work.id}`
}

// Entre deux versions de la même fiche, garder la plus complète (plus d'épisodes) ; à égalité, la première.
export function pickBestCatalog(a, b) {
  if (!a) return b
  if (!b) return a
  return totalEpisodes(b) > totalEpisodes(a) ? b : a
}

const countTruthy = (eps) => Object.values(eps || {}).filter(Boolean).length

// Rattache chaque clé de note ("w:ID", "s:ID-1", "e:ID-1-2") à l'œuvre dont l'id est le plus long préfixe.
function assignRatings(ratings, workIds) {
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

// works : { id: workDoc } · watchedDocs : { id: epsMap } · main : document users/{uid} (ou {})
export function buildUserMigration({ uid, works = {}, watchedDocs = {}, main = {}, now = Date.now() }) {
  const workIds = Object.keys(works)
  const { byWork: ratingsByWork, unassigned } = assignRatings(main.ratings, workIds)
  const reviewByWork = Object.fromEntries((main.reviews || []).map((r) => [r.id, r]))
  const catalog = {}
  const library = {}
  let localWorks = 0

  for (const id of workIds) {
    const w = { ...works[id], id: works[id].id ?? id }
    const catalogId = catalogIdFor(uid, w)
    if (catalogId !== w.id) localWorks++
    const catalogDoc = Object.fromEntries(Object.entries(w).filter(([k]) => !USER_FIELDS.includes(k)))
    catalog[catalogId] = clean({ ...catalogDoc, updatedAt: now })

    const eps = watchedDocs[id] || {}
    library[id] = clean({
      id,
      catalogId,
      // résumé pour afficher la liste sans lire le catalogue
      title: w.title, titles: w.titles, poster: w.poster, posters: w.posters,
      category: w.category, genre: w.genre, year: w.year, originalTitle: w.originalTitle,
      // données propres à l'utilisateur
      status: w.status, added: w.added, finishedAt: w.finishedAt,
      ratings: ratingsByWork[id],
      favorite: main.favorites?.[id] ? true : undefined,
      game: main.games?.[id],
      personalReview: reviewByWork[id],
      eps,
      watchedCount: countTruthy(eps),
      migration: { version: MIGRATION_VERSION, at: now },
      updatedAt: now,
    })
  }

  // Progression dont l'œuvre n'existe plus : on la conserve sans rien inventer
  let orphanProgress = 0
  for (const [id, eps] of Object.entries(watchedDocs)) {
    if (works[id]) continue
    orphanProgress++
    library[id] = clean({
      id, catalogId: null, title: id, orphanProgress: true,
      ratings: ratingsByWork[id], eps, watchedCount: countTruthy(eps),
      migration: { version: MIGRATION_VERSION, at: now }, updatedAt: now,
    })
  }

  const report = {
    works: workIds.length,
    library: Object.keys(library).length,
    catalog: Object.keys(catalog).length,
    localWorks,
    orphanProgress,
    episodesWatched: Object.values(library).reduce((n, l) => n + (l.watchedCount || 0), 0),
    unassignedRatings: unassigned,
  }
  return { catalog, library, report }
}

// Compare l'ancien modèle et la bibliothèque v2 d'un utilisateur : rien ne doit manquer ni différer.
export function verifyUserMigration({ works = {}, watchedDocs = {} }, libraryDocs = {}) {
  const missing = []
  const mismatched = []
  const ids = new Set([...Object.keys(works), ...Object.keys(watchedDocs)])
  for (const id of ids) {
    const lib = libraryDocs[id]
    if (!lib) { missing.push(id); continue }
    const eps = watchedDocs[id] || {}
    const sameEps = Object.keys(eps).length === Object.keys(lib.eps || {}).length
      && Object.entries(eps).every(([k, v]) => (lib.eps || {})[k] === v)
    const sameStatus = !works[id] || (works[id].status ?? null) === (lib.status ?? null)
    if (!sameEps || !sameStatus) mismatched.push(id)
  }
  return { ok: !missing.length && !mismatched.length, missing, mismatched, checked: ids.size }
}

// --- Lecture / écriture Firestore -------------------------------------------

async function idsThatExist(colRef, ids) {
  const found = new Set()
  for (let i = 0; i < ids.length; i += IN_LIMIT) {
    const snap = await getDocs(query(colRef, where(documentId(), 'in', ids.slice(i, i + IN_LIMIT))))
    snap.forEach((d) => found.add(d.id))
  }
  return found
}

export async function readUserV1(db, uid) {
  const [mainSnap, worksSnap, watchedSnap] = await Promise.all([
    getDoc(doc(db, 'users', uid)),
    getDocs(collection(db, 'users', uid, 'works')),
    getDocs(collection(db, 'users', uid, 'watched')),
  ])
  const works = {}
  worksSnap.forEach((d) => { works[d.id] = d.data() })
  const watchedDocs = {}
  watchedSnap.forEach((d) => { watchedDocs[d.id] = d.data().eps || {} })
  return { uid, main: mainSnap.exists() ? mainSnap.data() : {}, works, watchedDocs }
}

async function commitInBatches(db, ops, onProgress, label) {
  for (let i = 0; i < ops.length; i += BATCH_SIZE) {
    const batch = writeBatch(db)
    ops.slice(i, i + BATCH_SIZE).forEach((op) => op(batch))
    await batch.commit()
    onProgress?.(`${label} ${Math.min(i + BATCH_SIZE, ops.length)}/${ops.length}`)
  }
}

async function readLibrary(db, uid) {
  const snap = await getDocs(collection(db, 'users', uid, 'library'))
  const out = {}
  snap.forEach((d) => { out[d.id] = d.data() })
  return out
}

async function writeUser(db, uid, built, { skipCatalog, skipLibrary, onProgress }) {
  const catalogOps = Object.entries(built.catalog)
    .filter(([id]) => !skipCatalog.has(id))
    .map(([id, data]) => (b) => b.set(doc(db, 'catalog', id), data))
  const libraryOps = Object.entries(built.library)
    .filter(([id]) => !skipLibrary.has(id))
    .map(([id, data]) => (b) => b.set(doc(db, 'users', uid, 'library', id), data))
  await commitInBatches(db, catalogOps, onProgress, 'Catalogue')
  await commitInBatches(db, libraryOps, onProgress, 'Bibliothèque')
  return { catalogWritten: catalogOps.length, libraryWritten: libraryOps.length }
}

async function writeMarker(db, uid, report, verification) {
  await writeBatch(db)
    .set(doc(db, 'users', uid, 'migrations', 'v2'), clean({ version: MIGRATION_VERSION, at: Date.now(), report, ok: verification.ok, missing: verification.missing, mismatched: verification.mismatched }))
    .commit()
}

// Migre le compte `uid` (le propriétaire : utilisable avec les règles normales).
export async function migrateAccount(db, uid, { onProgress, onBackup } = {}) {
  onProgress?.('Lecture des données…')
  const v1 = await readUserV1(db, uid)
  onBackup?.({ [uid]: v1 })
  const built = buildUserMigration(v1)

  onProgress?.('Vérification de l’existant…')
  const skipCatalog = await idsThatExist(collection(db, 'catalog'), Object.keys(built.catalog))
  const skipLibrary = await idsThatExist(collection(db, 'users', uid, 'library'), Object.keys(built.library))
  const written = await writeUser(db, uid, built, { skipCatalog, skipLibrary, onProgress })

  onProgress?.('Contrôle…')
  const verification = verifyUserMigration(v1, await readLibrary(db, uid))
  await writeMarker(db, uid, built.report, verification)
  return { report: built.report, written, verification }
}

// Migre tous les comptes (réservé à l'administrateur désigné dans les règles).
export async function migrateAllAccounts(db, { onProgress, onBackup } = {}) {
  onProgress?.('Lecture de tous les comptes…')
  const [worksSnap, watchedSnap, usersSnap] = await Promise.all([
    getDocs(collectionGroup(db, 'works')),
    getDocs(collectionGroup(db, 'watched')),
    getDocs(collection(db, 'users')),
  ])
  const byUser = {}
  const slot = (uid) => (byUser[uid] ||= { uid, main: {}, works: {}, watchedDocs: {} })
  usersSnap.forEach((d) => { slot(d.id).main = d.data() })
  worksSnap.forEach((d) => { slot(d.ref.parent.parent.id).works[d.id] = d.data() })
  watchedSnap.forEach((d) => { slot(d.ref.parent.parent.id).watchedDocs[d.id] = d.data().eps || {} })
  onBackup?.(byUser)

  const uids = Object.keys(byUser)
  const built = {}
  let bestCatalog = {}
  for (const uid of uids) {
    built[uid] = buildUserMigration(byUser[uid])
    for (const [id, data] of Object.entries(built[uid].catalog)) bestCatalog[id] = pickBestCatalog(bestCatalog[id], data)
  }

  onProgress?.('Vérification du catalogue existant…')
  const skipCatalog = await idsThatExist(collection(db, 'catalog'), Object.keys(bestCatalog))
  const catalogOps = Object.entries(bestCatalog)
    .filter(([id]) => !skipCatalog.has(id))
    .map(([id, data]) => (b) => b.set(doc(db, 'catalog', id), data))
  await commitInBatches(db, catalogOps, onProgress, 'Catalogue')

  const results = {}
  for (const uid of uids) {
    onProgress?.(`Compte ${Object.keys(results).length + 1}/${uids.length}…`)
    const skipLibrary = await idsThatExist(collection(db, 'users', uid, 'library'), Object.keys(built[uid].library))
    const written = await writeUser(db, uid, { catalog: {}, library: built[uid].library }, { skipCatalog: new Set(), skipLibrary, onProgress })
    const verification = verifyUserMigration(byUser[uid], await readLibrary(db, uid))
    await writeMarker(db, uid, built[uid].report, verification)
    results[uid] = { report: built[uid].report, written, verification }
  }
  return { accounts: uids.length, catalogWritten: catalogOps.length, results }
}
