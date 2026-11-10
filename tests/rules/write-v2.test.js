// Écritures v2 contre l'émulateur et les vraies règles : après chaque action réelle de l'application,
// relire la bibliothèque depuis zéro doit redonner exactement la copie locale tenue à jour sans relire.
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore'
import { createCache } from '../../src/data/cache.js'
import { syncLibrary } from '../../src/data/library.js'
import { loadCatalog } from '../../src/data/catalog.js'
import { assembleData } from '../../src/data/assemble.js'
import { buildPlan, applyPlanToLibrary, commitPlan, isEmptyPlan } from '../../src/data/writeV2.js'
import { useWorkActions } from '../../src/hooks/useWorkActions.js'
import { buildLibraryDocs } from '../../src/data/libraryDocs.js'

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))
// Écrit directement les fiches v2 (catalogue + bibliothèque) d'un compte, règles désactivées
const seedV2 = (uid, args) => seed(async (d) => {
  const { catalog, library } = buildLibraryDocs({ uid, ...args })
  for (const [id, c] of Object.entries(catalog)) await setDoc(doc(d, `catalog/${id}`), c)
  for (const [id, l] of Object.entries(library)) await setDoc(doc(d, `users/${uid}/library/${id}`), l)
})
const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const W = (id, over = {}) => ({ id, source: 'tmdb', sourceId: Number(id.split('-').pop()), title: `Titre ${id}`, category: 'series', genre: 'Drame', year: 2020, seasons: [season(1, 4), season(2, 3)], status: 'a_voir', added: 1, ...over })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const start = {
  works: { 'tmdb-tv-1': W('tmdb-tv-1', { status: 'en_cours' }), 'tmdb-tv-2': W('tmdb-tv-2'), 'tmdb-movie-3': W('tmdb-movie-3', { category: 'films', seasons: null, status: 'termine' }) },
  watchedDocs: { 'tmdb-tv-1': { '1-1': 11, '1-2': 12 } },
  main: { ratings: { 'w:tmdb-tv-1': 4 }, reviews: [{ id: 'tmdb-tv-1', note: '', rating: 4, ts: 5 }] },
}

describe('écritures v2 : les vraies actions, relues depuis zéro', () => {
  it('suite complète d’actions : la copie locale et le serveur restent identiques', async () => {
    globalThis.window = { confirm: () => true } // resetProgress / clearAll demandent confirmation
    await seedV2('alice', start)
    const db = as('alice')
    const cache = await createCache(`w-${Math.random()}`)
    let { library } = await syncLibrary(db, 'alice', cache)
    let { catalog } = await loadCatalog(db, Object.values(library).map((l) => l.catalogId), cache)
    let totalWrites = 0

    // Même chemin que useAppData.writeLibrary (sans React) : plan -> écriture -> copie locale
    const store = {
      mutate: async () => {},
      writeLibrary: async (ops) => {
        const plan = buildPlan({ uid: 'alice', library, ...ops })
        if (!isEmptyPlan(plan)) totalWrites += (await commitPlan(db, 'alice', plan)).writes
        library = applyPlanToLibrary(library, plan)
        catalog = { ...catalog, ...plan.catalogCreates }
      },
    }
    const view = () => assembleData({ library, catalog })
    const step = async (label, fn) => {
      await fn(useWorkActions(view(), store))
      // Nouvel appareil : relecture complète du serveur, identique à la copie tenue à jour sans relire
      const fresh = await createCache(`fresh-${Math.random()}`)
      const server = await syncLibrary(db, 'alice', fresh)
      const { catalog: serverCatalog } = await loadCatalog(db, Object.values(server.library).map((l) => l.catalogId).filter(Boolean), fresh)
      expect(assembleData({ library: server.library, catalog: serverCatalog }), label).toEqual(view())
    }

    await step('cocher un épisode', (a) => a.toggleEpisode('tmdb-tv-1', 1, 3))
    expect(view().watched['tmdb-tv-1-1-3']).toEqual(expect.any(Number))
    await step('marquer une saison', (a) => a.markSeason('tmdb-tv-2', 1))
    expect(view().works['tmdb-tv-2'].status).toBe('en_cours')
    await step('noter l’œuvre', (a) => a.setRating('w', 'tmdb-tv-2', 5))
    await step('noter une saison', (a) => a.setRating('s', 'tmdb-tv-2-1', 3))
    await step('noter un épisode', (a) => a.setRating('e', 'tmdb-tv-2-1-2', 4))
    await step('retirer la note de l’œuvre', (a) => a.setRating('w', 'tmdb-tv-2', 5))
    expect(view().ratings).toEqual({ 'w:tmdb-tv-1': 4, 's:tmdb-tv-2-1': 3, 'e:tmdb-tv-2-1-2': 4 })
    await step('favori', (a) => a.toggleFavorite('tmdb-movie-3'))
    await step('jeu', (a) => a.addGameMinutes('tmdb-tv-2', 90))
    await step('statut', (a) => a.setStatus('tmdb-movie-3', 'abandonne'))
    await step('ajouter une série', () => store.writeLibrary({ add: { 'tmdb-tv-50': W('tmdb-tv-50', { status: 'en_cours' }) } }))
    const { sourceId, ...local } = W('ma-serie'); void sourceId
    await step('ajouter une œuvre locale', () => store.writeLibrary({ add: { 'ma-serie': local } }))
    expect(library['ma-serie'].catalogId).toBe('local-alice-ma-serie')
    await step('retirer une œuvre', (a) => a.removeWork('tmdb-tv-1'))
    expect(view().works['tmdb-tv-1']).toBeUndefined()
    await step('ré-ajouter l’œuvre retirée', () => store.writeLibrary({ add: { 'tmdb-tv-1': W('tmdb-tv-1') } }))
    expect(Object.keys(view().watched).filter((k) => k.startsWith('tmdb-tv-1-'))).toEqual([]) // progression repartie de zéro
    await step('décocher un épisode', (a) => a.toggleEpisode('tmdb-tv-2', 1, 2))
    await step('réinitialiser la progression', (a) => a.resetProgress())
    expect(view().watched).toEqual({})
    await step('tout effacer', (a) => a.clearAll())
    expect(view().works).toEqual({})
    await step('ajouter après tout effacer', () => store.writeLibrary({ add: { 'tmdb-tv-9': W('tmdb-tv-9') } }))

    expect(totalWrites).toBeGreaterThan(0)
  })

  it('cocher un épisode = exactement 1 document écrit, même sur une grosse série', async () => {
    const big = W('tmdb-tv-7', { seasons: [season(1, 500)], status: 'en_cours' })
    await seedV2('alice', { works: { 'tmdb-tv-7': big } })
    const db = as('alice')
    const library = { 'tmdb-tv-7': (await getDoc(doc(db, 'users/alice/library/tmdb-tv-7'))).data() }
    const plan = buildPlan({ uid: 'alice', library, set: { 'tmdb-tv-7': { 'eps.1-250': 99 } } })
    expect((await commitPlan(db, 'alice', plan)).writes).toBe(1)
    const lib = (await getDoc(doc(db, 'users/alice/library/tmdb-tv-7'))).data()
    expect(lib.eps).toEqual({ '1-250': 99 })
    expect(lib.watchedCount).toBe(1)
  })

  it('réutilise une fiche de catalogue existante sans erreur et refuse de la modifier', async () => {
    const db = as('bob')
    await commitPlan(db, 'bob', buildPlan({ uid: 'bob', add: { 'tmdb-tv-8': W('tmdb-tv-8') }, now: 1 }))
    const catalogBefore = (await getDoc(doc(db, 'catalog/tmdb-tv-8'))).data()
    const other = as('carl')
    const plan = buildPlan({ uid: 'carl', add: { 'tmdb-tv-8': W('tmdb-tv-8', { title: 'Piraté', seasons: [] }) }, now: 2 })
    expect((await commitPlan(other, 'carl', plan)).writes).toBe(1) // seulement la bibliothèque de carl
    expect((await getDoc(doc(db, 'catalog/tmdb-tv-8'))).data()).toEqual(catalogBefore)
    await assertFails(setDoc(doc(other, 'catalog/tmdb-tv-8'), { title: 'x', category: 'series' }))
    expect((await getDocs(collection(other, 'users/carl/library'))).size).toBe(1)
  })
})
