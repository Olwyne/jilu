import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useAppData } from './useAppData'

const callbacks = []
const setDocMock = vi.fn().mockResolvedValue()

vi.mock('../firebase', () => ({ db: {} }))
vi.mock('firebase/firestore', () => ({
  doc: (...args) => args,
  collection: (...args) => ({ _type: 'collection', args }),
  onSnapshot: (ref, onNext, onError) => {
    callbacks.push({ onNext, onError })
    return () => {}
  },
  setDoc: (...args) => setDocMock(...args),
  getDoc: vi.fn(),
  writeBatch: vi.fn(() => ({ set: vi.fn(), delete: vi.fn(), commit: vi.fn().mockResolvedValue() })),
  deleteField: vi.fn()
}))

function fireAllSnapshots() {
  callbacks[0].onNext({ exists: () => false, data: () => ({}) })
  callbacks[1].onNext({ forEach: () => {} })
  callbacks[2].onNext({ forEach: () => {} })
}

describe('useAppData', () => {
  beforeEach(() => {
    callbacks.length = 0
    setDocMock.mockClear()
  })

  it('defaults to empty collections when the doc does not exist yet', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    act(() => { fireAllSnapshots() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.data.works).toEqual({})
    expect(result.current.data.watched).toEqual({})
  })

  it('mutate() updates watched state optimistically', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    act(() => { fireAllSnapshots() })
    await waitFor(() => expect(result.current.loading).toBe(false))
    await act(async () => { await result.current.mutate({ watched: { 'w-1-1': true } }) })
    expect(result.current.data.watched).toEqual({ 'w-1-1': true })
  })

  it('sets loading to false and error when onSnapshot error callback fires', async () => {
    const { result } = renderHook(() => useAppData({ uid: 'u1' }))
    const testError = new Error('permission-denied')
    act(() => { callbacks[0].onError(testError) })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.error).toBe(testError)
  })
})
