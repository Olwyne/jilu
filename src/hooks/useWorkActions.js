import { tmdbGetDetail } from '../catalog/tmdb'
import { anilistGetDetail } from '../catalog/anilist'
import { spotifyGetDetail } from '../catalog/spotify'

const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: anilistGetDetail,
  spotify: spotifyGetDetail
}

function computeAutoStatus(work, watched) {
  if (!work.seasons || !work.seasons.length) return null
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  if (total === 0) return null
  if (watchedCount === 0) return 'a_voir'
  if (watchedCount >= total) return work.ended === false ? 'en_cours' : 'termine'
  return 'en_cours'
}

async function applyAutoStatus(work, watched, mutate, works) {
  const auto = computeAutoStatus(work, watched)
  if (!auto || auto === work.status) return
  if (work.status === 'abandonne') {
    const resume = window.confirm(`Tu reprends "${work.title}" ? Passer en "${auto === 'en_cours' ? 'En cours' : auto === 'a_voir' ? 'À voir' : 'Terminé'}" ?`)
    if (!resume) return
  }
  await mutate({ works: { ...works, [work.id]: { ...work, status: auto } } })
}

export function useWorkActions(data, mutate) {
  async function toggleEpisode(workId, sNum, eNum) {
    const key = `${workId}-${sNum}-${eNum}`
    const watched = { ...data.watched }
    if (watched[key]) delete watched[key]; else watched[key] = Date.now()
    await mutate({ watched })
    await applyAutoStatus(data.works[workId], watched, mutate, data.works)
  }

  async function markSeason(workId, sNum) {
    const work = data.works[workId]
    const season = work.seasons.find((s) => s.n === sNum)
    const now = Date.now()
    const aired = season.episodes.filter((e) => e.air <= now)
    const allDone = aired.every((e) => data.watched[`${workId}-${sNum}-${e.n}`])
    const watched = { ...data.watched }
    aired.forEach((e) => {
      const key = `${workId}-${sNum}-${e.n}`
      if (allDone) delete watched[key]; else watched[key] = Date.now()
    })
    await mutate({ watched })
    await applyAutoStatus(work, watched, mutate, data.works)
  }

  async function setRating(scope, id, val) {
    const key = `${scope}:${id}`
    const current = data.ratings?.[key] || 0
    const next = current === val ? 0 : val
    const ratings = { ...data.ratings, [key]: next }
    let reviews = data.reviews || []
    if (scope === 'w') {
      const idx = reviews.findIndex((r) => r.id === id)
      if (next > 0) {
        const entry = { id, note: idx >= 0 ? reviews[idx].note : 'Note mise à jour.', ts: Date.now() }
        reviews = [entry, ...reviews.filter((r) => r.id !== id)]
      }
    }
    const patch = { ratings }
    if (scope === 'w') patch.reviews = reviews
    await mutate(patch)
  }

  async function setStatus(workId, status) {
    const work = data.works[workId]
    const works = { ...data.works, [workId]: { ...work, status } }
    await mutate({ works })
  }

  async function postComment(workId, sNum, eNum, text) {
    const t = (text || '').trim()
    if (!t) return
    const key = sNum ? `${workId}-${sNum}-${eNum}` : `w:${workId}`
    const entry = { id: 'c' + Date.now(), key, workId, sNum: sNum || null, eNum: eNum || null, text: t, ts: Date.now(), likes: 0, liked: false }
    await mutate({ feed: [entry, ...(data.feed || [])] })
  }

  async function toggleLike(commentId) {
    const feed = (data.feed || []).map((f) => f.id === commentId ? { ...f, liked: !f.liked, likes: f.likes + (f.liked ? -1 : 1) } : f)
    await mutate({ feed })
  }

  async function deleteComment(commentId) {
    const feed = (data.feed || []).filter((f) => f.id !== commentId)
    await mutate({ feed })
  }

  async function addGameHours(workId, delta) {
    const games = { ...data.games }
    const g = { hours: 0, done: {}, ...(games[workId] || {}) }
    g.hours = Math.max(0, (g.hours || 0) + delta)
    games[workId] = g
    await mutate({ games })
  }

  async function toggleGameTier(workId, tier) {
    const games = { ...data.games }
    const g = { hours: 0, done: {}, ...(games[workId] || {}) }
    g.done = { ...(g.done || {}), [tier]: !g.done[tier] }
    games[workId] = g
    await mutate({ games })
  }

  async function markAllWatched() {
    const watched = {}
    const now = Date.now()
    Object.values(data.works).forEach((w) => {
      if (w.seasons) {
        w.seasons.forEach((s) => s.episodes.forEach((e) => {
          if (e.air <= now) watched[`${w.id}-${s.n}-${e.n}`] = true
        }))
      }
    })
    await mutate({ watched })
  }

  async function resetProgress() {
    if (window.confirm('Réinitialiser toute ta progression ? Les épisodes cochés seront remis à zéro.')) {
      await mutate({ watched: {} })
    }
  }

  async function clearAll() {
    if (window.confirm('Tout effacer ? Progression, notes, avis et œuvres importées seront supprimés. Irréversible.')) {
      await mutate({ works: {}, watched: {}, ratings: {}, reviews: [], feed: [], games: {}, favorites: {} })
    }
  }

  async function toggleFavorite(workId) {
    const favorites = { ...(data.favorites || {}) }
    if (favorites[workId]) delete favorites[workId]; else favorites[workId] = true
    await mutate({ favorites })
  }

  async function markWatchedToast(work, sNum, eNum, setToast) {
    await toggleEpisode(work.id, sNum, eNum)
    const label = (sNum != null && eNum != null) ? `S${sNum} · E${eNum}` : null
    setToast({ workId: work.id, title: work.title, label })
  }

  async function refreshAllWorks(onProgress) {
    const entries = Object.values(data.works).filter((w) => w.sourceId && DETAIL_FETCHERS[w.source])
    if (!entries.length) { onProgress?.('Aucune œuvre à rafraîchir'); return }
    let done = 0
    const works = { ...data.works }
    for (const work of entries) {
      onProgress?.(`Rafraîchissement… ${done}/${entries.length}`)
      try {
        const fetcher = DETAIL_FETCHERS[work.source]
        const fresh = await fetcher(work)
        works[work.id] = { ...work, ...fresh, status: work.status, added: work.added }
      } catch { /* skip failed */ }
      done++
    }
    await mutate({ works })
    onProgress?.(`✓ ${done} œuvre${done > 1 ? 's' : ''} mises à jour`)
  }

  async function addWork(searchResult) {
    if (data.works[searchResult.id]) return
    const fetchDetail = DETAIL_FETCHERS[searchResult.source]
    const detailed = fetchDetail ? await fetchDetail(searchResult) : searchResult
    const works = { ...data.works, [searchResult.id]: { ...detailed, status: 'a_voir', added: Date.now() } }
    await mutate({ works })
  }

  return { addWork, toggleEpisode, markSeason, setRating, setStatus, postComment, toggleLike, deleteComment, addGameHours, toggleGameTier, markAllWatched, resetProgress, clearAll, toggleFavorite, markWatchedToast, refreshAllWorks }
}
