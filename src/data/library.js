// Synchronisation « par delta » de la bibliothèque v2 : au démarrage, on part du cache local (0 lecture)
// et on ne lit sur le serveur que les documents modifiés depuis la dernière synchronisation.
import { collection, getDocs, orderBy, query, where } from 'firebase/firestore'

// Les horloges des appareils diffèrent un peu : on relit une petite fenêtre de recouvrement.
export const OVERLAP_MS = 10 * 60 * 1000
// Filet de sécurité (horloge très décalée, document manqué) : relecture complète une fois par semaine.
export const FULL_RESYNC_MS = 7 * 24 * 60 * 60 * 1000

const docKey = (uid, id) => `lib:${uid}:${id}`
const metaKey = (uid) => `libmeta:${uid}`

export async function syncLibrary(db, uid, cache, { now = Date.now() } = {}) {
  const meta = (await cache.get(metaKey(uid))) || { lastSync: 0, fullSyncAt: 0 }
  const full = now - meta.fullSyncAt > FULL_RESYNC_MS
  const since = full ? 0 : meta.lastSync

  const snap = await getDocs(query(
    collection(db, 'users', uid, 'library'),
    where('updatedAt', '>', since),
    orderBy('updatedAt'),
  ))

  const upserts = []
  const removals = []
  let maxUpdated = 0
  snap.forEach((d) => {
    const data = d.data()
    maxUpdated = Math.max(maxUpdated, data.updatedAt || 0)
    if (data.deleted) removals.push(docKey(uid, d.id))
    else upserts.push([docKey(uid, d.id), { ...data, id: d.id }])
  })

  const prefix = `lib:${uid}:`
  if (full) await cache.clear(prefix) // relecture complète : repartir d'un cache propre (retire aussi les fantômes)
  if (upserts.length) await cache.setMany(upserts)
  if (removals.length) await cache.deleteMany(removals)
  // Si l'horloge de cet appareil retarde sur celle d'un document, on s'aligne sur le document.
  await cache.set(metaKey(uid), {
    lastSync: Math.max(now, maxUpdated) - OVERLAP_MS,
    fullSyncAt: full ? now : meta.fullSyncAt,
  })

  const library = Object.fromEntries((await cache.entries(prefix)).map(([k, v]) => [k.slice(prefix.length), v]))
  return { library, fetched: snap.size, full }
}

// À la déconnexion : la bibliothèque est privée, on ne la laisse pas sur l'appareil.
export async function clearLibraryCache(cache, uid) {
  await cache.clear(`lib:${uid}:`)
  await cache.delete(metaKey(uid))
}
