import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppData } from './useAppData'

let snapshotCallback
let errorCallback
const setDocMock = vi.fn().mockResolvedValue()

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  onSnapshot: (ref, onNext, onError) => { snapshotCallback = onNext; errorCallback = onError; return () => {} },
  setDoc: (...args) => setDocMock(...args),
  getDoc: vi.fn()
}))

describe('useAppData', () => {
  beforeEach(() => { setDocMock.mockClear() })

  it('defaults to empty collections when the doc does not exist yet', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    act(() => { snapshotCallback({ exists: () => false }) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.works).toEqual({})
    expect(result.current.data.watched).toEqual({})
  })

  it('mutate() calls setDoc with a merged patch', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    act(() => { snapshotCallback({ exists: () => false }) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.mutate({ watched: { 'w-1-1': true } }) })
    expect(setDocMock).toHaveBeenCalled()
    const patchArg = setDocMock.mock.calls[0][1]
    expect(patchArg.watched).toEqual({ 'w-1-1': true })
  })

  it('sets loading to false and error when onSnapshot error callback fires', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    const testError = new Error('permission-denied')
    act(() => { errorCallback(testError) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(testError)
  })
})
