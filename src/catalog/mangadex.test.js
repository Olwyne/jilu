import { describe, it, expect, vi } from 'vitest'
import { mangadexGetChapterMap } from './mangadex'

const ok = (body) => Promise.resolve({ json: async () => body })

// Répond selon l'URL appelée (recherche, aggregate, dates des chapitres)
function mockMangadex({ search, aggregate, aggregateJa = aggregate, chapters = { data: [] } }) {
  global.fetch = vi.fn((url) => {
    const u = decodeURIComponent(String(url))
    if (u.includes('/aggregate')) return ok(u.includes('translatedLanguage') ? aggregateJa : aggregate)
    if (u.includes('/chapter')) return ok(chapters)
    return ok(search)
  })
}

describe('mangadexGetChapterMap', () => {
  it('returns chapter-to-volume map from the MangaDex aggregate', async () => {
    mockMangadex({
      search: { data: [{ id: 'md-uuid-123', attributes: { title: { en: 'One Piece' }, lastChapter: '101' } }] },
      aggregate: {
        volumes: {
          '1': { chapters: { '1': { id: 'c1' }, '2': { id: 'c2' }, '7': { id: 'c7' } } },
          '2': { chapters: { '8': { id: 'c8' }, '15': { id: 'c15' } } },
          none: { chapters: { '100': { id: 'c100' }, '101': { id: 'c101' } } },
        },
      },
    })

    const { map, lastChapter } = await mangadexGetChapterMap('One Piece')
    expect(map.get(1)).toBe(1)
    expect(map.get(2)).toBe(1)
    expect(map.get(7)).toBe(1)
    expect(map.get(8)).toBe(2)
    expect(map.get(15)).toBe(2)
    expect(map.get(100)).toBeNull()
    expect(map.get(101)).toBeNull()
    expect(lastChapter).toBe(101)
  })

  it('lets a real volume from the ja aggregate win over "none"', async () => {
    mockMangadex({
      search: { data: [{ id: 'md-uuid-123', attributes: { title: { en: 'X' } } }] },
      aggregate: { volumes: { none: { chapters: { '1': { id: 'c1' } } } } },
      aggregateJa: { volumes: { '1': { chapters: { '1': { id: 'c1' } } } } },
    })
    const { map } = await mangadexGetChapterMap('X')
    expect(map.get(1)).toBe(1)
  })

  it('returns an empty result when the manga is not found', async () => {
    mockMangadex({ search: { data: [] }, aggregate: { volumes: {} } })
    const { map, lastChapter } = await mangadexGetChapterMap('Unknown Manga XYZ')
    expect(map.size).toBe(0)
    expect(lastChapter).toBe(0)
  })

  it('returns an empty result on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const { map } = await mangadexGetChapterMap('One Piece')
    expect(map.size).toBe(0)
  })
})
