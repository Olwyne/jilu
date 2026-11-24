import i18n from '../i18n/index.js'
import { DELETE } from '../data/writeV2.js'
import { assignRatings } from '../data/libraryDocs.js'

// Avis recopiés dans le document utilisateur pour le fil d'amis : les plus récents seulement (le fil en affiche 50).
// La source reste la fiche de bibliothèque ; recopier tous les avis réécrivait un tableau sans limite à chaque note.
const FEED_REVIEWS_MAX = 50

// isWatched(clé) : progression après la modification en cours (sans recopier toute la progression)
function computeAutoStatus(work, isWatched) {
  if (!work.seasons || !work.seasons.length) return null
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (isWatched(`${work.id}-${s.n}-${e.n}`)) watchedCount++
  }))
  if (total === 0) return null
  if (watchedCount === 0) return 'a_voir'
  if (watchedCount >= total) return work.ended === false ? 'en_cours' : 'termine'
  return 'en_cours'
}

// Changement de statut induit par la progression : { status, finishedAt? } ou {}
function autoStatusChanges(work, isWatched) {
  const auto = computeAutoStatus(work, isWatched)
  if (!auto || auto === work.status) return {}
  return auto === 'termine' && !work.finishedAt ? { status: auto, finishedAt: Date.now() } : { status: auto }
}

// "w1-1-3" -> "1-3" (la saison et l'épisode sont toujours les deux derniers segments)
const epSub = (key) => key.split('-').slice(-2).join('-')
const workOfKey = (key) => key.split('-').slice(0, -2).join('-')

// store : { mutate (document utilisateur), writeLibrary (bibliothèque) } fournis par useAppData
// services : création des fiches partagées et rafraîchissement, côté serveur (fournis par useAppData)
export function useWorkActions(data, { mutate, writeLibrary }, services = {}) {
  // Coche/décoche des épisodes d'une œuvre : { clé: horodatage | null }, statut ajusté au passage
  async function setEpisodes(workId, changes, { confirmResume = false } = {}) {
    const work = data.works[workId]
    const isWatched = (k) => (k in changes ? changes[k] : data.watched[k])
    const eps = Object.fromEntries(Object.entries(changes).map(([k, ts]) => [`eps.${epSub(k)}`, ts || DELETE]))
    let status = autoStatusChanges(work, isWatched)
    if (confirmResume && status.status && work.status === 'abandonne') {
      const resume = window.confirm(i18n.t('actions.resumeConfirm', { title: work.title, status: i18n.t(status.status === 'en_cours' ? 'status.en_cours' : 'status.termine') }))
      if (!resume) status = {}
    }
    await writeLibrary({ set: { [workId]: { ...eps, ...status } } })
  }

  async function toggleEpisode(workId, sNum, eNum) {
    const key = `${workId}-${sNum}-${eNum}`
    await setEpisodes(workId, { [key]: data.watched[key] ? null : Date.now() }, { confirmResume: true })
  }

  async function markSeason(workId, sNum) {
    const work = data.works[workId]
    const season = work.seasons.find((s) => s.n === sNum)
    const now = Date.now()
    const keys = season.episodes.filter((e) => e.air <= now).map((e) => `${workId}-${sNum}-${e.n}`)
    const allDone = keys.every((k) => data.watched[k])
    await setEpisodes(workId, Object.fromEntries(keys.map((k) => [k, allDone ? null : now])), { confirmResume: true })
  }

  async function markWorkWatched(workId) {
    const work = data.works[workId]
    if (!work?.seasons) return
    const now = Date.now()
    const keys = []
    work.seasons.forEach((s) => s.episodes.forEach((e) => { if (e.air <= now) keys.push(`${workId}-${s.n}-${e.n}`) }))
    const allDone = keys.every((k) => data.watched[k])
    await setEpisodes(workId, Object.fromEntries(keys.map((k) => [k, allDone ? null : (data.watched[k] || now)])))
  }

  async function markAllWatched() {
    if (!window.confirm(i18n.t('actions.markAllConfirm'))) return // un clic marque toute la bibliothèque : même garde que « Réinitialiser »
    const now = Date.now()
    const set = {}
    Object.values(data.works).forEach((w) => {
      w.seasons?.forEach((s) => s.episodes.forEach((e) => {
        const key = `${w.id}-${s.n}-${e.n}`
        if (e.air <= now && !data.watched[key]) (set[w.id] ||= {})[`eps.${s.n}-${e.n}`] = now
      }))
    })
    await writeLibrary({ set })
  }

  async function resetProgress() {
    if (!window.confirm(i18n.t('actions.resetConfirm'))) return
    const ids = new Set(Object.keys(data.watched).map(workOfKey))
    await writeLibrary({ set: Object.fromEntries([...ids].map((id) => [id, { eps: DELETE }])) })
  }

  async function clearAll() {
    if (!window.confirm(i18n.t('actions.clearConfirm'))) return
    await writeLibrary({ remove: Object.keys(data.works) }, { feed: [], reviews: [] })
  }

  async function setRating(scope, id, val) {
    const key = `${scope}:${id}`
    const current = data.ratings?.[key] || 0
    const next = current === val ? 0 : val
    const [workId, subs] = Object.entries(assignRatings({ [key]: next }, Object.keys(data.works)).byWork)[0] || []
    if (!workId) return
    const changes = Object.fromEntries(Object.keys(subs).map((sub) => [`ratings.${sub}`, next || DELETE]))
    let mainPatch
    if (scope === 'w' && next > 0) {
      // Avis personnel (note + texte) : dans la fiche, et recopié dans le document utilisateur pour le fil d'amis
      const reviews = data.reviews || []
      const prevNote = reviews.find((r) => r.id === id)?.note || ''
      const entry = { id, note: prevNote === 'Note mise à jour.' ? '' : prevNote, rating: next, ts: Date.now() }
      changes.personalReview = entry
      mainPatch = { reviews: [entry, ...reviews.filter((r) => r.id !== id)].slice(0, FEED_REVIEWS_MAX) }
    }
    await writeLibrary({ set: { [workId]: changes } }, mainPatch)
  }

  async function setStatus(workId, status) {
    const work = data.works[workId]
    const changes = { status }
    if (status === 'termine' && !work.finishedAt) changes.finishedAt = Date.now()
    await writeLibrary({ set: { [workId]: changes } })
  }

  async function postComment(workId, sNum, eNum, text) {
    const t = (text || '').trim()
    if (!t) return
    // != null : la saison 0 existe (spéciaux d'animé, scans de manga)
    const key = sNum != null ? `${workId}-${sNum}-${eNum}` : `w:${workId}`
    const entry = { id: 'c' + Date.now(), key, workId, sNum: sNum ?? null, eNum: eNum ?? null, text: t, ts: Date.now(), likes: 0, liked: false }
    await mutate({ feed: [entry, ...(data.feed || [])] })
  }

  async function toggleLike(commentId) {
    const feed = (data.feed || []).map((f) => f.id === commentId ? { ...f, liked: !f.liked, likes: f.likes + (f.liked ? -1 : 1) } : f)
    await mutate({ feed })
  }

  async function deleteComment(commentId) {
    await mutate({ feed: (data.feed || []).filter((f) => f.id !== commentId) })
  }

  async function addGameMinutes(workId, deltaMinutes) {
    const raw = data.games?.[workId] || {}
    const currentMinutes = raw.minutes != null ? raw.minutes : (raw.hours || 0) * 60
    const game = { done: {}, ...raw, minutes: Math.max(0, currentMinutes + deltaMinutes) }
    delete game.hours
    await writeLibrary({ set: { [workId]: { game } } })
  }

  async function toggleGameTier(workId, tier) {
    const g = { hours: 0, done: {}, ...(data.games?.[workId] || {}) }
    const game = { ...g, done: { ...(g.done || {}), [tier]: !g.done?.[tier] } }
    await writeLibrary({ set: { [workId]: { game } } })
  }

  async function removeWork(workId) {
    // notes, favori et progression partent avec la fiche ; l'avis recopié dans le document utilisateur
    // (lu par le fil d'amis) aussi
    const reviews = data.reviews || []
    if (reviews.some((r) => r.id === workId)) await writeLibrary({ remove: [workId] }, { reviews: reviews.filter((r) => r.id !== workId).slice(0, FEED_REVIEWS_MAX) })
    else await writeLibrary({ remove: [workId] })
  }

  async function toggleFavorite(workId) {
    await writeLibrary({ set: { [workId]: { favorite: data.favorites?.[workId] ? DELETE : true } } })
  }

  async function markWatchedToast(work, sNum, eNum, setToast) {
    try {
      await toggleEpisode(work.id, sNum, eNum)
    } catch (e) {
      console.error('markWatchedToast:', e)
    }
    const label = (sNum != null && eNum != null) ? `S${sNum} · E${eNum}` : null
    setToast({ workId: work.id, title: work.title, label, sNum, eNum })
  }

  // Champs de la fiche du catalogue qui ne font pas partie de l'œuvre de l'utilisateur
  const CATALOG_ONLY = ['updatedAt', 'refreshedAt', 'leaseUntil']

  async function addWork(searchResult) {
    if (data.works[searchResult.id]) return
    // La fiche partagée est créée (si besoin) et remplie par le serveur depuis la source ; on n'envoie que l'identifiant
    const shared = (await services.createCatalogDocs([searchResult.id]))[searchResult.id]
    if (!shared) throw new Error(`catalog unavailable: ${searchResult.id}`)
    const work = Object.fromEntries(Object.entries(shared).filter(([k]) => !CATALOG_ONLY.includes(k)))
    await writeLibrary({ add: { [searchResult.id]: { ...work, status: 'a_voir', added: Date.now() } } })
  }

  // Rafraîchissement : toujours côté serveur, qui ne rappelle les API que si la fiche partagée est périmée
  async function refreshWork(workId) {
    return services.refreshWork?.(workId)
  }

  async function refreshAllWorks(onProgress) {
    return services.refreshAll?.(onProgress)
  }

  return { addWork, removeWork, refreshWork, markWorkWatched, toggleEpisode, markSeason, setRating, setStatus, postComment, toggleLike, deleteComment, addGameMinutes, toggleGameTier, markAllWatched, resetProgress, clearAll, toggleFavorite, markWatchedToast, refreshAllWorks }
}
