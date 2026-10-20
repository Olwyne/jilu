import { doc, getDoc, writeBatch } from 'firebase/firestore'
import { db } from '../firebase'

export const HANDLE_RE = /^[a-z0-9_]{2,20}$/

// Pseudo neutre (ne révèle rien de l'identité) : "membre_" + 6 caractères aléatoires
export function neutralHandle(random = Math.random) {
  let suffix = ''
  while (suffix.length < 6) suffix += random().toString(36).slice(2)
  return 'membre_' + suffix.slice(0, 6)
}

// base, base2, base3… (le suffixe est pris sur la longueur max de 20 caractères)
export function handleCandidate(base, attempt) {
  if (attempt === 0) return base
  const suffix = String(attempt + 1)
  return base.slice(0, 20 - suffix.length) + suffix
}

// Garantit que l'utilisateur possède un pseudo enregistré dans `pseudos/`.
// Garde le pseudo du profil s'il est valide ; sinon en attribue un neutre (membre_xxxxxx),
// jamais dérivé de l'e-mail : le pseudo est public (avis, profil).
// Renvoie le pseudo (déjà à lui, ou nouvellement réservé), ou null si rien n'a pu être réservé.
export async function ensureHandle(user, currentHandle, random = Math.random) {
  const existing = String(currentHandle || '').toLowerCase()
  const keepExisting = HANDLE_RE.test(existing)

  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = keepExisting ? handleCandidate(existing, attempt) : neutralHandle(random)
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
