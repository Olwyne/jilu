import { describe, it, expect } from 'vitest'
import { assembleData, catalogIdsNeededAtStartup } from './assemble.js'
import { buildUserMigration } from '../lib/migration.js'

const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 + i })) })

// Données « ancien modèle » représentatives (série, anime multi-saisons, film, œuvre locale, jeu, progression orpheline)
const v1 = {
  uid: 'u1',
  works: {
    'tmdb-tv-1': { id: 'tmdb-tv-1', source: 'tmdb', sourceId: 1, tmdbId: '1', title: 'Breaking Bad', titles: { fr: 'Breaking Bad', en: 'Breaking Bad' }, posters: { fr: 'a.jpg', en: 'b.jpg' }, poster: 'a.jpg', category: 'series', genre: 'Drame', year: 2008, overview: 'x', seasons: [season(1, 7), season(2, 13)], ended: true, status: 'termine', added: 100, finishedAt: 900, refreshedAt: 5 },
    'anilist-20': { id: 'anilist-20', source: 'anilist', sourceId: 20, title: 'Naruto', category: 'animes', genre: 'Action', year: 2002, seasons: [season(1, 3)], ended: false, status: 'en_cours', added: 200, anilistId: 20 },
    'tmdb-movie-3': { id: 'tmdb-movie-3', source: 'tmdb', sourceId: 3, title: 'Film', category: 'films', seasons: null, status: 'termine', added: 300, release: 1700000000000 },
    'ma-serie': { id: 'ma-serie', source: 'tmdb', title: 'Ma série', category: 'series', seasons: [season(1, 2)], status: 'a_voir', added: 400 },
    'rawg-9': { id: 'rawg-9', source: 'rawg', sourceId: 9, title: 'Jeu', category: 'jeux', seasons: null, status: 'en_cours', added: 500 },
  },
  watchedDocs: {
    'tmdb-tv-1': { '1-1': 111, '1-2': 222, '2-1': 333 },
    'anilist-20': { '1-1': 444 },
    'disparue': { '1-1': 555 },
  },
  main: {
    ratings: { 'w:tmdb-tv-1': 5, 's:tmdb-tv-1-1': 4, 'e:tmdb-tv-1-2-1': 3, 'w:anilist-20': 2 },
    favorites: { 'tmdb-tv-1': true },
    games: { 'rawg-9': { minutes: 120, done: { platine: true } } },
    reviews: [{ id: 'tmdb-tv-1', note: 'top', rating: 5, ts: 20 }, { id: 'anilist-20', note: '', rating: 2, ts: 10 }],
  },
}

describe('assembleData : aller-retour ancien modèle → v2 → reconstitué', () => {
  const { catalog, library } = buildUserMigration(v1)
  const data = assembleData({ library, catalog })

  it('redonne exactement les mêmes œuvres (champs utilisateur compris), sans les champs internes', () => {
    const expectedWorks = Object.fromEntries(Object.entries(v1.works).map(([id, { refreshedAt, ...w }]) => [id, w]))
    expect(data.works).toEqual(expectedWorks)
    expect(data.works['tmdb-tv-1']).not.toHaveProperty('updatedAt')
    expect(data.works['tmdb-tv-1'].seasons[0].episodes[0].air).toBe(Infinity)
  })

  it('redonne la même progression, y compris celle d’une œuvre disparue', () => {
    expect(data.watched).toEqual({
      'tmdb-tv-1-1-1': 111, 'tmdb-tv-1-1-2': 222, 'tmdb-tv-1-2-1': 333,
      'anilist-20-1-1': 444, 'disparue-1-1': 555,
    })
  })

  it('redonne les mêmes notes, favoris, jeux et avis personnels (ordre décroissant)', () => {
    expect(data.ratings).toEqual(v1.main.ratings)
    expect(data.favorites).toEqual(v1.main.favorites)
    expect(data.games).toEqual(v1.main.games)
    expect(data.reviews).toEqual(v1.main.reviews)
  })

  it('n’affiche pas l’œuvre disparue mais garde sa progression', () => {
    expect(data.works).not.toHaveProperty('disparue')
  })
})

describe('assembleData : cas limites', () => {
  const { catalog, library } = buildUserMigration(v1)

  it('affiche la liste avec le résumé quand le catalogue n’est pas encore chargé', () => {
    const data = assembleData({ library, catalog: {} })
    expect(data.works['tmdb-tv-1']).toMatchObject({ id: 'tmdb-tv-1', title: 'Breaking Bad', poster: 'a.jpg', category: 'series', status: 'termine', added: 100, finishedAt: 900 })
    expect(data.works['tmdb-tv-1'].seasons).toBeUndefined()
    expect(data.watched['tmdb-tv-1-1-1']).toBe(111) // la progression ne dépend pas du catalogue
  })

  it('ignore les suppressions douces', () => {
    const data = assembleData({ library: { ...library, 'anilist-20': { ...library['anilist-20'], deleted: true } }, catalog })
    expect(data.works).not.toHaveProperty('anilist-20')
    expect(data.watched).not.toHaveProperty('anilist-20-1-1')
  })

  it('une bibliothèque vide donne des structures vides', () => {
    expect(assembleData({})).toEqual({ works: {}, watched: {}, ratings: {}, favorites: {}, games: {}, reviews: [] })
  })

  it('désigne le catalogue à charger dès le démarrage : œuvres en cours ou à voir seulement', () => {
    expect(catalogIdsNeededAtStartup(library).sort()).toEqual(['anilist-20', 'local-u1-ma-serie', 'rawg-9'])
  })
})
