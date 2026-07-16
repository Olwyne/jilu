import { describe, it, expect, vi } from 'vitest'
import { anilistSearch, anilistFindId, anilistGetDetail } from './anilist'

describe('anilistSearch', () => {
  it('normalizes AniList media into Work shape', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { Page: { media: [
        { id: 21, title: { romaji: 'One Piece' }, genres: ['Adventure'], startDate: { year: 1999 }, description: 'desc', episodes: 24, status: 'RELEASING', coverImage: { large: null } }
      ] } } })
    })
    const results = await anilistSearch('one piece')
    expect(results[0]).toMatchObject({ source: 'anilist', id: 'anilist-21', title: 'One Piece', category: 'animes', year: 1999 })
  })
})

describe('anilistFindId', () => {
  it('returns AniList ID matched by title and year', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 163134, startDate: { year: 2022 } }] } } })
    })
    const id = await anilistFindId('Blue Lock', 2022)
    expect(id).toBe(163134)
  })

  it('returns null when result list is empty', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [] } } })
    })
    const id = await anilistFindId('Nonexistent Anime', 2023)
    expect(id).toBeNull()
  })

  it('returns null when best result year is more than 1 year off', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 999, startDate: { year: 2018 } }] } } })
    })
    const id = await anilistFindId('Something', 2023)
    expect(id).toBeNull()
  })

  it('returns first result when year is null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 42, startDate: { year: 2020 } }] } } })
    })
    const id = await anilistFindId('Some Anime', null)
    expect(id).toBe(42)
  })
})

describe('anilistGetDetail', () => {
  it('returns 1 season for single entry with no SEQUEL', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        episodes: 3, status: 'FINISHED',
        startDate: { year: 2020, month: 1, day: 1 },
        relations: { edges: [] }
      } } })
    })
    const detail = await anilistGetDetail(21)
    expect(detail.seasons).toHaveLength(1)
    expect(detail.seasons[0].n).toBe(1)
    expect(detail.seasons[0].episodes).toHaveLength(3)
    expect(detail.seasons[0].episodes[1].air - detail.seasons[0].episodes[0].air).toBe(7 * 86400000)
    expect(detail.ended).toBe(true)
  })

  it('follows SEQUEL chain and returns multiple seasons', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 24, status: 'FINISHED',
          startDate: { year: 2022, month: 10, day: 8 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 200 } }] }
        } } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 13, status: 'RELEASING',
          startDate: { year: 2024, month: 4, day: 6 },
          relations: { edges: [] }
        } } })
      })
    const detail = await anilistGetDetail(163134)
    expect(detail.seasons).toHaveLength(2)
    expect(detail.seasons[0]).toMatchObject({ n: 1, episodes: expect.arrayContaining([expect.objectContaining({ n: 1 })]) })
    expect(detail.seasons[1]).toMatchObject({ n: 2 })
    expect(detail.seasons[0].episodes).toHaveLength(24)
    expect(detail.seasons[1].episodes).toHaveLength(13)
    expect(detail.ended).toBe(false)
  })

  it('stops at cycle to prevent infinite loop', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 1, status: 'FINISHED',
          startDate: { year: 2020, month: 1, day: 1 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 101 } }] }
        } } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 1, status: 'FINISHED',
          startDate: { year: 2021, month: 1, day: 1 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 100 } }] }
        } } })
      })
    const detail = await anilistGetDetail(100)
    expect(detail.seasons).toHaveLength(2)
  })

  it('ignores non-SEQUEL relation edges', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        episodes: 12, status: 'FINISHED',
        startDate: { year: 2021, month: 4, day: 1 },
        relations: { edges: [
          { relationType: 'PREQUEL', node: { id: 50 } },
          { relationType: 'SIDE_STORY', node: { id: 51 } }
        ] }
      } } })
    })
    const detail = await anilistGetDetail(99)
    expect(detail.seasons).toHaveLength(1)
  })
})
