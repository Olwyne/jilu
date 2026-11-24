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
    // Création seule : false si la fiche existe déjà (créée entre-temps par une autre requête)
    async create(id, data) {
      try {
        await col.doc(id).create(data)
        return true
      } catch (e) {
        if (e.code === 6) return false // ALREADY_EXISTS
        throw e
      }
    },
    async save(id, data) {
      await col.doc(id).set(data) // remplace la fiche entière (sans leaseUntil : le verrou est levé)
    },
    // Œuvres encore en cours (séries, animés, mangas) : { id, refreshedAt } ; les champs lourds ne sont pas lus
    async listAiring() {
      const snap = await col.where('ended', '==', false).select('refreshedAt').get()
      return snap.docs.map((d) => ({ id: d.id, refreshedAt: d.get('refreshedAt') || 0 }))
    },
    // Plafond quotidien par utilisateur (quotas/{uid} : { day, ensure, refresh }) : false si `amount` le dépasserait,
    // et rien n'est alors compté. Inscription ouverte : sans plafond, un seul compte peut vider les quotas des API.
    async consumeQuota(uid, kind, amount, max, now) {
      const day = new Date(now).toISOString().slice(0, 10)
      const ref = db.collection('quotas').doc(uid)
      return db.runTransaction(async (tx) => {
        const today = (await tx.get(ref)).data()
        const used = today?.day === day ? today[kind] || 0 : 0
        if (used + amount > max) return false
        tx.set(ref, today?.day === day ? { ...today, [kind]: used + amount } : { day, [kind]: amount })
        return true
      })
    },
    async releaseLease(id) {
      await col.doc(id).update({ leaseUntil: 0 }).catch(() => {})
    },
  }
}
