import { describe, it, expect, vi } from 'vitest'
import { rawgSearch } from './rawg'

describe('rawgSearch', () => {
  it('normalizes RAWG results into Work shape', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ results: [
        { id: 3498, name: 'Elden Ring', genres: [{ name: 'RPG' }], released: '2022-02-25' }
      ] })
    })
    const results = await rawgSearch('elden ring')
    expect(results[0]).toMatchObject({ source: 'rawg', id: 'rawg-3498', title: 'Elden Ring', category: 'jeux', year: 2022, seasons: null })
  })
})
