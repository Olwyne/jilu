// Initialisation Firebase Admin + transport HTTP serveur des modules de catalogue, partagée par les fonctions api/.
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { createServerHttp } from './serverHttp.js'
import { setHttp } from '../../src/catalog/http.js'

export function initAdmin() {
  if (!getApps().length && process.env.FIRESTORE_EMULATOR_HOST) {
    // Dev (docker compose) : émulateurs Auth + Firestore, aucune clé nécessaire. Jamais défini sur Vercel.
    initializeApp({ projectId: process.env.GCLOUD_PROJECT || 'demo-jilu' })
  }
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquante')
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    initializeApp({ credential: cert(JSON.parse(json)) })
  }
  setHttp(createServerHttp())
}
