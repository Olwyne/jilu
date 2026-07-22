import { describe, it, expect, vi } from 'vitest'
import { mangadexGetChapterMap } from './mangadex'

describe('mangadexGetChapterMap', () => {
  it('returns chapter-to-volume Map from MangaDex aggregate', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          data: [{ id: 'md-uuid-123' }]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          volumes: {
            '1': { chapters: { '1': {}, '2': {}, '7': {} } },
            '2': { chapters: { '8': {}, '15': {} } },
            'none': { chapters: { '100': {}, '101': {} } }
          }
        })
      })

    const map = await mangadexGetChapterMap('One Piece')
    expect(map.get(1)).toBe(1)
    expect(map.get(2)).toBe(1)
    expect(map.get(7)).toBe(1)
    expect(map.get(8)).toBe(2)
    expect(map.get(15)).toBe(2)
    expect(map.get(100)).toBeNull()
    expect(map.get(101)).toBeNull()
  })

  it('returns empty Map when manga not found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: [] })
    })
    const map = await mangadexGetChapterMap('Unknown Manga XYZ')
    expect(map.size).toBe(0)
  })

  it('returns empty Map on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const map = await mangadexGetChapterMap('One Piece')
    expect(map.size).toBe(0)
  })
})
