// Rafraîchit une fiche du catalogue partagé (api/_lib/refreshCatalog.js). Variables Vercel : FIREBASE_SERVICE_ACCOUNT (JSON, brut ou base64), TMDB_API_KEY, SPOTIFY_*.
import { getAuth } from 'firebase-admin/auth'
import { createHandler } from './_lib/refreshHandler.js'
import { createAdminStore } from './_lib/adminStore.js'
import { initAdmin } from './_lib/firebaseAdmin.js'
import { fetchWork } from '../src/catalog/fetchWork.js'

let handler

function init() {
  initAdmin()
  return createHandler({
    verifyToken: async (token) => (await getAuth().verifyIdToken(token)).uid,
    store: createAdminStore(),
    fetchFresh: fetchWork,
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
