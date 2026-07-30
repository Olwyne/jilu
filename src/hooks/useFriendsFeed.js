import { useEffect, useState } from 'react'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../firebase'

export function useFriendsFeed(following) {
  const [friendsFeed, setFriendsFeed] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const uids = Object.keys(following || {})
    if (!uids.length) { setFriendsFeed([]); return }

    setLoading(true)
    Promise.all(
      uids.map(async (uid) => {
        try {
          const snap = await getDoc(doc(db, 'users', uid))
          if (!snap.exists()) return []
          const d = snap.data()
          if (!d.settings?.publicProfile) return []
          const handle = d.profile?.handle || following[uid]?.handle || uid
          const items = [
            ...(d.feed || []).map((f) => ({ ...f, _uid: uid, _handle: handle, _type: 'comment' })),
            ...(d.reviews || []).map((r) => ({ ...r, _uid: uid, _handle: handle, _type: 'review' })),
          ]
          return items
        } catch { return [] }
      })
    ).then((all) => {
      const flat = all.flat().sort((a, b) => b.ts - a.ts).slice(0, 50)
      setFriendsFeed(flat)
      setLoading(false)
    })
  }, [JSON.stringify(Object.keys(following || {}).sort())])

  return { friendsFeed, loading }
}
