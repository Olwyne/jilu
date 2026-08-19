import { tmdbGetDetail, tmdbGetBothMeta } from '../catalog/tmdb'
import { anilistFindId, anilistGetDetail, anilistGetMangaDetail } from '../catalog/anilist'
import { spotifyGetDetail } from '../catalog/spotify'

const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: (work) => anilistGetDetail(work.anilistId || work.sourceId).then((d) => ({ ...work, ...d })),
  'anilist-manga': (work) => anilistGetMangaDetail(work.sourceId).then((d) => ({ ...work, ...d })),
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

function buildStatusPatch(work, watched, works) {
  const auto = computeAutoStatus(work, watched)
  if (!auto || auto === work.status) return {}
  const updatedWork = { ...work, status: auto }
  if (auto === 'termine' && !work.finishedAt) {
    updatedWork.finishedAt = Date.now()
  }
  return { works: { ...works, [work.id]: updatedWork } }
}

export function useWorkActions(data, mutate) {
  async function toggleEpisode(workId, sNum, eNum) {
    const key = `${workId}-${sNum}-${eNum}`
    const watched = { ...data.watched }
    if (watched[key]) delete watched[key]; else watched[key] = Date.now()
    const work = data.works[workId]
    const statusPatch = buildStatusPatch(work, watched, data.works)
    if (statusPatch.works && work.status === 'abandonne') {
      const auto = statusPatch.works[workId].status
      const label = auto === 'en_cours' ? 'En cours' : 'Terminé'
      const resume = window.confirm(`Tu reprends "${work.title}" ? Passer en "${label}" ?`)
      if (!resume) { await mutate({ watched }); return }
    }
    await mutate({ watched, ...statusPatch })
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
    const statusPatch = buildStatusPatch(work, watched, data.works)
    if (statusPatch.works && work.status === 'abandonne') {
      const auto = statusPatch.works[workId].status
      const label = auto === 'en_cours' ? 'En cours' : 'Terminé'
      const resume = window.confirm(`Tu reprends "${work.title}" ? Passer en "${label}" ?`)
      if (!resume) { await mutate({ watched }); return }
    }
    await mutate({ watched, ...statusPatch })
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
        const prevNote = idx >= 0 ? reviews[idx].note : ''
        const note = prevNote === 'Note mise à jour.' ? '' : prevNote
        const entry = { id, note, rating: next, ts: Date.now() }
        reviews = [entry, ...reviews.filter((r) => r.id !== id)]
      }
    }
    const patch = { ratings }
    if (scope === 'w') patch.reviews = reviews
    await mutate(patch)
  }

  async function setStatus(workId, status) {
    const work = data.works[workId]
    const updatedWork = { ...work, status }
    if (status === 'termine' && !work.finishedAt) {
      updatedWork.finishedAt = Date.now()
    }
    const works = { ...data.works, [workId]: updatedWork }
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

  async function addGameMinutes(workId, deltaMinutes) {
    const games = { ...data.games }
    const raw = games[workId] || {}
    const currentMinutes = raw.minutes != null ? raw.minutes : (raw.hours || 0) * 60
    const g = { done: {}, ...raw, minutes: Math.max(0, currentMinutes + deltaMinutes) }
    delete g.hours
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

  async function markWorkWatched(workId) {
    const work = data.works[workId]
    if (!work?.seasons) return
    const now = Date.now()
    const aired = []
    work.seasons.forEach((s) => s.episodes.forEach((e) => {
      if (e.air <= now) aired.push(`${workId}-${s.n}-${e.n}`)
    }))
    const allDone = aired.every((k) => data.watched[k])
    const watched = { ...data.watched }
    if (allDone) aired.forEach((k) => delete watched[k])
    else aired.forEach((k) => { watched[k] = watched[k] || Date.now() })
    const statusPatch = buildStatusPatch(work, watched, data.works)
    await mutate({ watched, ...statusPatch })
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

  async function removeWork(workId) {
    const works = { ...data.works }
    delete works[workId]
    const watched = Object.fromEntries(Object.entries(data.watched).filter(([k]) => !k.startsWith(workId + '-')))
    const ratings = { ...data.ratings }
    delete ratings[`w:${workId}`]
    const favorites = { ...(data.favorites || {}) }
    delete favorites[workId]
    await mutate({ works, watched, ratings, favorites })
  }

  async function toggleFavorite(workId) {
    const favorites = { ...(data.favorites || {}) }
    if (favorites[workId]) delete favorites[workId]; else favorites[workId] = true
    await mutate({ favorites })
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

  async function addWork(searchResult) {
    if (data.works[searchResult.id]) return
    const fetchDetail = DETAIL_FETCHERS[searchResult.source]
    const [detailed, bothMeta] = await Promise.all([
      fetchDetail ? fetchDetail(searchResult) : Promise.resolve(searchResult),
      searchResult.source === 'tmdb' ? tmdbGetBothMeta(searchResult) : Promise.resolve({})
    ])
    let work = { ...detailed, ...bothMeta }

    if (searchResult.category === 'animes' && searchResult.source === 'tmdb') {
      try {
        const anilistId = await anilistFindId(searchResult.originalTitle || searchResult.title, searchResult.year)
        if (anilistId) {
          const anilistDetail = await anilistGetDetail(anilistId)
          const keepTmdb = anilistDetail.seasons.length <= 1 && (work.seasons?.length || 0) > 1
          work = keepTmdb
            ? { ...work, anilistId }
            : { ...work, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
        }
      } catch { /* keep TMDB seasons on failure */ }
    }

    const works = { ...data.works, [searchResult.id]: { ...work, status: 'a_voir', added: Date.now() } }
    await mutate({ works })
  }

  async function refreshWork(workId) {
    const work = data.works[workId]
    if (!work?.sourceId || !DETAIL_FETCHERS[work.source]) return
    const fetcher = DETAIL_FETCHERS[work.source]
    const fresh = await fetcher(work)
    const meta = work.source === 'tmdb' ? await tmdbGetBothMeta(work) : {}
    let next = { ...work, ...fresh, ...meta, status: work.status, added: work.added }
    if (work.category === 'animes') {
      let anilistId = work.anilistId
      if (!anilistId) anilistId = await anilistFindId(work.originalTitle || work.title, work.year)
      if (anilistId) {
        const anilistDetail = await anilistGetDetail(anilistId)
        const keepTmdb = anilistDetail.seasons.length <= 1 && (next.seasons?.length || 0) > 1
        next = keepTmdb ? { ...next, anilistId } : { ...next, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
      }
    }
    await mutate({ works: { ...data.works, [workId]: { ...next, refreshedAt: Date.now() } } })
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
        const meta = work.source === 'tmdb' ? await tmdbGetBothMeta(work) : {}
        let next = { ...work, ...fresh, ...meta, status: work.status, added: work.added }

        if (work.category === 'animes') {
          let anilistId = work.anilistId
          if (!anilistId) {
            anilistId = await anilistFindId(work.originalTitle || work.title, work.year)
          }
          if (anilistId) {
            const anilistDetail = await anilistGetDetail(anilistId)
            const keepTmdb = anilistDetail.seasons.length <= 1 && (next.seasons?.length || 0) > 1
            next = keepTmdb
              ? { ...next, anilistId }
              : { ...next, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
          }
        }

        works[work.id] = next
      } catch (e) { console.error('[refresh]', work.title, e) }
      done++
    }

    await mutate({ works })
    onProgress?.(`✓ ${done} œuvre${done > 1 ? 's' : ''} mises à jour`)
  }

  return { addWork, removeWork, refreshWork, markWorkWatched, toggleEpisode, markSeason, setRating, setStatus, postComment, toggleLike, deleteComment, addGameMinutes, toggleGameTier, markAllWatched, resetProgress, clearAll, toggleFavorite, markWatchedToast, refreshAllWorks }
}
