import { describe, it, expect } from 'vitest'
import { importOps, prepareImport } from './useImport'
import { requestCatalogCreation } from '../data/refreshClient.js'

const eps = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1 }))

describe('prepareImport : statut d’après la fiche du serveur, rien sans fiche', () => {
  it('série vue en partie : « en cours » (pas « terminé »), œuvre sans fiche écartée et signalée', async () => {
    const data = { works: {}, watched: {}, ratings: {}, favorites: {} }
    const show = (id) => ({ id, title: id, source: 'tmdb', sourceId: 1, status: 'en_cours', seasons: [{ n: 1, episodes: eps(1) }] })
    const failed = []
    const ops = await prepareImport(data, {
      works: { a: show('a'), b: show('b') },
      watched: { 'a-1-1': 5, 'b-1-1': 6 },
      ratings: {}, favorites: {},
    }, { createCatalogDocs: async () => ({ a: { seasons: [{ n: 1, episodes: eps(10) }], ended: true } }), failed })
    expect(ops.add.a.status).toBe('en_cours')
    expect(ops.add.b).toBeUndefined()
    expect(ops.extras.watchedDocs).toEqual({ a: { '1-1': 5 } })
    expect(failed).toEqual(['b'])
  })
})

describe('requestCatalogCreation', () => {
  it('redemande les fiches « pending » ; un paquet en erreur donne « failed » sans lever', async () => {
    const replies = [
      { ok: true, json: async () => ({ results: { a: 'created', b: 'pending' } }) },
      { ok: false, json: async () => ({}) },
    ]
    const calls = []
    const fetchImpl = async (_url, init) => { calls.push(JSON.parse(init.body).ids); return replies.shift() }
    const results = await requestCatalogCreation(['a', 'b'], { fetchImpl, getToken: async () => 't' })
    expect(calls).toEqual([['a', 'b'], ['b']])
    expect(results).toEqual({ a: 'created', b: 'failed' })
  })
})

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
