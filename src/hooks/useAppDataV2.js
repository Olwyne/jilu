// Lecture/écriture du modèle v2 (catalogue partagé + une fiche de bibliothèque par œuvre).
// Expose la MÊME interface que useAppData : les écrans ne changent pas.
//  - lecture : cache local + synchronisation par delta (src/data/library.js), catalogue chargé à la demande
//  - écriture : dans le modèle v2 ET dans l'ancien (double écriture) pour pouvoir revenir en arrière
import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import { EMPTY_DATA } from './useAppData'
import { createCache } from '../data/cache.js'
import { syncLibrary, clearLibraryCache } from '../data/library.js'
import { loadCatalog } from '../data/catalog.js'
import { assembleData, catalogIdsNeededAtStartup } from '../data/assemble.js'
import { planV2Writes, applyPlanToLibrary, commitPlan, isEmptyPlan } from '../data/writeV2.js'
import { writeV1, syncAllV1 } from '../data/writeV1.js'

const CACHE_NAME = 'jilu-v2'
const DAY = 24 * 60 * 60 * 1000
const MONTH = 30 * DAY
const RESYNC_AFTER_MS = 2 * 60 * 1000
const FROM_LIBRARY = ['works', 'watched', 'ratings', 'favorites', 'games', 'reviews']

export async function clearV2Caches(uid) {
  const cache = await createCache(CACHE_NAME)
  await clearLibraryCache(cache, uid)
}

export function useAppDataV2(user) {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const st = useRef({ cache: null, library: {}, catalog: {}, main: {}, loaded: { main: false, library: false }, lastSync: 0 })
  const uid = user?.uid

  function rebuild() {
    const s = st.current
    if (!s.loaded.main || !s.loaded.library) return
    const assembled = assembleData({ library: s.library, catalog: s.catalog })
    const main = Object.fromEntries(Object.entries(s.main).filter(([k]) => !FROM_LIBRARY.includes(k)))
    setData({ ...EMPTY_DATA, ...main, ...assembled })
    setLoading(false)
  }

  useEffect(() => {
    if (!uid) return
    const s = st.current
    let cancelled = false
    s.loaded = { main: false, library: false }

    const unsubMain = onSnapshot(
      doc(db, 'users', uid),
      (snap) => { s.main = snap.exists() ? snap.data() : {}; s.loaded.main = true; rebuild() },
      (err) => { setError(err); setLoading(false) },
    )

    async function startupCatalog(library, maxAgeMs) {
      const ids = catalogIdsNeededAtStartup(library)
      const { catalog } = await loadCatalog(db, ids, s.cache, { maxAgeMs })
      s.catalog = { ...s.catalog, ...catalog }
    }

    ;(async () => {
      try {
        s.cache = await createCache(CACHE_NAME)
        const { library } = await syncLibrary(db, uid, s.cache)
        if (cancelled) return
        s.library = library
        await startupCatalog(library, DAY) // œuvres en cours / à voir : calendrier et « à rattraper », fraîcheur 24 h
        if (cancelled) return
        s.loaded.library = true
        s.lastSync = Date.now()
        rebuild()
      } catch (e) {
        console.error('[v2] chargement', e)
        setError(e)
        setLoading(false)
      }
    })()

    // Autre appareil : au retour sur l'application, on récupère seulement ce qui a changé
    async function resync() {
      s.lastSync = Date.now()
      try {
        const { library } = await syncLibrary(db, uid, s.cache)
        s.library = library
        await startupCatalog(library, DAY)
        rebuild()
      } catch (e) { console.error('[v2] resynchronisation', e) }
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible' && s.cache && Date.now() - s.lastSync > RESYNC_AFTER_MS) resync()
    }
    document.addEventListener('visibilitychange', onVisible)

    return () => {
      cancelled = true
      unsubMain()
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [uid])

  // --- Catalogue à la demande (épisodes d'une fiche, statistiques…) ---
  async function ensureCatalog(catalogIds) {
    const s = st.current
    if (!s.cache) return
    const missing = [...new Set(catalogIds)].filter((id) => id && !s.catalog[id])
    if (!missing.length) return
    const { catalog } = await loadCatalog(db, missing, s.cache, { maxAgeMs: MONTH })
    if (Object.keys(catalog).length) {
      s.catalog = { ...s.catalog, ...catalog }
      rebuild()
    }
  }
  const libraryDocs = () => Object.values(st.current.library).filter((l) => l && !l.deleted && !l.orphanProgress && l.catalogId)
  const ensureAllCatalog = () => ensureCatalog(libraryDocs().map((l) => l.catalogId))
  const ensureProgressCatalog = () => ensureCatalog(libraryDocs().filter((l) => l.watchedCount > 0 && l.status !== 'termine').map((l) => l.catalogId))
  const ensureWorkCatalog = (workId) => ensureCatalog([st.current.library[workId]?.catalogId])

  // --- Écriture : v1 + v2 ---
  async function mutate(patch) {
    const prev = dataRef.current
    setData({ ...prev, ...patch })
    if (!user) return
    const s = st.current
    const plan = planV2Writes({ uid, prev, patch })
    if (Object.keys(plan.catalogCreates).length) s.catalog = { ...s.catalog, ...plan.catalogCreates } // épisodes dispo immédiatement
    try {
      await writeV1(db, uid, prev, patch)
      if (!isEmptyPlan(plan)) await commitPlan(db, uid, plan)
      s.library = applyPlanToLibrary(s.library, plan)
      if (s.cache && !isEmptyPlan(plan)) {
        const touched = [...Object.keys(plan.libraryCreates), ...Object.keys(plan.patches)]
        await s.cache.setMany(touched.map((id) => [`lib:${uid}:${id}`, s.library[id]]))
        await s.cache.deleteMany(plan.removes.map((id) => `lib:${uid}:${id}`))
      }
    } catch (e) {
      setError(e)
      throw e
    }
  }

  async function syncAll() {
    if (!user) return
    await syncAllV1(db, uid, dataRef.current)
  }

  return { data, loading, mutate, syncAll, error, ensureCatalog, ensureAllCatalog, ensureProgressCatalog, ensureWorkCatalog }
}
