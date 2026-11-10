// Rafraîchit une fiche du catalogue partagé (voir api/_lib/refreshCatalog.js).
// Configuration Vercel : variable d'environnement FIREBASE_SERVICE_ACCOUNT (JSON de la clé de compte de service,
// brut ou encodé en base64) + TMDB_API_KEY (+ SPOTIFY_* pour la musique).
import { getAuth } from 'firebase-admin/auth'
import { createHandler } from './_lib/refreshHandler.js'
import { createAdminStore } from './_lib/adminStore.js'
import { initAdmin } from './_lib/firebaseAdmin.js'
import { fetchFreshWork } from '../src/catalog/refresh.js'

let handler

function init() {
  initAdmin()
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
