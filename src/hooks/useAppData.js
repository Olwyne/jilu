// Données de l'application : catalogue partagé + une fiche de bibliothèque par œuvre (modèle v2).
//  - lecture : cache local + synchronisation par delta (src/data/library.js), catalogue chargé à la demande
//  - écriture : une écriture par document touché (src/data/writeV2.js) ; le document utilisateur ne garde que
//    les réglages, le profil, le fil d'activité… (et une copie des avis personnels pour le fil d'amis)
//  - rafraîchissement des fiches : toujours côté serveur (api/refresh-work), jamais par chaque navigateur
import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { createCache } from '../data/cache.js'
import { syncLibrary, clearLibraryCache } from '../data/library.js'
import { loadCatalog } from '../data/catalog.js'
import { assembleData, catalogIdsNeededAtStartup } from '../data/assemble.js'
import { planV2Writes, applyPlanToLibrary, commitPlan, isEmptyPlan } from '../data/writeV2.js'
import { requestCatalogRefresh, REFRESHABLE_SOURCES, AUTO_REFRESH_MIN_AGE_MS } from '../data/refreshClient.js'
import { clean } from '../lib/catalogUtils.js'

export const EMPTY_DATA = {
  works: {}, watched: {}, ratings: {}, reviews: [],
  settings: { startPage: 'library', autoNext: true, spoilerFree: true, notifNewEp: true, notifCalendar: true, notifWeekly: false, publicProfile: false, adult: false, darkMode: true, language: null, goals: {} },
  profile: { name: '', handle: '', email: '', memberSince: '' },
  feed: [], games: {}, ccLikes: {}, favorites: {},
}

const CACHE_NAME = 'jilu-v2'
const DAY = 24 * 60 * 60 * 1000
const MONTH = 30 * DAY
const RESYNC_AFTER_MS = 2 * 60 * 1000
// Une série encore en diffusion peut changer chaque jour ; une œuvre terminée (ou un film) ne bouge pratiquement plus
const catalogTtl = (doc) => (doc?.ended === false ? DAY : MONTH)
// Ces données vivent dans la bibliothèque (une fiche par œuvre), pas dans le document utilisateur
const LIBRARY_KEYS = ['works', 'watched', 'ratings', 'favorites', 'games', 'reviews']
// Avis personnels : aussi recopiés dans le document utilisateur, car le fil d'amis le lit
const MIRRORED_KEYS = ['reviews']
const AUTO_REFRESH_PER_SESSION = 5
const MANUAL_REFRESH_LIMIT = 100

export async function clearLocalCaches(uid) {
  const cache = await createCache(CACHE_NAME)
  await clearLibraryCache(cache, uid)
}

export function useAppData(user) {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data
  const st = useRef({ cache: null, library: {}, catalog: {}, main: {}, loaded: { main: false, library: false }, lastSync: 0 })
  const uid = user?.uid

  function compute() {
    const s = st.current
    const assembled = assembleData({ library: s.library, catalog: s.catalog })
    const main = Object.fromEntries(Object.entries(s.main).filter(([k]) => !LIBRARY_KEYS.includes(k) && k !== 'works' && k !== 'watched'))
    return { ...EMPTY_DATA, ...main, ...assembled }
  }

  function rebuild() {
    const s = st.current
    if (!s.loaded.main || !s.loaded.library) return
    setData(compute())
    setLoading(false)
  }

  async function loadStartupCatalog(library) {
    const s = st.current
    const { catalog } = await loadCatalog(db, catalogIdsNeededAtStartup(library), s.cache, { maxAgeMs: catalogTtl })
    s.catalog = { ...s.catalog, ...catalog }
  }

  useEffect(() => {
    if (!uid) return
    const s = st.current
    let cancelled = false
    s.loaded = { main: false, library: false }

    const userRef = doc(db, 'users', uid)
    const unsubMain = onSnapshot(
      userRef,
      (snap) => {
        const raw = snap.exists() ? snap.data() : {}
        s.main = raw
        if (raw.profile && 'email' in raw.profile) {
          // L'e-mail vit dans Firebase Auth ; le retirer de Firestore (document lisible si profil public)
          const { email: _email, ...profile } = raw.profile
          s.main = { ...raw, profile }
          setDoc(userRef, { profile: { email: deleteField() } }, { merge: true }).catch(() => {})
        }
        s.loaded.main = true
        rebuild()
      },
      (err) => { setError(err); setLoading(false) },
    )

    ;(async () => {
      try {
        s.cache = await createCache(CACHE_NAME)
        const { library } = await syncLibrary(db, uid, s.cache)
        if (cancelled) return
        s.library = library
        await loadStartupCatalog(library) // œuvres en cours / à voir : calendrier et « à rattraper »
        if (cancelled) return
        s.loaded.library = true
        s.lastSync = Date.now()
        rebuild()
      } catch (e) {
        console.error('[data] chargement', e)
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
        await loadStartupCatalog(library)
        rebuild()
      } catch (e) { console.error('[data] resynchronisation', e) }
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

  // Fiche du catalogue d'une œuvre (pour l'ajouter sans rappeler les API si quelqu'un l'a déjà ajoutée)
  async function getCatalogDoc(catalogId) {
    const s = st.current
    if (s.catalog[catalogId]) return s.catalog[catalogId]
    if (!s.cache) return null
    const { catalog } = await loadCatalog(db, [catalogId], s.cache, { maxAgeMs: MONTH })
    return catalog[catalogId] || null
  }

  // Relit des fiches depuis le serveur (après un rafraîchissement) et met l'affichage à jour
  async function reloadCatalog(catalogIds) {
    const s = st.current
    if (!s.cache || !catalogIds.length) return
    const { catalog } = await loadCatalog(db, catalogIds, s.cache, { force: catalogIds })
    s.catalog = { ...s.catalog, ...catalog }
    rebuild()
  }

  // --- Rafraîchissement : le serveur interroge les API une seule fois pour tous ---
  const refreshable = (w) => w?.sourceId != null && REFRESHABLE_SOURCES.includes(w.source)

  async function refreshCatalogDocs(catalogIds, { minAgeMs, onProgress } = {}) {
    const refreshed = []
    let done = 0
    for (const id of catalogIds) {
      onProgress?.(done, catalogIds.length)
      try {
        const res = await requestCatalogRefresh(id, { minAgeMs })
        if (res.status === 'refreshed') refreshed.push(id)
      } catch (e) { console.error('[refresh]', id, e) }
      done++
    }
    if (refreshed.length) await reloadCatalog(refreshed)
    return { refreshed, total: catalogIds.length }
  }

  // Une œuvre précise (menu ⋯ d'une fiche)
  async function refreshWork(workId) {
    const w = dataRef.current.works[workId]
    if (!refreshable(w)) return { refreshed: [], total: 0 }
    return refreshCatalogDocs([workId])
  }

  // Au démarrage : quelques œuvres en cours de diffusion dont la fiche date de plus d'un jour
  async function refreshStale() {
    const s = st.current
    const now = Date.now()
    const ids = libraryDocs()
      .filter((l) => (l.status === 'en_cours' || l.status === 'a_voir') && s.catalog[l.catalogId])
      .map((l) => s.catalog[l.catalogId])
      .filter((c) => refreshable(c) && c.ended !== true && now - (c.refreshedAt || 0) > AUTO_REFRESH_MIN_AGE_MS)
      .sort((a, b) => (a.refreshedAt || 0) - (b.refreshedAt || 0))
      .slice(0, AUTO_REFRESH_PER_SESSION)
      .map((c) => c.id)
    if (!ids.length) return { refreshed: [], total: 0 }
    return refreshCatalogDocs(ids, { minAgeMs: AUTO_REFRESH_MIN_AGE_MS })
  }

  // Bouton « rafraîchir les métadonnées » : les œuvres encore en diffusion de la bibliothèque
  async function refreshAll(onProgress) {
    await ensureAllCatalog()
    const s = st.current
    const ids = libraryDocs()
      .map((l) => s.catalog[l.catalogId])
      .filter((c) => refreshable(c) && c.ended !== true)
      .sort((a, b) => (a.refreshedAt || 0) - (b.refreshedAt || 0))
      .slice(0, MANUAL_REFRESH_LIMIT)
      .map((c) => c.id)
    if (!ids.length) { onProgress?.('Aucune œuvre en cours de diffusion à rafraîchir'); return { refreshed: [], total: 0 } }
    const res = await refreshCatalogDocs(ids, { onProgress: (done, total) => onProgress?.(`Rafraîchissement… ${done}/${total}`) })
    onProgress?.(`✓ ${res.refreshed.length} fiche${res.refreshed.length > 1 ? 's' : ''} mise${res.refreshed.length > 1 ? 's' : ''} à jour (${res.total - res.refreshed.length} déjà à jour)`)
    return res
  }

  // --- Écriture ---
  async function mutate(patch) {
    const prev = dataRef.current
    setData({ ...prev, ...patch })
    if (!user) return
    const s = st.current
    const plan = planV2Writes({ uid, prev, patch })
    if (Object.keys(plan.catalogCreates).length) s.catalog = { ...s.catalog, ...plan.catalogCreates } // épisodes dispo immédiatement
    const mainPatch = Object.fromEntries(Object.entries(patch).filter(([k]) => !LIBRARY_KEYS.includes(k) || MIRRORED_KEYS.includes(k)))
    try {
      if (!isEmptyPlan(plan)) await commitPlan(db, uid, plan)
      if (Object.keys(mainPatch).length) await setDoc(doc(db, 'users', uid), clean(mainPatch), { merge: true })
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

  // Bouton « synchroniser » : repart du serveur (relecture complète de la bibliothèque)
  async function syncAll() {
    const s = st.current
    if (!user || !s.cache) return
    await clearLibraryCache(s.cache, uid)
    const { library } = await syncLibrary(db, uid, s.cache)
    s.library = library
    s.lastSync = Date.now()
    await loadStartupCatalog(library)
    rebuild()
  }

  return {
    data, loading, error, mutate, syncAll,
    // Données complètes (tous les épisodes chargés) pour l'export : indépendant du prochain rendu
    getFullData: async () => { await ensureAllCatalog(); return compute() },
    getCatalogDoc, ensureCatalog, ensureAllCatalog, ensureProgressCatalog, ensureWorkCatalog,
    refreshWork, refreshStale, refreshAll,
  }
}
