import { useEffect, useRef, useState } from 'react'
import { doc, collection, onSnapshot, setDoc, writeBatch, deleteField } from 'firebase/firestore'
import { db } from '../firebase'

function sanitize(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(sanitize)
  return Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined).map(([k, val]) => [k, sanitize(val)]))
}

function groupWatched(flat) {
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

async function batchWrite(ops) {
  for (let i = 0; i < ops.length; i += 499) {
    const b = writeBatch(db)
    ops.slice(i, i + 499).forEach(fn => fn(b))
    await b.commit()
  }
}

const EMPTY_DATA = {
  works: {}, watched: {}, ratings: {}, reviews: [],
  settings: { startPage: 'library', autoNext: true, spoilerFree: true, notifNewEp: true, notifCalendar: true, notifWeekly: false, publicProfile: false, adult: false, darkMode: true, language: null },
  profile: { name: '', handle: '', email: '', memberSince: '' },
  feed: [], games: {}, ccLikes: {}, favorites: {}
}

export function useAppData(user) {
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const dataRef = useRef(data)
  dataRef.current = data

  useEffect(() => {
    if (!user) return

    const userRef = doc(db, 'users', user.uid)
    const worksRef = collection(db, 'users', user.uid, 'works')
    const watchedRef = collection(db, 'users', user.uid, 'watched')

    let mainData = {}
    let worksData = {}
    let watchedData = {}
    const loaded = { main: false, works: false, watched: false }

    function merge() {
      if (!loaded.main || !loaded.works || !loaded.watched) return
      setData({ ...EMPTY_DATA, ...mainData, works: worksData, watched: watchedData })
      setLoading(false)
    }

    async function migrateOldData(raw) {
      const ops = []
      if (raw.works) {
        Object.entries(raw.works).forEach(([id, work]) => {
          ops.push(b => b.set(doc(db, 'users', user.uid, 'works', id), sanitize(work)))
        })
      }
      if (raw.watched) {
        const byWork = groupWatched(raw.watched)
        Object.entries(byWork).forEach(([workId, eps]) => {
          ops.push(b => b.set(doc(db, 'users', user.uid, 'watched', workId), { eps: sanitize(eps) }))
        })
      }
      await setDoc(userRef, { works: deleteField(), watched: deleteField() }, { merge: true })
      if (ops.length > 0) await batchWrite(ops)
    }

    const unsubMain = onSnapshot(
      userRef,
      snap => {
        const raw = snap.exists() ? snap.data() : {}
        const { works: _w, watched: _ww, ...rest } = raw
        mainData = rest
        loaded.main = true
        if (raw.works || raw.watched) migrateOldData(raw)
        merge()
      },
      err => { setError(err); setLoading(false) }
    )

    const unsubWorks = onSnapshot(
      worksRef,
      snap => {
        worksData = {}
        snap.forEach(d => { worksData[d.id] = d.data() })
        loaded.works = true
        merge()
      },
      err => { setError(err); setLoading(false) }
    )

    const unsubWatched = onSnapshot(
      watchedRef,
      snap => {
        watchedData = {}
        snap.forEach(d => {
          const workId = d.id
          Object.entries(d.data().eps || {}).forEach(([k, ts]) => {
            watchedData[`${workId}-${k}`] = ts
          })
        })
        loaded.watched = true
        merge()
      },
      err => { setError(err); setLoading(false) }
    )

    return () => { unsubMain(); unsubWorks(); unsubWatched() }
  }, [user])

  async function mutate(patch) {
    const next = { ...dataRef.current, ...patch }
    setData(next)
    if (!user) return

    const ops = []
    const userRef = doc(db, 'users', user.uid)
    const { works, watched, ...mainPatch } = patch

    if (works !== undefined) {
      const current = dataRef.current.works || {}
      const nextWorks = works || {}
      Object.keys(current).forEach(id => {
        if (!nextWorks[id]) ops.push(b => b.delete(doc(db, 'users', user.uid, 'works', id)))
      })
      Object.entries(nextWorks).forEach(([id, work]) => {
        if (JSON.stringify(current[id]) !== JSON.stringify(work))
          ops.push(b => b.set(doc(db, 'users', user.uid, 'works', id), sanitize(work)))
      })
    }

    if (watched !== undefined) {
      const currentByWork = groupWatched(dataRef.current.watched || {})
      const nextByWork = groupWatched(watched || {})
      const allIds = new Set([...Object.keys(currentByWork), ...Object.keys(nextByWork)])
      allIds.forEach(workId => {
        const cur = currentByWork[workId]
        const nxt = nextByWork[workId]
        if (!nxt) {
          ops.push(b => b.delete(doc(db, 'users', user.uid, 'watched', workId)))
        } else if (JSON.stringify(cur) !== JSON.stringify(nxt)) {
          ops.push(b => b.set(doc(db, 'users', user.uid, 'watched', workId), { eps: sanitize(nxt) }))
        }
      })
    }

    if (Object.keys(mainPatch).length > 0) {
      ops.push(b => b.set(userRef, sanitize(mainPatch), { merge: true }))
    }

    if (ops.length > 0) await batchWrite(ops)
  }

  async function syncAll() {
    if (!user) return
    const d = dataRef.current
    const ops = []
    const userRef = doc(db, 'users', user.uid)

    ops.push(b => b.set(userRef, sanitize({
      ratings: d.ratings, reviews: d.reviews, settings: d.settings,
      profile: d.profile, feed: d.feed, games: d.games, favorites: d.favorites, ccLikes: d.ccLikes
    }), { merge: true }))

    Object.entries(d.works || {}).forEach(([id, work]) => {
      ops.push(b => b.set(doc(db, 'users', user.uid, 'works', id), sanitize(work)))
    })

    const byWork = groupWatched(d.watched || {})
    Object.entries(byWork).forEach(([workId, eps]) => {
      ops.push(b => b.set(doc(db, 'users', user.uid, 'watched', workId), { eps: sanitize(eps) }))
    })

    await batchWrite(ops)
  }

  return { data, loading, mutate, syncAll, error }
}
