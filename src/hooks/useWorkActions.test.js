import { describe, it, expect, vi } from 'vitest'
import { useWorkActions } from './useWorkActions'
import { renderHook, act } from '@testing-library/react'
import * as tmdb from '../catalog/tmdb'

describe('useWorkActions', () => {
  it('toggleEpisode flips a watched key and persists it', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', status: 'a_voir', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: {} }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({ watched: { 'w1-1-1': expect.any(Number) } })
  })

  it('toggleEpisode un-marks an already-watched episode', async () => {
    const mutate = vi.fn().mockResolvedValue()
    const data = { works: { w1: { id: 'w1', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }] } }, watched: { 'w1-1-1': true } }
    const { result } = renderHook(() => useWorkActions(data, mutate))
    await act(async () => { await result.current.toggleEpisode('w1', 1, 1) })
    expect(mutate).toHaveBeenCalledWith({ watched: {} })
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
