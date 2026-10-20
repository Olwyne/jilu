import { useCallback, useEffect, useState } from 'react'
import { db } from '../firebase'
import { ensureCutover } from './cutover.js'

const flagKey = (uid) => `jilu:cutover:${uid}`
const readFlag = (uid) => { try { return localStorage.getItem(flagKey(uid)) === '1' } catch { return false } }
const writeFlag = (uid) => { try { localStorage.setItem(flagKey(uid), '1') } catch { /* stockage indisponible */ } }

// Prépare le compte pour le modèle v2. Déjà fait sur cet appareil : prêt immédiatement (même hors connexion).
// Sinon : rattrapage (écran de progression). En cas d'échec : aucune donnée perdue, on propose de réessayer.
export function useCutover(user) {
  const uid = user?.uid
  const [state, setState] = useState(() => ({ status: uid && readFlag(uid) ? 'ready' : 'checking', progress: '' }))
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!uid) return
    if (readFlag(uid)) { setState({ status: 'ready', progress: '' }); return }
    let cancelled = false
    setState({ status: 'checking', progress: '' })
    ensureCutover(db, uid, { onProgress: (progress) => { if (!cancelled) setState({ status: 'checking', progress }) } })
      .then((res) => {
        if (cancelled) return
        if (res.ok) { writeFlag(uid); setState({ status: 'ready', progress: '' }) }
        else { console.error('[cutover] contrôle en échec', res.verification); setState({ status: 'error', progress: '' }) }
      })
      .catch((e) => {
        if (cancelled) return
        console.error('[cutover]', e)
        setState({ status: 'error', progress: '' })
      })
    return () => { cancelled = true }
  }, [uid, attempt])

  const retry = useCallback(() => setAttempt((a) => a + 1), [])
  return { ...state, retry }
}
