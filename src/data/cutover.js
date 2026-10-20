// Basculement vers le modèle de données v2 (catalogue partagé + une fiche de bibliothèque par œuvre).
// À la première ouverture de chaque compte, on rattrape ce qui a changé dans l'ancien modèle depuis la
// première copie (progression, statuts, œuvres ajoutées ou retirées), puis le site n'utilise plus que le nouveau.
// L'ancien modèle n'est plus écrit ; ses données restent en place, simplement inutilisées.
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { migrateAccount } from '../lib/migration.js'

const markerRef = (db, uid) => doc(db, 'users', uid, 'migrations', 'v2')

export async function ensureCutover(db, uid, { onProgress } = {}) {
  const marker = await getDoc(markerRef(db, uid))
  if (marker.exists() && marker.data().cutoverAt) return { ok: true, ran: false }
  const res = await migrateAccount(db, uid, { onProgress, overwrite: 'changed' })
  if (!res.verification.ok) return { ok: false, ran: true, verification: res.verification }
  await setDoc(markerRef(db, uid), { cutoverAt: Date.now() }, { merge: true })
  return { ok: true, ran: true }
}
