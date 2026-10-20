#!/usr/bin/env node
// Audit des comptes : croise Firebase Authentication et Firestore.
//
//   LECTURE SEULE par défaut. Rien n'est modifié sans --delete-orphans (+ --backup + --confirm).
//
// Usage :
//   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle-de-service.json
//   node audit-accounts.mjs --project <id-du-projet-firebase>
//   node audit-accounts.mjs --project <id> --out rapport.json
//   node audit-accounts.mjs --project <id> --backup ./sauvegarde            # exporte les données des orphelins
//   node audit-accounts.mjs --project <id> --backup ./sauvegarde --delete-orphans --confirm <id>
//
// Un compte « ORPHELIN » n'existe plus dans Authentication mais a encore des données Firestore
// (cas typique : suppression de compte qui a échoué après la suppression du compte Auth).

import { parseArgs } from 'node:util'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'

const { values: args } = parseArgs({
  options: {
    project: { type: 'string' },
    'inactive-days': { type: 'string', default: '180' },
    out: { type: 'string' },
    backup: { type: 'string' },
    'delete-orphans': { type: 'boolean', default: false },
    confirm: { type: 'string' },
  },
})

if (!args.project) {
  console.error('Erreur : --project <id-du-projet-firebase> est obligatoire.')
  process.exit(1)
}

const INACTIVE_MS = Number(args['inactive-days']) * 24 * 60 * 60 * 1000
const usingEmulator = !!(process.env.FIRESTORE_EMULATOR_HOST || process.env.FIREBASE_AUTH_EMULATOR_HOST)

initializeApp({ projectId: args.project })
const auth = getAuth()
const db = getFirestore()

console.log(`Projet : ${args.project}${usingEmulator ? '  (ÉMULATEUR)' : ''}`)
console.log(args['delete-orphans'] ? 'Mode : SUPPRESSION DES ORPHELINS demandée' : 'Mode : lecture seule\n')

// --- 1. Authentication -------------------------------------------------------
const authUsers = new Map()
let pageToken
do {
  const page = await auth.listUsers(1000, pageToken)
  page.users.forEach((u) => authUsers.set(u.uid, {
    email: u.email || null,
    created: u.metadata.creationTime ? new Date(u.metadata.creationTime) : null,
    lastSignIn: u.metadata.lastSignInTime ? new Date(u.metadata.lastSignInTime) : null,
    disabled: u.disabled,
  }))
  pageToken = page.pageToken
} while (pageToken)

// --- 2. Firestore ------------------------------------------------------------
async function countDocs(query) {
  try {
    return (await query.count().get()).data().count
  } catch {
    return (await query.select().get()).size
  }
}

const userRefs = await db.collection('users').listDocuments() // inclut les documents absents qui ont encore des sous-collections
const firestoreUsers = new Map()
for (const ref of userRefs) {
  const snap = await ref.get()
  firestoreUsers.set(ref.id, {
    docExists: snap.exists,
    handle: snap.exists ? (snap.data().profile?.handle || null) : null,
    works: await countDocs(ref.collection('works')),
    watched: await countDocs(ref.collection('watched')),
  })
}

const reviewsByUser = new Map()
;(await db.collection('reviews').select('userId').get()).forEach((d) => {
  const uid = d.get('userId')
  reviewsByUser.set(uid, (reviewsByUser.get(uid) || 0) + 1)
})

const pseudoByUid = new Map()
;(await db.collection('pseudos').get()).forEach((d) => {
  const uid = d.get('uid')
  if (!pseudoByUid.has(uid)) pseudoByUid.set(uid, [])
  pseudoByUid.get(uid).push(d.id)
})

const followsIds = new Set((await db.collection('follows').listDocuments()).map((r) => r.id))
const quizScores = (await db.collectionGroup('scores').get()).docs
const quizByUid = new Map()
quizScores.forEach((d) => quizByUid.set(d.id, [...(quizByUid.get(d.id) || []), d.ref]))

// --- 3. Croisement -----------------------------------------------------------
const allUids = new Set([
  ...authUsers.keys(), ...firestoreUsers.keys(), ...reviewsByUser.keys(),
  ...pseudoByUid.keys(), ...followsIds, ...quizByUid.keys(),
])
const now = Date.now()
const day = (d) => (d ? d.toISOString().slice(0, 10) : '—')

const rows = [...allUids].map((uid) => {
  const a = authUsers.get(uid)
  const f = firestoreUsers.get(uid)
  const reviews = reviewsByUser.get(uid) || 0
  const pseudos = pseudoByUid.get(uid) || []
  const hasData = !!f || reviews > 0 || pseudos.length > 0 || followsIds.has(uid) || quizByUid.has(uid)

  let status
  if (!a) status = 'ORPHELIN'
  else if (!a.lastSignIn || now - a.lastSignIn.getTime() > INACTIVE_MS) status = 'INACTIF'
  else status = 'ACTIF'

  const notes = []
  if (a && !hasData) notes.push('aucune donnée Firestore')
  if (a && !pseudos.length) notes.push('sans pseudo enregistré')
  if (f && !f.docExists) notes.push('document users absent (sous-collections restantes)')
  if (a?.disabled) notes.push('compte désactivé')

  return {
    uid,
    email: a?.email || '—',
    statut: status,
    'créé le': day(a?.created),
    'dernière connexion': day(a?.lastSignIn),
    pseudo: pseudos.join(',') || f?.handle || '—',
    œuvres: f?.works ?? 0,
    'docs vus': f?.watched ?? 0,
    avis: reviews,
    remarques: notes.join(' · '),
  }
}).sort((x, y) => x.statut.localeCompare(y.statut) || x.uid.localeCompare(y.uid))

console.table(rows)

const count = (s) => rows.filter((r) => r.statut === s).length
console.log(`\nComptes Authentication : ${authUsers.size}  |  uid avec données Firestore : ${firestoreUsers.size}`)
console.log(`ACTIF : ${count('ACTIF')}  |  INACTIF (> ${args['inactive-days']} j) : ${count('INACTIF')}  |  ORPHELIN : ${count('ORPHELIN')}`)
console.log(`Sans pseudo enregistré (comptes existants) : ${rows.filter((r) => r.statut !== 'ORPHELIN' && r.remarques.includes('sans pseudo')).length}`)

if (args.out) {
  writeFileSync(args.out, JSON.stringify(rows, null, 2))
  console.log(`Rapport JSON écrit dans ${args.out}`)
}

// --- 4. Sauvegarde + suppression des orphelins (opt-in) ---------------------
const orphans = rows.filter((r) => r.statut === 'ORPHELIN').map((r) => r.uid)

async function dumpCollection(ref) {
  return (await ref.get()).docs.map((d) => ({ id: d.id, data: d.data() }))
}

if (args.backup && orphans.length) {
  mkdirSync(args.backup, { recursive: true })
  for (const uid of orphans) {
    const userRef = db.collection('users').doc(uid)
    const userSnap = await userRef.get()
    const dump = {
      uid,
      user: userSnap.exists ? userSnap.data() : null,
      works: await dumpCollection(userRef.collection('works')),
      watched: await dumpCollection(userRef.collection('watched')),
      reviews: (await db.collection('reviews').where('userId', '==', uid).get()).docs.map((d) => ({ id: d.id, data: d.data() })),
      pseudos: (pseudoByUid.get(uid) || []),
      follows: (await db.collection('follows').doc(uid).get()).data() || null,
    }
    writeFileSync(join(args.backup, `${uid}.json`), JSON.stringify(dump, null, 2))
  }
  console.log(`Sauvegarde de ${orphans.length} orphelin(s) écrite dans ${args.backup}`)
}

if (args['delete-orphans']) {
  const refuse = (msg) => { console.error(`\nSuppression refusée : ${msg}`); process.exit(1) }
  if (!args.backup) refuse('--backup <dossier> est obligatoire avant toute suppression.')
  if (args.confirm !== args.project) refuse(`ajoutez --confirm ${args.project} pour confirmer le projet visé.`)
  if (authUsers.size === 0) refuse("aucun compte Authentication trouvé : mauvais projet ou identifiants ? (tout paraîtrait orphelin)")
  if (!orphans.length) { console.log('\nAucun orphelin à supprimer.'); process.exit(0) }

  console.log(`\nSuppression des données de ${orphans.length} orphelin(s)…`)
  for (const uid of orphans) {
    await db.recursiveDelete(db.collection('users').doc(uid))
    const reviews = await db.collection('reviews').where('userId', '==', uid).get()
    await Promise.all(reviews.docs.map((d) => d.ref.delete()))
    await Promise.all((pseudoByUid.get(uid) || []).map((h) => db.collection('pseudos').doc(h).delete()))
    await db.collection('follows').doc(uid).delete()
    await Promise.all((quizByUid.get(uid) || []).map((r) => r.delete()))
    console.log(`  ✓ ${uid}`)
  }
  console.log('Terminé.')
} else {
  console.log('\nAucune modification effectuée.')
}
