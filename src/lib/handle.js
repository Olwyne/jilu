import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

export const HANDLE_RE = /^[a-z0-9_]{2,20}$/

// "Sophie.Martin+tv@gmail.com" -> "sophie_martin_tv"
export function handleFromEmail(email) {
  const local = String(email || '').split('@')[0]
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 20)
  return local.length >= 2 ? local : 'user'
}

// base, base2, base3… (le suffixe est pris sur la longueur max de 20 caractères)
export function handleCandidate(base, attempt) {
  if (attempt === 0) return base
  const suffix = String(attempt + 1)
  return base.slice(0, 20 - suffix.length) + suffix
}

// Garantit que l'utilisateur possède un pseudo enregistré dans `pseudos/`.
// Garde le pseudo du profil s'il est valide, sinon dérive un pseudo de l'e-mail.
// Renvoie le pseudo (déjà à lui, ou nouvellement réservé), ou null si rien n'a pu être réservé.
export async function ensureHandle(user, currentHandle) {
  const existing = String(currentHandle || '').toLowerCase()
  const base = HANDLE_RE.test(existing) ? existing : handleFromEmail(user.email)

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = handleCandidate(base, attempt)
    const ref = doc(db, 'pseudos', candidate)
    const snap = await getDoc(ref)
    if (snap.exists()) {
      if (snap.data().uid === user.uid) return candidate
      continue
    }
    try {
      const batch = writeBatch(db)
      batch.set(ref, { uid: user.uid })
      await batch.commit()
      return candidate
    } catch (e) {
      // Course : quelqu'un vient de prendre ce pseudo -> candidat suivant
      if (e?.code !== 'permission-denied') throw e
    }
  }
  return null
}
