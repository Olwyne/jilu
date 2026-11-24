// Scripts d'administration lancés pour de vrai contre l'émulateur (Admin SDK) : reprise des spéciaux, purge de l'ancien modèle.
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { initializeApp, deleteApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

let app, db
const run = (script, ...args) => execFileSync('node', [`scripts/${script}.mjs`, '--project', 'demo-jilu', ...args], { encoding: 'utf8' })
const data = async (path) => (await db.doc(path).get()).data()
const eps = (n) => Array.from({ length: n }, (_, i) => ({ n: i + 1 }))

beforeAll(() => {
  app = initializeApp({ projectId: 'demo-jilu' }, 'scripts-test')
  db = getFirestore(app)
})
afterAll(() => deleteApp(app))
beforeEach(async () => {
  for (const name of ['catalog', 'users', 'reviews']) await db.recursiveDelete(db.collection(name))
})

describe('migrate-specials', () => {
  beforeEach(async () => {
    // 2 saisons + spéciaux numérotés 3 (ancien code) ; un autre animé sans spéciaux
    await db.doc('catalog/anilist-1').set({ category: 'animes', seasons: [{ n: 1, episodes: eps(2) }, { n: 2, episodes: eps(2) }, { n: 3, name: 'Spéciaux', episodes: eps(2) }] })
    await db.doc('catalog/anilist-2').set({ category: 'animes', seasons: [{ n: 1, episodes: eps(2) }, { n: 2, episodes: eps(2) }, { n: 3, episodes: eps(2) }] })
    await db.doc('users/alice').set({ feed: [{ id: 'c1', workId: 'anilist-1', sNum: 3, eNum: 2, key: 'anilist-1-3-2' }, { id: 'c2', workId: 'anilist-1', sNum: 1, eNum: 1, key: 'anilist-1-1-1' }] })
    await db.doc('users/alice/library/anilist-1').set({ catalogId: 'anilist-1', eps: { '1-1': 5, '3-2': 6 }, ratings: { 's:3': 4, 'e:3-2': 5, w: 3 }, watchedCount: 2, updatedAt: 1 })
    await db.doc('users/alice/library/anilist-2').set({ catalogId: 'anilist-2', eps: { '3-1': 7 }, updatedAt: 1 })
    await db.doc('reviews/anilist-1-3-2-alice').set({ workId: 'anilist-1', sNum: 3, eNum: 2, userId: 'alice', text: 'a' })
    await db.doc('reviews/auto').set({ workId: 'anilist-1', sNum: 3, eNum: 1, userId: 'bob', text: 'b' })
    await db.doc('reviews/autre').set({ workId: 'anilist-1', sNum: 2, eNum: 1, userId: 'bob', text: 'c' })
  })

  it('sans --apply : rien n’est écrit', async () => {
    expect(run('migrate-specials')).toContain('1 fiche(s) de bibliothèque, 2 avis, 1 commentaire(s) à modifier')
    expect((await data('catalog/anilist-1')).seasons[2].n).toBe(3)
    expect((await data('users/alice/library/anilist-1')).eps).toEqual({ '1-1': 5, '3-2': 6 })
  })

  it('--apply : catalogue, progression, notes, avis et commentaires passent en saison 0 ; relancer ne change rien', async () => {
    run('migrate-specials', '--apply')
    expect((await data('catalog/anilist-1')).seasons.map((s) => s.n)).toEqual([1, 2, 0])
    const lib = await data('users/alice/library/anilist-1')
    expect(lib.eps).toEqual({ '1-1': 5, '0-2': 6 })
    expect(lib.ratings).toEqual({ 's:0': 4, 'e:0-2': 5, w: 3 })
    expect(lib.updatedAt).toBeGreaterThan(1) // les appareils reprennent la fiche
    // un animé sans spéciaux : sa vraie saison 3 n'est pas touchée
    expect((await data('users/alice/library/anilist-2')).eps).toEqual({ '3-1': 7 })
    expect(await data('reviews/anilist-1-3-2-alice')).toBeUndefined()
    expect(await data('reviews/anilist-1-0-2-alice')).toMatchObject({ sNum: 0, eNum: 2, text: 'a' })
    expect(await data('reviews/auto')).toMatchObject({ sNum: 0 })
    expect(await data('reviews/autre')).toMatchObject({ sNum: 2 })
    expect((await data('users/alice')).feed).toEqual([
      { id: 'c1', workId: 'anilist-1', sNum: 0, eNum: 2, key: 'anilist-1-0-2' },
      { id: 'c2', workId: 'anilist-1', sNum: 1, eNum: 1, key: 'anilist-1-1-1' },
    ])
    expect(run('migrate-specials', '--apply')).toContain('0 fiche(s) de bibliothèque, 0 avis, 0 commentaire(s) modifiés')
  })
})

describe('purge-legacy', () => {
  beforeEach(async () => {
    await db.doc('users/alice').set({ settings: { darkMode: true }, reviews: [{ id: 'w' }], ratings: { 'w:w': 4 }, games: {} })
    await db.doc('users/alice/works/w').set({ title: 'W' })
    await db.doc('users/alice/watched/w').set({ eps: { '1-1': 1 } })
    await db.doc('users/alice/library/w').set({ catalogId: 'w', updatedAt: 1 })
    // jamais migré : œuvres v1 sans aucune fiche v2
    await db.doc('users/carl/works/x').set({ title: 'X' })
  })

  it('sans --delete : compte seulement ; --delete sans sauvegarde ni confirmation : refusé', async () => {
    expect(run('purge-legacy')).toContain('2 document(s) et 2 champ(s) de l\'ancien modèle à supprimer')
    expect(() => run('purge-legacy', '--delete')).toThrow()
    expect(await data('users/alice/works/w')).toBeDefined()
  })

  it('--delete : sauvegarde puis suppression de l’ancien modèle seulement ; un compte non migré est épargné', async () => {
    const backup = mkdtempSync(join(tmpdir(), 'jilu-'))
    run('purge-legacy', '--backup', backup, '--delete', '--confirm', 'demo-jilu')
    expect(JSON.parse(readFileSync(join(backup, 'alice.json'), 'utf8'))).toMatchObject({ works: { w: { title: 'W' } }, watched: { w: {} }, fields: { ratings: { 'w:w': 4 } } })
    expect(await data('users/alice/works/w')).toBeUndefined()
    expect(await data('users/alice/watched/w')).toBeUndefined()
    expect(await data('users/alice')).toEqual({ settings: { darkMode: true }, reviews: [{ id: 'w' }] })
    expect(await data('users/alice/library/w')).toBeDefined()
    expect(await data('users/carl/works/x')).toBeDefined()
  })
})
