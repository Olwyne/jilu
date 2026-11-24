// Application Firebase Admin, partagée par toutes les fonctions api/ (une seule initialisation par instance).
import { initializeApp, getApps, cert } from 'firebase-admin/app'

export function initAdminApp() {
  if (getApps().length) return
  if (process.env.FIRESTORE_EMULATOR_HOST) {
    // Dev (docker compose) : émulateurs Auth + Firestore, aucune clé nécessaire. Jamais défini sur Vercel.
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-jilu' })
    return
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT
  if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquante')
  const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
  initializeApp({ credential: cert(JSON.parse(json)) })
}
