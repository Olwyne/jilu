import { useEffect, useRef, useState } from 'react'
import { doc, collection, onSnapshot, setDoc, writeBatch, deleteField } from 'firebase/firestore'
import { db } from '../firebase'
import { sanitize, groupWatched, batchWrite, writeV1, syncAllV1 } from '../data/writeV1.js'

export const EMPTY_DATA = {
  works: {}, watched: {}, ratings: {}, reviews: [],
  settings: { startPage: 'library', autoNext: true, spoilerFree: true, notifNewEp: true, notifCalendar: true, notifWeekly: false, publicProfile: false, adult: false, darkMode: true, language: null, goals: {} },
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
      if (ops.length > 0) await batchWrite(db, ops)
    }

    const unsubMain = onSnapshot(
      userRef,
      snap => {
        const raw = snap.exists() ? snap.data() : {}
        const { works: _w, watched: _ww, ...rest } = raw
        mainData = rest
        if (rest.profile && 'email' in rest.profile) {
          // L'e-mail vit dans Firebase Auth ; le retirer de Firestore (document lisible si profil public)
          const { email: _email, ...profileWithoutEmail } = rest.profile
          mainData = { ...rest, profile: profileWithoutEmail }
          setDoc(userRef, { profile: { email: deleteField() } }, { merge: true }).catch(() => {})
        }
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
    const prev = dataRef.current
    setData({ ...prev, ...patch })
    if (!user) return
    await writeV1(db, user.uid, prev, patch)
  }

  async function syncAll() {
    if (!user) return
    await syncAllV1(db, user.uid, dataRef.current)
  }

  return { data, loading, mutate, syncAll, error }
}
