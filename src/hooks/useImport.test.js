import { describe, it, expect } from 'vitest'
import { importOps } from './useImport'

describe('importOps : ce qu’un import ajoute, sans rien réécrire d’autre', () => {
  it('œuvres nouvelles complètes ; œuvres existantes : seulement les épisodes, notes, favoris et statuts nouveaux', () => {
    const data = {
      works: { old: { id: 'old', status: 'a_voir' } },
      watched: { 'old-1-1': 5 },
      ratings: { 'w:old': 3 },
      favorites: {},
    }
    const ops = importOps(data, {
      works: { old: { id: 'old', status: 'en_cours' }, 'new-show': { id: 'new-show', title: 'N' } },
      watched: { 'old-1-1': 5, 'old-1-2': 6, 'new-show-1-1': 7 },
      ratings: { 'w:old': 3, 's:old-1': 4, 'w:new-show': 5 },
      favorites: { old: true, 'new-show': true },
    })
    expect(ops.add).toEqual({ 'new-show': { id: 'new-show', title: 'N' } })
    expect(ops.set).toEqual({ old: { status: 'en_cours', 'eps.1-2': 6, 'ratings.s:1': 4, favorite: true } })
    expect(ops.extras).toEqual({
      watchedDocs: { 'new-show': { '1-1': 7 } },
      main: { ratings: { 'w:new-show': 5 }, favorites: { 'new-show': true } },
    })
  })
})
