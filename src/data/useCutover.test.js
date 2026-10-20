import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'

vi.mock('../firebase', () => ({ db: {} }))
const cutover = vi.hoisted(() => ({ ensureCutover: vi.fn() }))
vi.mock('./cutover.js', () => cutover)

import { useCutover } from './useCutover.js'

const user = { uid: 'u1' }
beforeEach(() => { localStorage.clear(); vi.clearAllMocks(); vi.spyOn(console, 'error').mockImplementation(() => {}) })

describe('useCutover', () => {
  it('prêt immédiatement, sans réseau, si le compte a déjà été préparé sur cet appareil', () => {
    localStorage.setItem('jilu:cutover:u1', '1')
    const { result } = renderHook(() => useCutover(user))
    expect(result.current.status).toBe('ready')
    expect(cutover.ensureCutover).not.toHaveBeenCalled()
  })

  it('prépare le compte à la première ouverture, affiche la progression, puis mémorise', async () => {
    let finish
    cutover.ensureCutover.mockImplementation((db, uid, { onProgress }) => new Promise((resolve) => { onProgress('Lecture des données…'); finish = () => resolve({ ok: true }) }))
    const { result } = renderHook(() => useCutover(user))
    expect(result.current.status).toBe('checking')
    await waitFor(() => expect(result.current.progress).toBe('Lecture des données…'))
    finish()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(localStorage.getItem('jilu:cutover:u1')).toBe('1')
  })

  it('en cas d’échec du contrôle : erreur (rien n’est perdu) et possibilité de réessayer', async () => {
    cutover.ensureCutover.mockResolvedValueOnce({ ok: false, verification: { missing: ['x'] } })
    const { result } = renderHook(() => useCutover(user))
    await waitFor(() => expect(result.current.status).toBe('error'))
    expect(localStorage.getItem('jilu:cutover:u1')).toBeNull()
    cutover.ensureCutover.mockResolvedValueOnce({ ok: true })
    act(() => result.current.retry())
    await waitFor(() => expect(result.current.status).toBe('ready'))
  })

  it('une panne réseau donne aussi une erreur avec réessai', async () => {
    cutover.ensureCutover.mockRejectedValueOnce(new Error('offline'))
    const { result } = renderHook(() => useCutover(user))
    await waitFor(() => expect(result.current.status).toBe('error'))
  })
})
