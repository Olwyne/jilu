import { describe, it, expect, vi } from 'vitest'
import { googleBooksSearch } from './googleBooks'

describe('googleBooksSearch', () => {
  it('excludes manga items from livres results', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [
        { id: 'b1', volumeInfo: { title: 'Dune', categories: ['Fiction'], publishedDate: '1965' } },
        { id: 'b2', volumeInfo: { title: 'One Piece Vol.1', categories: ['Manga'], publishedDate: '2000' } },
        { id: 'b3', volumeInfo: { title: 'Tower of God', categories: ['Manhwa', 'Action'], publishedDate: '2010' } },
        { id: 'b4', volumeInfo: { title: 'Manhua Test', categories: ['manhua'], publishedDate: '2005' } },
        { id: 'b5', volumeInfo: { title: 'Watchmen', categories: ['Graphic Novel'], publishedDate: '1986' } },
      ] })
    })
    const results = await googleBooksSearch('test')
    const ids = results.map((r) => r.id)
    expect(ids).toContain('googlebooks-b1')
    expect(ids).toContain('googlebooks-b5')
    expect(ids).not.toContain('googlebooks-b2')
    expect(ids).not.toContain('googlebooks-b3')
    expect(ids).not.toContain('googlebooks-b4')
  })

  it('normalizes volumes into Work shape with no seasons', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ items: [
        { id: 'abc123', volumeInfo: { title: 'Dune', authors: ['Frank Herbert'], categories: ['Fiction'], publishedDate: '1965-08-01', description: 'desc' } }
      ] })
    })
    const results = await googleBooksSearch('dune')
    expect(results[0]).toMatchObject({ source: 'googlebooks', id: 'googlebooks-abc123', title: 'Dune', category: 'livres', year: 1965, seasons: null })
  })
})
