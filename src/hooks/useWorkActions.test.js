import { describe, it, expect, vi } from 'vitest'
import { useWorkActions } from './useWorkActions'
import { renderHook, act } from '@testing-library/react'
import * as tmdb from '../catalog/tmdb'

describe('useWorkActions', () => {
  it('toggleEpisode marks episode and updates status atomically', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({
      watched: { 'w1-1-1': expect.any(Number) },
      works: expect.objectContaining({ w1: expect.objectContaining({ status: 'en_cours' }) })
    })
  })

  it('toggleEpisode un-marks and status reverts to a_voir when nothing left watched', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: { 'w1-1-1': 123 } }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({
      watched: {},
      works: expect.objectContaining({ w1: expect.objectContaining({ status: 'a_voir' }) })
    })
  })

  it('setRating toggles off when clicking the same value again', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {}, watched: {}, ratings: { 'w:w1': 4 }, reviews: [] }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.setRating('w', 'w1', 4) })
    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ ratings: { 'w:w1': 0 } }))
  })

  it('setStatus updates the work status directly', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'a_voir' } } }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.setStatus('w1', 'abandonne') })
    expect(mutate.mock.calls[0][0].works.w1.status).toBe('abandonne')
  })

  it('addWork fetches full detail before storing, keyed by search result id', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: {} }
    vi.spyOn(tmdb, 'tmdbGetDetail').mockResolvedValue({ id: 'tmdb-tv-1', title: 'X', seasons: [] })
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-1', title: 'X' }) })
    expect(mutate.mock.calls[0][0].works['tmdb-tv-1']).toMatchObject({ title: 'X', status: 'a_voir' })
  })
})
