// Interrupteur du nouveau modèle de données (v2), piloté depuis la console Firebase sans redéploiement :
//   document config/features = { v2Users: ["<uid>", …], v2All: true|false }
// Retour arrière immédiat : retirer l'uid de v2Users (ou mettre v2All à false).
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { migrateAccount } from '../lib/migration.js'

export async function readFeatureFlags(db) {
  const snap = await getDoc(doc(db, 'config', 'features'))
  return snap.exists() ? snap.data() : {}
}

export function isV2Enabled(flags, uid) {
  return flags?.v2All === true || (Array.isArray(flags?.v2Users) && flags.v2Users.includes(uid))
}

const markerRef = (db, uid) => doc(db, 'users', uid, 'migrations', 'v2')

// Avant de lire le nouveau modèle, on rattrape ce qui a changé dans l'ancien depuis la première copie.
// Ensuite les deux modèles sont tenus à jour ensemble (double écriture). Une seule fois par compte.
export async function ensureCutover(db, uid, { onProgress } = {}) {
  const marker = await getDoc(markerRef(db, uid))
  if (marker.exists() && marker.data().cutoverAt) return { ok: true, ran: false }
  const res = await migrateAccount(db, uid, { onProgress, overwrite: 'changed' })
  if (!res.verification.ok) return { ok: false, ran: true, verification: res.verification }
  await setDoc(markerRef(db, uid), { cutoverAt: Date.now() }, { merge: true })
  return { ok: true, ran: true }
}
