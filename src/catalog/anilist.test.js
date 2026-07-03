import { describe, it, expect, vi } from 'vitest'
import { anilistSearch, anilistGetDetail } from './anilist'

describe('anilistSearch', () => {
  it('normalizes AniList media into Work shape', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { Page: { media: [
        { id: 21, title: { romaji: 'One Piece' }, genres: ['Adventure'], startDate: { year: 1999 }, description: 'desc', episodes: 24, status: 'RELEASING' }
      ] } } })
    })
    const results = await anilistSearch('one piece')
    expect(results[0]).toMatchObject({ source: 'anilist', id: 'anilist-21', title: 'One Piece', category: 'animes', year: 1999 })
  })
})

describe('anilistGetDetail', () => {
  it('builds one season with weekly-spaced episodes', async () => {
    const work = { source: 'anilist', id: 'anilist-21', sourceId: 21, category: 'animes', title: 'One Piece' }
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { Media: { episodes: 3, startDate: { year: 2020, month: 1, day: 1 } } } })
    })
    const detailed = await anilistGetDetail(work)
    expect(detailed.seasons[0].episodes).toHaveLength(3)
    expect(detailed.seasons[0].episodes[1].air - detailed.seasons[0].episodes[0].air).toBe(7 * 86400000)
  })
})
