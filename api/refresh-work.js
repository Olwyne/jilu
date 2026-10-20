// Rafraîchit une fiche du catalogue partagé (voir api/_lib/refreshCatalog.js).
// Configuration Vercel : variable d'environnement FIREBASE_SERVICE_ACCOUNT (JSON de la clé de compte de service,
// brut ou encodé en base64) + TMDB_API_KEY (+ SPOTIFY_* pour la musique).
import { initializeApp, getApps, cert } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { createHandler } from './_lib/refreshHandler.js'
import { createAdminStore } from './_lib/adminStore.js'
import { createServerHttp } from './_lib/serverHttp.js'
import { setHttp } from '../src/catalog/http.js'
import { fetchFreshWork } from '../src/catalog/refresh.js'

let handler

function init() {
  if (!getApps().length) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT manquante')
    const json = raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8')
    initializeApp({ credential: cert(JSON.parse(json)) })
  }
  setHttp(createServerHttp())
  return createHandler({
    verifyToken: async (token) => (await getAuth().verifyIdToken(token)).uid,
    store: createAdminStore(),
    fetchFresh: fetchFreshWork,
  })
}

export default async function (req, res) {
  try {
    handler ||= init()
  } catch (e) {
    console.error('[refresh-work] configuration', e.message)
    res.status(500).json({ error: 'server not configured' })
    return
  }
  return handler(req, res)
}
