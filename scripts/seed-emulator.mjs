// Remplit les émulateurs Auth + Firestore avec des comptes de test (actif, sans pseudo, inactif, orphelins).
// Usage : voir README.md de ce dossier. Ne fonctionne qu'avec les émulateurs.
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

if (!process.env.FIRESTORE_EMULATOR_HOST || !process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  console.error('Refus : les variables FIRESTORE_EMULATOR_HOST et FIREBASE_AUTH_EMULATOR_HOST doivent pointer vers les émulateurs.')
  process.exit(1)
}
initializeApp({ projectId: 'demo-jilu' })
const auth = getAuth()
const db = getFirestore()

for (const uid of ['actif', 'sanspseudo', 'inactif']) {
  await auth.createUser({ uid, email: `${uid}@example.com`, password: 'password123' })
}
await db.doc('users/actif').set({ profile: { handle: 'actif_01' }, settings: { publicProfile: true } })
await db.doc('users/actif/works/tmdb-tv-1').set({ title: 'A' })
await db.doc('users/actif/watched/tmdb-tv-1').set({ eps: { '1-1': 1 } })
await db.doc('pseudos/actif_01').set({ uid: 'actif' })
await db.doc('reviews/r-actif').set({ userId: 'actif', workId: 'tmdb-tv-1', text: 'ok' })
await db.doc('users/sanspseudo').set({ profile: {}, settings: {} })
await db.doc('users/inactif').set({ profile: { handle: 'inactif_01' } })
await db.doc('pseudos/inactif_01').set({ uid: 'inactif' })

// Orphelin complet : plus de compte Auth, mais toutes les données
await db.doc('users/fantome').set({ profile: { handle: 'fantome_01' }, settings: { publicProfile: true } })
await db.doc('users/fantome/works/tmdb-tv-2').set({ title: 'B' })
await db.doc('users/fantome/works/tmdb-tv-3').set({ title: 'C' })
await db.doc('users/fantome/watched/tmdb-tv-2').set({ eps: { '1-1': 1 } })
await db.doc('pseudos/fantome_01').set({ uid: 'fantome' })
await db.doc('reviews/r-fantome').set({ userId: 'fantome', workId: 'tmdb-tv-2', text: 'avis restant en ligne' })
await db.doc('follows/fantome').set({ following: {} })
await db.doc('quiz/2026-10-01/scores/fantome').set({ answer: 0, correct: true, timeMs: 900, handle: 'fantome_01' })
// Orphelin partiel : document users absent, sous-collection restante
await db.doc('users/partiel/works/tmdb-tv-9').set({ title: 'D' })
console.log('Données de test créées.')
