// Petit cache clé/valeur sur IndexedDB (repli en mémoire si indisponible : navigation privée, tests, etc.)
// Sert à ne pas relire à chaque ouverture ce qui n'a pas changé (bibliothèque de l'utilisateur, fiches du catalogue).
const STORE = 'kv'

function openDB(name) {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

const wrap = (req) => new Promise((resolve, reject) => { req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error) })

function memoryCache() {
  const m = new Map()
  return {
    persistent: false,
    get: async (k) => m.get(k),
    set: async (k, v) => { m.set(k, v) },
    setMany: async (entries) => { entries.forEach(([k, v]) => m.set(k, v)) },
    delete: async (k) => { m.delete(k) },
    deleteMany: async (keys) => { keys.forEach((k) => m.delete(k)) },
    entries: async (prefix) => [...m.entries()].filter(([k]) => k.startsWith(prefix)),
    clear: async (prefix = '') => { for (const k of [...m.keys()]) if (k.startsWith(prefix)) m.delete(k) },
  }
}

export async function createCache(name = 'jilu-cache') {
  if (typeof indexedDB === 'undefined') return memoryCache()
  let db
  try { db = await openDB(name) } catch { return memoryCache() }
  const tx = (mode) => db.transaction(STORE, mode).objectStore(STORE)
  const done = (t) => new Promise((resolve, reject) => { t.oncomplete = () => resolve(); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error) })

  return {
    persistent: true,
    get: (k) => wrap(tx('readonly').get(k)),
    set: (k, v) => wrap(tx('readwrite').put(v, k)),
    async setMany(entries) {
      const t = db.transaction(STORE, 'readwrite')
      entries.forEach(([k, v]) => t.objectStore(STORE).put(v, k))
      await done(t)
    },
    delete: (k) => wrap(tx('readwrite').delete(k)),
    async deleteMany(keys) {
      const t = db.transaction(STORE, 'readwrite')
      keys.forEach((k) => t.objectStore(STORE).delete(k))
      await done(t)
    },
    async entries(prefix) {
      const range = IDBKeyRange.bound(prefix, prefix + '￿')
      const store = tx('readonly')
      const [keys, values] = await Promise.all([wrap(store.getAllKeys(range)), wrap(store.getAll(range))])
      return keys.map((k, i) => [k, values[i]])
    },
    async clear(prefix = '') {
      const range = IDBKeyRange.bound(prefix, prefix + '￿')
      await wrap(tx('readwrite').delete(range))
    },
  }
}
