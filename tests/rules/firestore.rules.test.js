// Lancer avec : pnpm run test:rules  (émulateur Firestore + Java requis)
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, setDoc, deleteDoc, updateDoc, writeBatch, setLogLevel } from 'firebase/firestore'

let env
const alice = () => env.authenticatedContext('alice').firestore()
const bob = () => env.authenticatedContext('bob').firestore()
const anon = () => env.unauthenticatedContext().firestore()

beforeAll(async () => {
  setLogLevel('error')
  env = await initializeTestEnvironment({
    projectId: 'demo-jilu',
    firestore: { rules: readFileSync('firestore.rules', 'utf8') },
  })
})
afterAll(() => env.cleanup())
beforeEach(() => env.clearFirestore())

const review = (over = {}) => ({
  workId: 'tmdb-tv-1', sNum: null, eNum: null, userId: 'alice', handle: 'Anonyme',
  text: '<p>super</p>', rating: 4, ts: Date.now(), ...over,
})

describe('users', () => {
  it('le propriétaire lit/écrit son document', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'users/alice'), { settings: { publicProfile: false } }))
    await assertSucceeds(getDoc(doc(alice(), 'users/alice')))
  })
  it("un autre utilisateur ne lit pas un profil privé", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users/alice'), { settings: { publicProfile: false } }))
    await assertFails(getDoc(doc(bob(), 'users/alice')))
    await assertFails(getDoc(doc(anon(), 'users/alice')))
  })
  it('un profil public est lisible, pas modifiable par un autre', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'users/alice'), { settings: { publicProfile: true } }))
    await assertSucceeds(getDoc(doc(bob(), 'users/alice')))
    await assertFails(setDoc(doc(bob(), 'users/alice'), { x: 1 }, { merge: true }))
  })
})

describe('pseudos', () => {
  it('création libre, lecture publique', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'pseudos/alice_01'), { uid: 'alice' }))
    await assertSucceeds(getDoc(doc(anon(), 'pseudos/alice_01')))
  })
  it("refuse de prendre le pseudo d'un autre", async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'pseudos/alice_01'), { uid: 'alice' }))
    await assertFails(setDoc(doc(bob(), 'pseudos/alice_01'), { uid: 'bob' }))
  })
  it('refuse de créer un pseudo au nom de quelqu’un d’autre ou mal formé', async () => {
    await assertFails(setDoc(doc(alice(), 'pseudos/bobby'), { uid: 'bob' }))
    await assertFails(setDoc(doc(alice(), 'pseudos/A'), { uid: 'alice' }))
    await assertFails(setDoc(doc(alice(), 'pseudos/Alice'), { uid: 'alice' }))
    await assertFails(setDoc(doc(alice(), 'pseudos/ok_name'), { uid: 'alice', extra: 1 }))
  })
  it('permet de renommer (delete + create en batch) mais pas de supprimer celui d’un autre', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'pseudos/old_name'), { uid: 'alice' }))
    const db = alice()
    const b = writeBatch(db)
    b.delete(doc(db, 'pseudos/old_name'))
    b.set(doc(db, 'pseudos/new_name'), { uid: 'alice' })
    await assertSucceeds(b.commit())
    await assertFails(deleteDoc(doc(bob(), 'pseudos/new_name')))
  })
})

describe('reviews', () => {
  beforeEach(() => env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'pseudos/alice_01'), { uid: 'alice' })))

  it('lecture réservée aux connectés', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'reviews/r1'), review()))
    await assertSucceeds(getDoc(doc(bob(), 'reviews/r1')))
    await assertFails(getDoc(doc(anon(), 'reviews/r1')))
  })
  it('création valide (anonyme ou avec son vrai pseudo)', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'reviews/r1'), review()))
    await assertSucceeds(setDoc(doc(alice(), 'reviews/r2'), review({ handle: 'alice_01' })))
  })
  it("refuse d'usurper un pseudo, une note hors bornes, un texte trop long, un autre userId", async () => {
    await assertFails(setDoc(doc(bob(), 'reviews/r1'), review({ userId: 'bob', handle: 'alice_01' })))
    await assertFails(setDoc(doc(alice(), 'reviews/r2'), review({ rating: 99 })))
    await assertFails(setDoc(doc(alice(), 'reviews/r3'), review({ text: 'x'.repeat(20001) })))
    await assertFails(setDoc(doc(alice(), 'reviews/r4'), review({ userId: 'bob' })))
  })
  it('seul l’auteur modifie/supprime, et workId est figé', async () => {
    await env.withSecurityRulesDisabled((c) => setDoc(doc(c.firestore(), 'reviews/r1'), review()))
    await assertFails(updateDoc(doc(bob(), 'reviews/r1'), { text: 'hack' }))
    await assertFails(updateDoc(doc(alice(), 'reviews/r1'), { workId: 'autre' }))
    await assertSucceeds(updateDoc(doc(alice(), 'reviews/r1'), { text: '<p>maj</p>', ts: Date.now() }))
    await assertFails(deleteDoc(doc(bob(), 'reviews/r1')))
    await assertSucceeds(deleteDoc(doc(alice(), 'reviews/r1')))
  })
})

describe('quiz', () => {
  const score = (over = {}) => ({ handle: 'alice_01', answer: 1, correct: true, timeMs: 2500, ts: Date.now(), ...over })
  it('un seul score par jour, non rejouable ni modifiable', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'quiz/2026-10-20/scores/alice'), score()))
    await assertFails(setDoc(doc(alice(), 'quiz/2026-10-20/scores/alice'), score({ timeMs: 1000 })))
    await assertFails(updateDoc(doc(alice(), 'quiz/2026-10-20/scores/alice'), { timeMs: 1000 }))
  })
  it('refuse un score pour un autre, un temps irréaliste ou une date mal formée', async () => {
    await assertFails(setDoc(doc(bob(), 'quiz/2026-10-20/scores/alice'), score()))
    await assertFails(setDoc(doc(alice(), 'quiz/2026-10-21/scores/alice'), score({ timeMs: 0 })))
    await assertFails(setDoc(doc(alice(), 'quiz/nimporte/scores/alice'), score()))
  })
})

describe('follows', () => {
  it('privé à son propriétaire', async () => {
    await assertSucceeds(setDoc(doc(alice(), 'follows/alice'), { following: {} }))
    await assertFails(getDoc(doc(bob(), 'follows/alice')))
  })
})
