// Écritures v2 contre l'émulateur et les vraies règles : après une longue série d'actions de l'application,
// relire le nouveau modèle depuis zéro doit redonner exactement ce que l'ancien modèle contiendrait.
import 'fake-indexeddb/auto'
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertFails } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore'
import { createCache } from '../../src/data/cache.js'
import { syncLibrary } from '../../src/data/library.js'
import { loadCatalog } from '../../src/data/catalog.js'
import { assembleData } from '../../src/data/assemble.js'
import { planV2Writes, applyPlanToLibrary, commitPlan, isEmptyPlan } from '../../src/data/writeV2.js'
import { migrateAccount } from '../../src/lib/migration.js'

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))
const season = (n, count) => ({ n, name: null, episodes: Array.from({ length: count }, (_, i) => ({ n: i + 1, title: `E${i + 1}`, air: i === 0 ? Infinity : 1000 })) })
const W = (id, over = {}) => ({ id, source: 'tmdb', sourceId: Number(id.split('-').pop()), title: `Titre ${id}`, category: 'series', genre: 'Drame', year: 2020, seasons: [season(1, 4), season(2, 3)], status: 'a_voir', added: 1, ...over })

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

// Même sémantique que useWorkActions : on reçoit toujours des cartes complètes
const v1Seed = () => ({
  works: { 'tmdb-tv-1': W('tmdb-tv-1', { status: 'en_cours' }), 'tmdb-tv-2': W('tmdb-tv-2'), 'tmdb-movie-3': W('tmdb-movie-3', { category: 'films', seasons: null, status: 'termine' }) },
  watched: { 'tmdb-tv-1-1-1': 11, 'tmdb-tv-1-1-2': 12 },
  ratings: { 'w:tmdb-tv-1': 4 },
  favorites: {},
  games: {},
  reviews: [{ id: 'tmdb-tv-1', note: '', rating: 4, ts: 5 }],
})

const forExistingWorks = (model) => {
  const ids = Object.keys(model.works)
  const owns = (key, scopeLen) => ids.some((id) => key.slice(scopeLen).startsWith(id))
  return {
    ...model,
    // Écart voulu : l'ancien modèle laisse l'avis personnel d'une œuvre retirée dans la liste, le nouveau l'efface avec elle
    reviews: model.reviews.filter((r) => ids.includes(r.id)),
    watched: Object.fromEntries(Object.entries(model.watched).filter(([k]) => owns(k, 0))),
    ratings: Object.fromEntries(Object.entries(model.ratings).filter(([k]) => owns(k, 2))),
  }
}

describe('écritures v2 : même résultat que l’ancien modèle', () => {
  it('suite complète d’actions, relue depuis zéro', async () => {
    const start = v1Seed()
    await seed(async (d) => {
      for (const [id, w] of Object.entries(start.works)) await setDoc(doc(d, `users/alice/works/${id}`), w)
      await setDoc(doc(d, 'users/alice/watched/tmdb-tv-1'), { eps: { '1-1': 11, '1-2': 12 } })
      await setDoc(doc(d, 'users/alice'), { ratings: start.ratings, reviews: start.reviews, favorites: {}, games: {} })
    })
    const db = as('alice')
    expect((await migrateAccount(db, 'alice')).verification.ok).toBe(true)
    const cache = await createCache(`w-${Math.random()}`)
    let { library } = await syncLibrary(db, 'alice', cache)
    let model = start
    let totalWrites = 0

    // Relecture depuis zéro (nouvel appareil) : bibliothèque + catalogue, comparée à l'ancien modèle
    const check = async (label) => {
      const fresh = await createCache(`fresh-${Math.random()}`)
      const server = await syncLibrary(db, 'alice', fresh)
      const { catalog } = await loadCatalog(db, Object.values(server.library).map((l) => l.catalogId).filter(Boolean), fresh)
      const fromServer = assembleData({ library: server.library, catalog })
      const expected = forExistingWorks(model)
      const fields = ['works', 'watched', 'ratings', 'favorites', 'games', 'reviews']
      for (const f of fields) expect(fromServer[f], `${label} : ${f}`).toEqual(expected[f])
      // la copie locale tenue à jour sans relire est identique à celle du serveur
      expect(assembleData({ library, catalog }), `${label} : copie locale`).toEqual(fromServer)
    }

    const act = async (patch, label) => {
      const plan = planV2Writes({ uid: 'alice', prev: model, patch, now: Date.now() })
      if (!isEmptyPlan(plan)) totalWrites += (await commitPlan(db, 'alice', plan)).writes
      library = applyPlanToLibrary(library, plan)
      model = { ...model, ...patch }
      await check(label)
      return plan
    }

    // 1. cocher un épisode (+ statut automatique)
    await act({ watched: { ...model.watched, 'tmdb-tv-1-1-3': 13 } }, 'cocher un épisode')
    // 2. marquer toute la saison 1 de tmdb-tv-2
    await act({ watched: { ...model.watched, ...Object.fromEntries([1, 2, 3, 4].map((e) => [`tmdb-tv-2-1-${e}`, 20 + e])) }, works: { ...model.works, 'tmdb-tv-2': W('tmdb-tv-2', { status: 'en_cours' }) } }, 'marquer une saison')
    // 3. notes œuvre / saison / épisode, puis retrait d'une note
    await act({ ratings: { ...model.ratings, 'w:tmdb-tv-2': 5, 's:tmdb-tv-2-1': 3, 'e:tmdb-tv-2-1-2': 4 }, reviews: [{ id: 'tmdb-tv-2', note: '', rating: 5, ts: 30 }, ...model.reviews] }, 'noter œuvre/saison/épisode')
    await act({ ratings: { ...model.ratings, 'w:tmdb-tv-2': 0 } }, 'retirer une note')
    // 4. favori, jeu, statut
    await act({ favorites: { 'tmdb-movie-3': true } }, 'favori')
    await act({ games: { 'tmdb-tv-2': { minutes: 90, done: { platine: true } } } }, 'jeu')
    await act({ works: { ...model.works, 'tmdb-movie-3': { ...model.works['tmdb-movie-3'], status: 'abandonne' } } }, 'statut')
    // 5. ajouter une série (avec progression) et une œuvre locale
    await act({ works: { ...model.works, 'tmdb-tv-50': W('tmdb-tv-50', { status: 'en_cours' }) }, watched: { ...model.watched, 'tmdb-tv-50-1-1': 50 } }, 'ajouter une série')
    const { sourceId, ...local } = W('ma-serie'); void sourceId
    await act({ works: { ...model.works, 'ma-serie': local } }, 'ajouter une œuvre locale')
    // 6. retirer une œuvre comme removeWork (carte, progression, note, favori)
    await act({
      works: Object.fromEntries(Object.entries(model.works).filter(([id]) => id !== 'tmdb-tv-1')),
      watched: Object.fromEntries(Object.entries(model.watched).filter(([k]) => !k.startsWith('tmdb-tv-1-'))),
      ratings: Object.fromEntries(Object.entries(model.ratings).filter(([k]) => k !== 'w:tmdb-tv-1')),
      favorites: Object.fromEntries(Object.entries(model.favorites).filter(([id]) => id !== 'tmdb-tv-1')),
    }, 'retirer une œuvre')
    // 7. la ré-ajouter : progression remise à zéro
    await act({ works: { ...model.works, 'tmdb-tv-1': W('tmdb-tv-1') } }, 'ré-ajouter l’œuvre retirée')
    // 8. décocher un épisode
    await act({ watched: Object.fromEntries(Object.entries(model.watched).filter(([k]) => k !== 'tmdb-tv-2-1-2')) }, 'décocher un épisode')
    // 9. réinitialiser la progression
    await act({ watched: {} }, 'réinitialiser la progression')
    // 10. tout effacer, puis ajouter une œuvre
    await act({ works: {}, watched: {}, ratings: {}, reviews: [], games: {}, favorites: {} }, 'tout effacer')
    await act({ works: { 'tmdb-tv-9': W('tmdb-tv-9', { status: 'a_voir' }) } }, 'ajouter après tout effacer')

    expect(totalWrites).toBeGreaterThan(0)
  })

  it('cocher un épisode = exactement 1 document écrit, même sur une grosse série', async () => {
    const big = W('tmdb-tv-7', { seasons: [season(1, 500)], status: 'en_cours' })
    await seed((d) => setDoc(doc(d, 'users/alice/works/tmdb-tv-7'), big))
    const db = as('alice')
    await migrateAccount(db, 'alice')
    const prev = { works: { 'tmdb-tv-7': big }, watched: {}, ratings: {}, favorites: {}, games: {}, reviews: [] }
    const plan = planV2Writes({ uid: 'alice', prev, patch: { watched: { 'tmdb-tv-7-1-250': 99 } }, now: Date.now() })
    expect((await commitPlan(db, 'alice', plan)).writes).toBe(1)
    const lib = (await getDoc(doc(db, 'users/alice/library/tmdb-tv-7'))).data()
    expect(lib.eps).toEqual({ '1-250': 99 })
    expect(lib.watchedCount).toBe(1)
  })

  it('réutilise une fiche de catalogue existante sans erreur et refuse de la modifier', async () => {
    const db = as('bob')
    const prev = { works: {}, watched: {}, ratings: {}, favorites: {}, games: {}, reviews: [] }
    await commitPlan(db, 'bob', planV2Writes({ uid: 'bob', prev, patch: { works: { 'tmdb-tv-8': W('tmdb-tv-8') } }, now: 1 }))
    const catalogBefore = (await getDoc(doc(db, 'catalog/tmdb-tv-8'))).data()
    const other = as('carl')
    const plan = planV2Writes({ uid: 'carl', prev, patch: { works: { 'tmdb-tv-8': W('tmdb-tv-8', { title: 'Piraté', seasons: [] }) } }, now: 2 })
    expect((await commitPlan(other, 'carl', plan)).writes).toBe(1) // seulement la bibliothèque de carl
    expect((await getDoc(doc(db, 'catalog/tmdb-tv-8'))).data()).toEqual(catalogBefore)
    await assertFails(setDoc(doc(other, 'catalog/tmdb-tv-8'), { title: 'x', category: 'series' }))
    expect((await getDocs(collection(other, 'users/carl/library'))).size).toBe(1)
  })
})
