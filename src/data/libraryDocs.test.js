import { describe, it, expect } from 'vitest'
import { buildLibraryDocs, catalogIdFor } from './libraryDocs.js'
import { totalEpisodes, clean } from '../lib/catalogUtils.js'

const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })

const tmdbWork = (over = {}) => ({
  id: 'tmdb-tv-1', source: 'tmdb', sourceId: 1, title: 'Breaking Bad', category: 'series', genre: 'Drame', year: 2008,
  poster: 'p.jpg', titles: { fr: 'Breaking Bad', en: 'Breaking Bad' }, seasons: [season(1, 3)], ended: true,
  status: 'en_cours', added: 111, finishedAt: undefined, refreshedAt: 5, ...over,
})

describe('buildLibraryDocs (œuvre ajoutée)', () => {
  it('sépare la fiche du catalogue (sans champs utilisateur) du document de bibliothèque', () => {
    const { catalog, library } = buildLibraryDocs({
      uid: 'u1', works: { 'tmdb-tv-1': tmdbWork() }, watchedDocs: { 'tmdb-tv-1': { '1-1': 100, '1-2': 200 } },
      main: { favorites: { 'tmdb-tv-1': true }, games: {}, ratings: { 'w:tmdb-tv-1': 5, 's:tmdb-tv-1-1': 4, 'e:tmdb-tv-1-1-2': 3 }, reviews: [{ id: 'tmdb-tv-1', note: 'top', rating: 5, ts: 9 }] },
      now: 42,
    })
    expect(catalog['tmdb-tv-1']).toMatchObject({ title: 'Breaking Bad', seasons: expect.any(Array), updatedAt: 42 })
    expect(catalog['tmdb-tv-1']).not.toHaveProperty('status')
    expect(catalog['tmdb-tv-1']).not.toHaveProperty('added')
    expect(catalog['tmdb-tv-1']).not.toHaveProperty('refreshedAt')
    expect(library['tmdb-tv-1']).toMatchObject({
      catalogId: 'tmdb-tv-1', title: 'Breaking Bad', poster: 'p.jpg', category: 'series', year: 2008,
      status: 'en_cours', added: 111, favorite: true, watchedCount: 2,
      eps: { '1-1': 100, '1-2': 200 },
      ratings: { w: 5, 's:1': 4, 'e:1-2': 3 },
      personalReview: { id: 'tmdb-tv-1', note: 'top', rating: 5, ts: 9 },
    })
    expect(library['tmdb-tv-1']).not.toHaveProperty('seasons')
  })

  it('met une œuvre sans sourceId dans un catalogue local à l’utilisateur', () => {
    const local = { id: 'ma-serie', source: 'tmdb', sourceId: undefined, title: 'Ma série', category: 'series', seasons: [season(1, 2)], status: 'termine', added: 1 }
    const { catalog, library } = buildLibraryDocs({ uid: 'u1', works: { 'ma-serie': local } })
    expect(Object.keys(catalog)).toEqual(['local-u1-ma-serie'])
    expect(library['ma-serie'].catalogId).toBe('local-u1-ma-serie')
  })


  it('fonctionne sans document users (main absent) et sans progression', () => {
    const { library } = buildLibraryDocs({ uid: 'u1', works: { 'tmdb-tv-1': tmdbWork() } })
    expect(library['tmdb-tv-1']).toMatchObject({ eps: {}, watchedCount: 0 })
    expect(library['tmdb-tv-1']).not.toHaveProperty('favorite')
  })

  it('rattache les notes à l’œuvre dont l’id est le plus long préfixe (ids de type slug)', () => {
    const works = { 'my-show': tmdbWork({ id: 'my-show', sourceId: undefined }), 'my-show-2': tmdbWork({ id: 'my-show-2', sourceId: undefined }) }
    const { library } = buildLibraryDocs({ uid: 'u', works, main: { ratings: { 'e:my-show-2-1-3': 4, 'e:my-show-1-3': 2, 'w:my-show-2': 5 } } })
    expect(library['my-show-2'].ratings).toEqual({ 'e:1-3': 4, w: 5 })
    expect(library['my-show'].ratings).toEqual({ 'e:1-3': 2 })
  })


  it('ne modifie pas les valeurs de progression (même les anciens booléens `true`)', () => {
    const { library } = buildLibraryDocs({ uid: 'u', works: { 'tmdb-tv-1': tmdbWork() }, watchedDocs: { 'tmdb-tv-1': { '1-1': true, '1-2': 0 } } })
    expect(library['tmdb-tv-1'].eps).toEqual({ '1-1': true, '1-2': 0 })
    expect(library['tmdb-tv-1'].watchedCount).toBe(1)
  })

  it('ne produit jamais de valeur undefined (refusée par Firestore) et garde Infinity', () => {
    const { catalog, library } = buildLibraryDocs({ uid: 'u', works: { 'tmdb-tv-1': tmdbWork({ overview: undefined }) } })
    const hasUndefined = (v) => v === undefined || (v && typeof v === 'object' && Object.values(v).some(hasUndefined))
    expect(hasUndefined(catalog['tmdb-tv-1'])).toBe(false)
    expect(hasUndefined(library['tmdb-tv-1'])).toBe(false)
    expect(catalog['tmdb-tv-1'].seasons[0].episodes[0].air).toBe(Infinity)
  })
})

describe('catalogIdFor / helpers', () => {
  it('compte les épisodes et fabrique les ids de catalogue', () => {
    expect(totalEpisodes({ seasons: [season(1, 2), season(2, 3)] })).toBe(5)
    expect(totalEpisodes({ seasons: null })).toBe(0)
    expect(catalogIdFor('u', { id: 'a', source: 'tmdb', sourceId: 5 })).toBe('a')
    expect(catalogIdFor('u', { id: 'a', source: 'tmdb' })).toBe('local-u-a')
  })
  it('clean remplace undefined et retire les clés vides', () => {
    expect(clean({ a: undefined, b: [1, undefined], c: { d: undefined, e: 1 } })).toEqual({ b: [1, null], c: { e: 1 } })
  })
})
