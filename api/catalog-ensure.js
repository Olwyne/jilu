// Crée les fiches manquantes du catalogue partagé (voir api/_lib/ensureCatalog.js).
import { getAuth } from 'firebase-admin/auth'
import { createEnsureHandler } from './_lib/ensureCatalog.js'
import { createAdminStore } from './_lib/adminStore.js'
import { initAdmin } from './_lib/firebaseAdmin.js'
import { fetchWork } from '../src/catalog/fetchWork.js'

let handler

export default async function (req, res) {
  try {
    if (!handler) {
      initAdmin()
      handler = createEnsureHandler({
        verifyToken: async (token) => (await getAuth().verifyIdToken(token)).uid,
        store: createAdminStore(),
        fetchWork,
      })
    }
  } catch (e) {
    console.error('[catalog-ensure] configuration', e.message)
    res.status(500).json({ error: 'server not configured' })
    return
  }
  return handler(req, res)
}
