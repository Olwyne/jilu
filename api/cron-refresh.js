// Cron Vercel quotidien (vercel.json) : rafraîchit les séries, animés et mangas en cours de diffusion.
// Variables Vercel : CRON_SECRET (envoyé par Vercel à chaque appel) + celles de api/refresh-work.js.
import { createCronHandler } from './_lib/cronRefresh.js'
import { createAdminStore } from './_lib/adminStore.js'
import { initAdmin } from './_lib/firebaseAdmin.js'
import { fetchFreshWork } from '../src/catalog/refresh.js'

let handler

export default async function (req, res) {
  try {
    if (!handler) {
      initAdmin()
      handler = createCronHandler({ store: createAdminStore(), fetchFresh: fetchFreshWork, secret: process.env.CRON_SECRET })
    }
  } catch (e) {
    console.error('[cron-refresh] configuration', e.message)
    res.status(500).json({ error: 'server not configured' })
    return
  }
  return handler(req, res)
}
