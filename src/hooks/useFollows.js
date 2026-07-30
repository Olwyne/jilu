import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc, updateDoc, deleteField } from 'firebase/firestore'
import { db } from '../firebase'

export function useFollows(user) {
  const [following, setFollowing] = useState({}) // { [uid]: { handle, ts } }
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!user) return
    const ref = doc(db, 'follows', user.uid)
    const unsub = onSnapshot(ref, (snap) => {
      setFollowing(snap.exists() ? (snap.data().following || {}) : {})
      setLoaded(true)
    }, () => setLoaded(true))
    return unsub
  }, [user])

  async function follow(targetUid, targetHandle) {
    if (!user) return
    await setDoc(doc(db, 'follows', user.uid), {
      following: { [targetUid]: { handle: targetHandle || targetUid, ts: Date.now() } }
    }, { merge: true })
  }

  async function unfollow(targetUid) {
    if (!user) return
    await updateDoc(doc(db, 'follows', user.uid), {
      [`following.${targetUid}`]: deleteField()
    })
  }

  return { following, loaded, follow, unfollow, isFollowing: (uid) => !!following[uid] }
}
