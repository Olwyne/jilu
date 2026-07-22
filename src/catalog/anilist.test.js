import { describe, it, expect, vi } from 'vitest'
import { anilistSearch, anilistFindId, anilistGetDetail, anilistSearchManga, anilistTrendingManga, anilistGetMangaDetail } from './anilist'

vi.mock('./mangadex', () => ({
  mangadexGetChapterMap: vi.fn()
}))
import { mangadexGetChapterMap } from './mangadex'

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

describe('anilistSearchManga', () => {
  it('normalizes AniList manga into Work shape with category mangas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [
        { id: 13, title: { romaji: 'One Piece' }, genres: ['Adventure'], startDate: { year: 1997 }, description: 'desc', coverImage: { large: 'http://img.co/op.jpg' } }
      ] } } })
    })
    const results = await anilistSearchManga('one piece')
    expect(results[0]).toMatchObject({
      source: 'anilist-manga',
      id: 'anilist-manga-13',
      title: 'One Piece',
      category: 'mangas',
      year: 1997,
      seasons: null,
    })
  })
})

describe('anilistTrendingManga', () => {
  it('returns up to 5 trending manga with category mangas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [
        { id: 1, title: { romaji: 'Berserk' }, genres: ['Dark Fantasy'], startDate: { year: 1989 }, description: '', coverImage: { large: null } }
      ] } } })
    })
    const results = await anilistTrendingManga()
    expect(results[0]).toMatchObject({ category: 'mangas', source: 'anilist-manga', id: 'anilist-manga-1' })
  })
})

describe('anilistGetMangaDetail', () => {
  it('builds seasons with Scans tome first, then numbered volumes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 5, volumes: 2, status: 'RELEASING', title: { romaji: 'Test Manga' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([
      [1, 1], [2, 1],   // volume 1
      [3, 2], [4, 2],   // volume 2
      // chapter 5 → no volume (scan)
    ]))

    const result = await anilistGetMangaDetail(999)
    expect(result.ended).toBe(false)
    expect(result.chapters).toBe(5)
    expect(result.volumes).toBe(2)

    const scans = result.seasons.find((s) => s.n === 0)
    expect(scans.name).toBe('Scans')
    expect(scans.episodes).toHaveLength(1)
    expect(scans.episodes[0]).toMatchObject({ n: 5, title: '', air: 1 })

    const vol1 = result.seasons.find((s) => s.n === 1)
    expect(vol1.name).toBe('Tome 1')
    expect(vol1.episodes).toHaveLength(2)
    expect(vol1.episodes[0]).toMatchObject({ n: 1, title: '', air: 1 })

    const vol2 = result.seasons.find((s) => s.n === 2)
    expect(vol2.name).toBe('Tome 2')
    expect(vol2.episodes).toHaveLength(2)

    // Scans tome must be first
    expect(result.seasons[0].n).toBe(0)
  })

  it('sets ended=true when status is FINISHED', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 1, volumes: 1, status: 'FINISHED', title: { romaji: 'Finished Manga' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([[1, 1]]))
    const result = await anilistGetMangaDetail(1)
    expect(result.ended).toBe(true)
  })

  it('omits Scans tome when all chapters are in volumes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 3, volumes: 1, status: 'FINISHED', title: { romaji: 'Complete' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([[1, 1], [2, 1], [3, 1]]))
    const result = await anilistGetMangaDetail(2)
    expect(result.seasons.find((s) => s.n === 0)).toBeUndefined()
    expect(result.seasons).toHaveLength(1)
  })

  it('returns empty seasons when AniList returns no media', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: null } })
    })
    const result = await anilistGetMangaDetail(0)
    expect(result).toMatchObject({ seasons: [], ended: false, chapters: 0, volumes: 0 })
  })
})
