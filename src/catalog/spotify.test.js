import { describe, it, expect, vi, beforeEach } from 'vitest'
import { spotifySearch, spotifyGetWork } from './spotify'

beforeEach(() => {
  global.fetch = vi.fn((url) => {
    if (url === '/api/spotify-token') return Promise.resolve({ ok: true, json: async () => ({ access_token: 'tok' }) })
    if (String(url).includes('/search')) return Promise.resolve({
      ok: true, json: async () => ({ artists: { items: [{ id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk', genres: ['electro'] }] } })
    })
    if (String(url).endsWith('/artists/4tZwfgrHOc3mvqYlEYSvVi')) return Promise.resolve({
      ok: true, json: async () => ({ id: '4tZwfgrHOc3mvqYlEYSvVi', name: 'Daft Punk', genres: ['french house'], images: [{ url: 'https://i.scdn.co/a.jpg' }] })
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

describe('spotifyGetWork', () => {
  it('fiche complète : artiste, albums comme saisons, titres comme épisodes', async () => {
    const w = await spotifyGetWork('4tZwfgrHOc3mvqYlEYSvVi')
    expect(w).toMatchObject({ source: 'spotify', id: 'spotify-4tZwfgrHOc3mvqYlEYSvVi', title: 'Daft Punk', genre: 'french house', poster: 'https://i.scdn.co/a.jpg', category: 'musique' })
    expect(w.seasons[0].name).toBe('Discovery')
    expect(w.seasons[0].episodes[0]).toMatchObject({ n: 1, title: 'One More Time' })
  })
})
