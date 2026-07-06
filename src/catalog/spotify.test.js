import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spotifySearch, spotifyGetDetail } from './spotify'

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url === '/api/spotify-token') return Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok' }) })
    if (String(url).includes('/search')) return Promise.resolve({
      ok: true, json: async () => ({ artists: { items: [{ id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk', genres: ['electro'] }] } })
    })
    if (String(url).includes('/tracks')) return Promise.resolve({
      ok: true, json: async () => ({ items: [{ track_number: 1, name: 'One More Time' }] })
    })
    if (String(url).includes('/albums')) return Promise.resolve({
      ok: true, json: async () => ({ items: [{ id: 'alb1', name: 'Discovery', release_date: '2001-03-12' }] })
    })
    return Promise.reject(new Error('unexpected url ' + url))
  })
})

describe('spotifySearch', () => {
  it('normalizes artist results into Work shape', async () => {
    const results = await spotifySearch('daft punk')
    expect(results[0]).toMatchObject({ source: 'spotify', id: 'spotify-4tZwfgrHOc3mvqYlEYSvVi', title: 'Daft Punk', category: 'musique' })
  })
})

describe('spotifyGetDetail', () => {
  it('builds seasons from albums and episodes from tracks', async () => {
    const work = { source: 'spotify', id: 'spotify-4tZwfgrHOc3mvqYlEYSvVi', sourceId: '4tZwfgrHOc3mvqYlEYSvVi', category: 'musique', title: 'Daft Punk' }
    const detailed = await spotifyGetDetail(work)
    expect(detailed.seasons[0].name).toBe('Discovery')
    expect(detailed.seasons[0].episodes[0]).toMatchObject({ n: 1, title: 'One More Time' })
  })
})
