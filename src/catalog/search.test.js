import { describe, it, expect, vi } from 'vitest'
import { searchCatalog } from './search'

vi.mock('./tmdb', () => ({ tmdbSearch: vi.fn(), tmdbTrending: vi.fn() }))
vi.mock('./anilist', () => ({ anilistSearch: vi.fn(), anilistTrending: vi.fn() }))
vi.mock('./googleBooks', () => ({ googleBooksSearch: vi.fn(), googleBooksTrending: vi.fn() }))
vi.mock('./rawg', () => ({ rawgSearch: vi.fn(), rawgTrending: vi.fn() }))
vi.mock('./spotify', () => ({ spotifySearch: vi.fn() }))

import { tmdbSearch } from './tmdb'
import { anilistSearch } from './anilist'
import { googleBooksSearch } from './googleBooks'
import { rawgSearch } from './rawg'
import { spotifySearch } from './spotify'

describe('searchCatalog', () => {
  it('merges results from all five sources', async () => {
    tmdbSearch.mockResolvedValue([{ id: 't1', title: 'T' }])
    anilistSearch.mockResolvedValue([{ id: 'a1', title: 'A' }])
    googleBooksSearch.mockResolvedValue([{ id: 'b1', title: 'B' }])
    rawgSearch.mockResolvedValue([{ id: 'g1', title: 'G' }])
    spotifySearch.mockResolvedValue([{ id: 's1', title: 'S' }])
    const results = await searchCatalog('x')
    expect(results.map((r) => r.id).sort()).toEqual(['a1', 'b1', 'g1', 's1', 't1'])
  })

  it('drops a source that throws instead of failing the whole search', async () => {
    tmdbSearch.mockRejectedValue(new Error('down'))
    anilistSearch.mockResolvedValue([{ id: 'a1', title: 'A' }])
    googleBooksSearch.mockResolvedValue([])
    rawgSearch.mockResolvedValue([])
    spotifySearch.mockResolvedValue([])
    const results = await searchCatalog('x')
    expect(results).toEqual([{ id: 'a1', title: 'A' }])
  })
})
