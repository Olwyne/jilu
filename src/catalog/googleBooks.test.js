import { describe, it, expect, vi } from 'vitest'
import { googleBooksSearch } from './googleBooks'

describe('googleBooksSearch', () => {
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
