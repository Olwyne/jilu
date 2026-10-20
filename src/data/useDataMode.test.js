import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
const features = vi.hoisted(() => ({ readFeatureFlags: vi.fn(), ensureCutover: vi.fn(), isV2Enabled: (f, uid) => f?.v2All === true || !!f?.v2Users?.includes(uid) }))
vi.mock('./features.js', () => features)

import { useDataMode } from './useDataMode.js'

const user = { uid: 'u1' }
beforeEach(() => { localStorage.clear(); vi.clearAllMocks() })

describe('useDataMode', () => {
  it('modèle actuel (v1) par défaut', async () => {
    features.readFeatureFlags.mockResolvedValue({})
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.mode).toBe('v1'))
    expect(features.ensureCutover).not.toHaveBeenCalled()
    expect(localStorage.getItem('jilu:dataMode:u1')).toBe('v1')
  })

  it('passe en v2 pour un compte activé, après le rattrapage', async () => {
    features.readFeatureFlags.mockResolvedValue({ v2Users: ['u1'] })
    features.ensureCutover.mockResolvedValue({ ok: true, ran: true })
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.mode).toBe('v2'))
    expect(localStorage.getItem('jilu:dataMode:u1')).toBe('v2')
  })

  it('reste en v1 si le contrôle de la migration échoue', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    features.readFeatureFlags.mockResolvedValue({ v2All: true })
    features.ensureCutover.mockResolvedValue({ ok: false, verification: { missing: ['x'] } })
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.mode).toBe('v1'))
  })

  it('une panne de lecture de l’interrupteur ne fait pas basculer : v1 par défaut', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    features.readFeatureFlags.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.mode).toBe('v1'))
  })

  it('une panne ne fait pas quitter un compte déjà en v2', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('jilu:dataMode:u1', 'v2')
    features.readFeatureFlags.mockRejectedValue(new Error('offline'))
    const { result } = renderHook(() => useDataMode(user))
    expect(result.current.mode).toBe('v2') // démarrage immédiat grâce à la valeur mémorisée
    await waitFor(() => expect(features.readFeatureFlags).toHaveBeenCalled())
    await new Promise((r) => setTimeout(r, 20))
    expect(result.current.mode).toBe('v2')
  })

  it('retour arrière : retirer le compte de l’interrupteur ramène en v1', async () => {
    localStorage.setItem('jilu:dataMode:u1', 'v2')
    features.readFeatureFlags.mockResolvedValue({ v2Users: [] })
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.mode).toBe('v1'))
  })

  it('affiche la progression du rattrapage pendant le chargement', async () => {
    features.readFeatureFlags.mockResolvedValue({ v2All: true })
    let finish
    features.ensureCutover.mockImplementation((db, uid, { onProgress }) => new Promise((resolve) => { onProgress('Lecture des données…'); finish = () => resolve({ ok: true }) }))
    const { result } = renderHook(() => useDataMode(user))
    await waitFor(() => expect(result.current.progress).toBe('Lecture des données…'))
    expect(result.current.mode).toBe('loading')
    finish()
    await waitFor(() => expect(result.current.mode).toBe('v2'))
  })
})
