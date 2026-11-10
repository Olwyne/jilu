import { describe, it, expect } from 'vitest'
import { buildPlan, applyPlanToLibrary, nestForFirestore, isEmptyPlan, DELETE } from './writeV2.js'
import { assembleData } from './assemble.js'
import { buildLibraryDocs } from './libraryDocs.js'

const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const W = (id, over = {}) => ({ id, source: 'tmdb', sourceId: 1, title: `T ${id}`, category: 'series', seasons: [season(1, 3)], status: 'en_cours', added: 1, ...over })

const NOW = 5000
const library = { a: { id: 'a', catalogId: 'a', eps: { '1-1': 10 }, watchedCount: 1 } }
const plan = (ops) => buildPlan({ uid: 'u', library, now: NOW, ...ops })
const count = (p) => Object.keys(p.libraryCreates).length + Object.keys(p.patches).length + p.removes.length

describe('buildPlan : une action = une écriture par document touché', () => {
  it('cocher un épisode : 1 écriture ciblée, compteur recalculé depuis la copie locale', () => {
    const p = plan({ set: { a: { 'eps.1-2': 20, status: 'termine' } } })
    expect(count(p)).toBe(1)
    expect(p.patches.a).toEqual({ 'eps.1-2': 20, status: 'termine', watchedCount: 2, updatedAt: NOW })
    expect(p.catalogCreates).toEqual({})
  })
  it('décocher, ou tout réinitialiser : recompte', () => {
    expect(plan({ set: { a: { 'eps.1-1': DELETE } } }).patches.a).toEqual({ 'eps.1-1': DELETE, watchedCount: 0, updatedAt: NOW })
    expect(plan({ set: { a: { eps: DELETE } } }).patches.a).toEqual({ eps: DELETE, watchedCount: 0, updatedAt: NOW })
  })
  it('un champ hors progression ne touche pas au compteur', () => {
    expect(plan({ set: { a: { favorite: true } } }).patches.a).toEqual({ favorite: true, updatedAt: NOW })
  })
  it('rien à faire : plan vide', () => {
    expect(isEmptyPlan(plan({}))).toBe(true)
    expect(isEmptyPlan(plan({ set: { a: {} } }))).toBe(true)
  })
  it('ajouter une œuvre : fiche de bibliothèque + fiche de catalogue, progression et notes d’un import comprises', () => {
    const p = plan({ add: { n: W('n') }, extras: { watchedDocs: { n: { '1-1': 7 } }, main: { ratings: { 'w:n': 5 }, favorites: { n: true } } } })
    expect(p.catalogCreates.n).toMatchObject({ title: 'T n', updatedAt: NOW })
    expect(p.libraryCreates.n).toMatchObject({ catalogId: 'n', status: 'en_cours', eps: { '1-1': 7 }, watchedCount: 1, ratings: { w: 5 }, favorite: true })
  })
  it('ajouter une œuvre locale (sans sourceId) : catalogue local à l’utilisateur', () => {
    const p = plan({ add: { m: W('m', { sourceId: undefined }) } })
    expect(Object.keys(p.catalogCreates)).toEqual(['local-u-m'])
  })
  it('retirer : suppression douce, et aucune écriture en double sur la même fiche', () => {
    const p = plan({ remove: ['a'], set: { a: { favorite: true } } })
    expect(p.removes).toEqual(['a'])
    expect(p.patches).toEqual({})
  })
})

describe('applyPlanToLibrary / nestForFirestore', () => {
  it('reflète le plan dans la copie locale, avec suppressions de clés', () => {
    const { library: lib } = buildLibraryDocs({ uid: 'u', works: { a: W('a') }, watchedDocs: { a: { '1-1': 10 } }, main: { ratings: { 'w:a': 4 } }, now: 1 })
    const p = buildPlan({ uid: 'u', library: lib, now: NOW, set: { a: { 'eps.1-1': DELETE, 'eps.1-2': 20, 'ratings.w': DELETE, favorite: true } } })
    const out = applyPlanToLibrary(lib, p)
    expect(out.a.eps).toEqual({ '1-2': 20 })
    expect(out.a.ratings).toEqual({})
    expect(out.a).toMatchObject({ favorite: true, watchedCount: 1, updatedAt: NOW })
    expect(lib.a.eps).toEqual({ '1-1': 10 }) // l'original n'est pas modifié
  })
  it('retire une œuvre supprimée de la copie locale', () => {
    const { library: lib } = buildLibraryDocs({ uid: 'u', works: { a: W('a'), b: W('b') }, now: 1 })
    expect(Object.keys(applyPlanToLibrary(lib, buildPlan({ uid: 'u', remove: ['a'] })))).toEqual(['b'])
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
