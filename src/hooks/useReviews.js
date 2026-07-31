import { useEffect, useState } from 'react'
import {
  collection, query, where, onSnapshot,
  addDoc, deleteDoc, doc, setDoc
} from 'firebase/firestore'
import { db } from '../firebase'

export function useReviews(workId, currentUser) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!workId || !currentUser?.uid) return
    const q = query(
      collection(db, 'reviews'),
      where('workId', '==', workId)
    )
    return onSnapshot(q, snap => {
      const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))
      docs.sort((a, b) => b.ts - a.ts)
      setReviews(docs)
    })
  }, [workId, currentUser?.uid])

  const episodeReviews = reviews.filter(r => r.sNum != null)

  async function addReview({ sNum = null, eNum = null, text, rating = null }) {
    if (!currentUser?.uid || !text?.trim()) return
    await addDoc(collection(db, 'reviews'), {
      workId,
      sNum,
      eNum,
      userId: currentUser.uid,
      handle: currentUser.handle || 'Anonyme',
      text: text.trim(),
      rating,
      ts: Date.now()
    })
  }

  async function upsertReview({ sNum = null, eNum = null, text = '', rating = null }) {
    if (!currentUser?.uid) return
    const id = [workId, sNum, eNum, currentUser.uid].filter((x) => x != null).join('-')
    await setDoc(doc(db, 'reviews', id), {
      workId,
      sNum,
      eNum,
      userId: currentUser.uid,
      handle: currentUser.handle || 'Anonyme',
      text: text?.trim() || '',
      rating,
      ts: Date.now()
    })
  }

  async function deleteReview(reviewId) {
    if (!currentUser?.uid) return
    await deleteDoc(doc(db, 'reviews', reviewId))
  }

  return { episodeReviews, addReview, upsertReview, deleteReview }
}
