// Profils publics et catalogue partagé : ce que voient les visiteurs, avec les vraies règles.
import { readFileSync } from 'node:fs'
import { beforeAll, afterAll, beforeEach, describe, it, expect } from 'vitest'
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing'
import { doc, getDoc, getDocs, setDoc, deleteDoc, collection } from 'firebase/firestore'

let env
const as = (uid) => env.authenticatedContext(uid).firestore()
const anon = () => env.unauthenticatedContext().firestore()
const seed = (fn) => env.withSecurityRulesDisabled((c) => fn(c.firestore()))

beforeAll(async () => {
  env = await initializeTestEnvironment({ projectId: 'demo-jilu', firestore: { rules: readFileSync('firestore.rules', 'utf8') } })
})
afterAll(() => env.cleanup())
beforeEach(async () => {
  await env.clearFirestore()
  await seed(async (d) => {
    await setDoc(doc(d, 'users/pub'), { settings: { publicProfile: true } })
    await setDoc(doc(d, 'users/pub/library/w1'), { id: 'w1', catalogId: 'w1', title: 'A', eps: { '1-1': 1 } })
    await setDoc(doc(d, 'users/priv'), { settings: { publicProfile: false } })
    await setDoc(doc(d, 'users/priv/library/w2'), { id: 'w2', catalogId: 'w2', title: 'B' })
    await setDoc(doc(d, 'catalog/w1'), { title: 'A', category: 'series' })
  })
})

describe('profil public', () => {
  it('sa bibliothèque et le catalogue sont lisibles par un visiteur non connecté', async () => {
    await assertSucceeds(getDocs(collection(anon(), 'users/pub/library')))
    await assertSucceeds(getDoc(doc(anon(), 'catalog/w1')))
  })
  it('un profil privé reste privé (hors propriétaire)', async () => {
    await assertFails(getDocs(collection(anon(), 'users/priv/library')))
    await assertFails(getDoc(doc(as('bob'), 'users/priv/library/w2')))
    await assertSucceeds(getDoc(doc(as('priv'), 'users/priv/library/w2')))
  })
  it('un visiteur ne peut rien écrire dans une bibliothèque publique', async () => {
    await assertFails(setDoc(doc(as('bob'), 'users/pub/library/w9'), { title: 'x' }))
    await assertFails(deleteDoc(doc(anon(), 'users/pub/library/w1')))
  })
  it('plus de document de configuration à créer : /config n’est plus ouvert', async () => {
    await assertFails(getDoc(doc(as('pub'), 'config/features')))
  })
})

describe('suppression de compte', () => {
  it('le propriétaire peut supprimer tout son espace (bibliothèque et marqueurs de migration compris)', async () => {
    await seed((d) => setDoc(doc(d, 'users/pub/migrations/v2'), { ok: true }))
    const db = as('pub')
    await assertSucceeds(deleteDoc(doc(db, 'users/pub/library/w1')))
    await assertSucceeds(deleteDoc(doc(db, 'users/pub/migrations/v2')))
    await assertSucceeds(deleteDoc(doc(db, 'users/pub')))
  })
})
