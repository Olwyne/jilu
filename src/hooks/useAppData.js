import { useEffect, useRef, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from '../firebase'

function sanitize(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(sanitize)
  return Object.fromEntries(Object.entries(v).filter(([, val]) => val !== undefined).map(([k, val]) => [k, sanitize(val)]))
}

const EMPTY_DATA = {
  works: {}, watched: {}, ratings: {}, reviews: [],
  settings: { startPage: 'library', autoNext: true, spoilerFree: true, notifNewEp: true, notifCalendar: true, notifWeekly: false, publicProfile: false, adult: false },
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
    const ref = doc(db, 'users', user.uid)
    return onSnapshot(
      ref,
      (snap) => {
        setData(snap.exists() ? { ...EMPTY_DATA, ...snap.data() } : EMPTY_DATA)
        setLoading(false)
      },
      (err) => {
        setLoading(false)
        setError(err)
      }
    )
  }, [user])

  async function mutate(patch) {
    const next = { ...dataRef.current, ...patch }
    setData(next)
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    await setDoc(ref, sanitize(patch), { merge: true })
  }

  async function syncAll() {
    if (!user) return
    const ref = doc(db, 'users', user.uid)
    const d = dataRef.current
    await setDoc(ref, sanitize({
      works: d.works, watched: d.watched, ratings: d.ratings, reviews: d.reviews,
      settings: d.settings, profile: d.profile, feed: d.feed, games: d.games, favorites: d.favorites
    }), { merge: true })
  }

  return { data, loading, mutate, syncAll, error }
}
