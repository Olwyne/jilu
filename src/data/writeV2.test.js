import { describe, it, expect } from 'vitest'
import { planV2Writes, applyPlanToLibrary, nestForFirestore, isEmptyPlan, DELETE } from './writeV2.js'
import { assembleData } from './assemble.js'
import { buildUserMigration } from '../lib/migration.js'

const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const W = (id, over = {}) => ({ id, source: 'tmdb', sourceId: 1, title: `T ${id}`, category: 'series', seasons: [season(1, 3)], status: 'en_cours', added: 1, ...over })

const base = () => ({
  works: { a: W('a'), b: W('b', { status: 'a_voir' }) },
  watched: { 'a-1-1': 10 },
  ratings: { 'w:a': 4 },
  favorites: {},
  games: {},
  reviews: [],
})
const NOW = 5000
const plan = (patch, prev = base()) => planV2Writes({ uid: 'u', prev, patch, now: NOW })
const count = (p) => Object.keys(p.libraryCreates).length + Object.keys(p.patches).length + p.removes.length

describe('planV2Writes : une action = une écriture par document touché', () => {
  it('cocher un épisode : 1 écriture ciblée (épisode, compteur, statut dans le même document)', () => {
    const p = plan({ watched: { 'a-1-1': 10, 'a-1-2': 20 }, works: { ...base().works, a: W('a', { status: 'termine', finishedAt: 99 }) } })
    expect(count(p)).toBe(1)
    expect(p.patches.a).toEqual({ 'eps.1-2': 20, watchedCount: 2, status: 'termine', finishedAt: 99, updatedAt: NOW })
    expect(p.catalogCreates).toEqual({})
  })
  it('décocher : supprime la clé de l’épisode et recompte', () => {
    const p = plan({ watched: {} })
    expect(p.patches.a).toEqual({ 'eps.1-1': DELETE, watchedCount: 0, updatedAt: NOW })
  })
  it('marquer une saison de 20 épisodes : toujours 1 écriture', () => {
    const watched = Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`a-1-${i + 1}`, 100 + i]))
    const p = plan({ watched })
    expect(count(p)).toBe(1)
    expect(p.patches.a.watchedCount).toBe(20)
  })
  it('noter une œuvre / une saison / un épisode', () => {
    const p = plan({ ratings: { 'w:a': 5, 's:a-1': 3, 'e:a-1-2': 4 } })
    expect(p.patches.a).toMatchObject({ 'ratings.w': 5, 'ratings.s:1': 3, 'ratings.e:1-2': 4 })
    expect(count(p)).toBe(1)
  })
  it('favori, jeu, avis personnel', () => {
    const p = plan({ favorites: { b: true }, games: { b: { minutes: 30 } }, reviews: [{ id: 'b', note: 'ok', rating: 3, ts: 1 }] })
    expect(p.patches.b).toMatchObject({ favorite: true, game: { minutes: 30 }, personalReview: { id: 'b', note: 'ok', rating: 3, ts: 1 } })
    expect(count(p)).toBe(1)
    expect(plan({ favorites: {} }, { ...base(), favorites: { b: true } }).patches.b.favorite).toBe(DELETE)
  })
  it('changer le statut ne touche que ce document', () => {
    const p = plan({ works: { ...base().works, b: W('b', { status: 'abandonne' }) } })
    expect(p.patches).toEqual({ b: { status: 'abandonne', updatedAt: NOW } })
  })
  it('ne fait rien quand rien ne change (et ignore les champs du catalogue)', () => {
    expect(isEmptyPlan(plan({ watched: { 'a-1-1': 10 }, ratings: { 'w:a': 4 } }))).toBe(true)
    const refreshed = { ...base().works, a: W('a', { seasons: [season(1, 9)], overview: 'nouveau' }) }
    expect(isEmptyPlan(plan({ works: refreshed }))).toBe(true) // rafraîchir le catalogue n'est pas le rôle du client
  })
  it('ajouter une œuvre : document de bibliothèque + fiche de catalogue, progression incluse', () => {
    const prev = base()
    const p = plan({ works: { ...prev.works, c: W('c', { sourceId: 7 }) }, watched: { ...prev.watched, 'c-1-1': 55 }, favorites: { c: true } }, prev)
    expect(Object.keys(p.libraryCreates)).toEqual(['c'])
    expect(p.libraryCreates.c).toMatchObject({ catalogId: 'c', title: 'T c', status: 'en_cours', favorite: true, eps: { '1-1': 55 }, watchedCount: 1, updatedAt: NOW })
    expect(p.catalogCreates.c).toMatchObject({ title: 'T c', seasons: expect.any(Array) })
    expect(p.catalogCreates.c).not.toHaveProperty('status')
    expect(p.patches).toEqual({})
  })
  it('ajouter une œuvre locale (sans sourceId) : catalogue local à l’utilisateur', () => {
    const prev = base()
    const { sourceId, ...local } = W('loc')
    const p = plan({ works: { ...prev.works, loc: local } }, prev)
    expect(p.libraryCreates.loc.catalogId).toBe('local-u-loc')
    expect(Object.keys(p.catalogCreates)).toEqual(['local-u-loc'])
  })
  it('retirer une œuvre (et ses données) : suppression douce, sans écriture parasite', () => {
    const prev = { ...base(), favorites: { a: true } }
    const p = plan({ works: { b: prev.works.b }, watched: {}, ratings: {}, favorites: {} }, prev)
    expect(p.removes).toEqual(['a'])
    expect(p.patches).toEqual({})
    expect(count(p)).toBe(1)
  })
  it('tout effacer : une suppression douce par œuvre', () => {
    const p = plan({ works: {}, watched: {}, ratings: {}, reviews: [], games: {}, favorites: {} })
    expect(p.removes.sort()).toEqual(['a', 'b'])
  })
  it('un identifiant d’œuvre contenant des tirets reste correctement rattaché', () => {
    const prev = { works: { 'tmdb-tv-12': W('tmdb-tv-12'), 'tmdb-tv-1': W('tmdb-tv-1') }, watched: {}, ratings: {}, favorites: {}, games: {}, reviews: [] }
    const p = plan({ watched: { 'tmdb-tv-12-2-5': 9 }, ratings: { 'e:tmdb-tv-1-1-3': 2 } }, prev)
    expect(p.patches['tmdb-tv-12']).toMatchObject({ 'eps.2-5': 9, watchedCount: 1 })
    expect(p.patches['tmdb-tv-1']).toMatchObject({ 'ratings.e:1-3': 2 })
  })
})

describe('applyPlanToLibrary / nestForFirestore', () => {
  it('reflète le plan dans la copie locale, avec suppressions de clés', () => {
    const { library } = buildUserMigration({ uid: 'u', works: base().works, watchedDocs: { a: { '1-1': 10 } }, main: { ratings: base().ratings }, now: 1 })
    const p = plan({ watched: { 'a-1-2': 20 }, ratings: {}, favorites: { a: true } })
    const out = applyPlanToLibrary(library, p)
    expect(out.a.eps).toEqual({ '1-2': 20 })
    expect(out.a.ratings).toEqual({})
    expect(out.a).toMatchObject({ favorite: true, watchedCount: 1, updatedAt: NOW })
    expect(library.a.eps).toEqual({ '1-1': 10 }) // l'original n'est pas modifié
  })
  it('retire une œuvre supprimée de la copie locale', () => {
    const { library } = buildUserMigration({ uid: 'u', works: base().works, now: 1 })
    expect(Object.keys(applyPlanToLibrary(library, plan({ works: { b: base().works.b } })))).toEqual(['b'])
  })
  it('construit un objet imbriqué pour Firestore (merge)', () => {
    const nested = nestForFirestore({ 'eps.1-3': 5, 'ratings.e:1-2': 4, status: 'x', favorite: DELETE })
    expect(nested.eps).toEqual({ '1-3': 5 })
    expect(nested.ratings).toEqual({ 'e:1-2': 4 })
    expect(nested.status).toBe('x')
    expect(typeof nested.favorite).toBe('object') // sentinelle deleteField()
  })
})

describe('assemble : un document sans catalogId n’est pas une œuvre', () => {
  it('conserve la progression mais n’affiche pas de fiche fantôme', () => {
    const data = assembleData({ library: { x: { id: 'x', eps: { '1-1': 5 } } } })
    expect(data.works).toEqual({})
    expect(data.watched).toEqual({ 'x-1-1': 5 })
  })
})
