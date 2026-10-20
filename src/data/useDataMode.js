import { useEffect, useState } from 'react'
import { db } from '../firebase'
import { ensureCutover, isV2Enabled, readFeatureFlags } from './features.js'

const cacheKey = (uid) => `jilu:dataMode:${uid}`
const readCached = (uid) => { try { return localStorage.getItem(cacheKey(uid)) } catch { return null } }
const writeCached = (uid, mode) => { try { localStorage.setItem(cacheKey(uid), mode) } catch { /* stockage indisponible */ } }

// Quel modèle de données utiliser pour cet utilisateur : 'v1' (actuel) ou 'v2' (catalogue partagé).
// Par défaut et en cas d'erreur : v1 (le comportement actuel).
export function useDataMode(user) {
  const uid = user?.uid
  const [state, setState] = useState({ mode: 'loading', progress: '' })

  useEffect(() => {
    if (!uid) return
    let cancelled = false
    const set = (mode, progress = '') => { if (!cancelled) setState((s) => (s.mode === mode && s.progress === progress ? s : { mode, progress })) }

    const cached = readCached(uid)
    if (cached === 'v1' || cached === 'v2') set(cached)

    ;(async () => {
      let mode = 'v1'
      try {
        const flags = await readFeatureFlags(db)
        if (isV2Enabled(flags, uid)) {
          if (cached !== 'v2') set('loading', 'Mise à jour de ta bibliothèque…')
          const res = await ensureCutover(db, uid, { onProgress: (p) => set('loading', p) })
          mode = res.ok ? 'v2' : 'v1'
          if (!res.ok) console.error('[v2] contrôle de la migration en échec, retour au modèle actuel', res.verification)
        }
      } catch (e) {
        console.error('[v2] mode indéterminé, modèle actuel conservé', e)
        mode = cached === 'v2' ? 'v2' : 'v1' // une panne réseau ne doit pas faire basculer un compte déjà en v2
      }
      writeCached(uid, mode)
      set(mode)
    })()

    return () => { cancelled = true }
  }, [uid])

  return state
}
