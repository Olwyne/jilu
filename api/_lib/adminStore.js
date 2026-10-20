// Accès Firestore (Admin SDK) au catalogue partagé. Contourne les règles : réservé au serveur.
import { getFirestore } from 'firebase-admin/firestore'

export function createAdminStore(db = getFirestore()) {
  const col = db.collection('catalog')
  return {
    async get(id) {
      const snap = await col.doc(id).get()
      return snap.exists ? snap.data() : null
    },
    // Transaction : un seul appelant obtient le verrou, et seulement si la fiche est périmée.
    async acquireLease(id, now, leaseMs, minAgeMs) {
      return db.runTransaction(async (tx) => {
        const ref = col.doc(id)
        const snap = await tx.get(ref)
        if (!snap.exists) return { ok: false, reason: 'not_found' }
        const doc = snap.data()
        if (doc.leaseUntil && doc.leaseUntil > now) return { ok: false, reason: 'busy' }
        if (doc.refreshedAt && now - doc.refreshedAt < minAgeMs) return { ok: false, reason: 'fresh', refreshedAt: doc.refreshedAt }
        tx.update(ref, { leaseUntil: now + leaseMs })
        return { ok: true, doc }
      })
    },
    async save(id, data) {
      await col.doc(id).set(data) // remplace la fiche entière (sans leaseUntil : le verrou est levé)
    },
    async releaseLease(id) {
      await col.doc(id).update({ leaseUntil: 0 }).catch(() => {})
    },
  }
}
