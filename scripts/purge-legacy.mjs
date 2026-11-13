#!/usr/bin/env node
// Supprime les données de l'ANCIEN modèle (v1), plus lues ni écrites depuis la bascule du 2026-10-20 :
//   - sous-collections users/{uid}/works, users/{uid}/watched, users/{uid}/migrations
//   - champs works, watched, ratings, favorites, games du document users/{uid}
//     (ces données vivent dans users/{uid}/library ; le champ `reviews` est gardé : le fil d'amis le lit)
//
//   LECTURE SEULE par défaut : compte ce qui serait supprimé. IRRÉVERSIBLE avec --delete, qui exige
//   --backup <dossier> (copie JSON écrite avant toute suppression) et --confirm <id-du-projet>.
//   Un compte qui a des œuvres v1 mais aucune fiche v2 (library) n'est jamais touché.
//
// Usage :
//   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle-de-service.json
//   node scripts/purge-legacy.mjs --project <id>
//   node scripts/purge-legacy.mjs --project <id> --backup ./sauvegarde --delete --confirm <id>

import { parseArgs } from 'node:util'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

const SUBCOLLECTIONS = ['works', 'watched', 'migrations']
const FIELDS = ['works', 'watched', 'ratings', 'favorites', 'games']

const { values: args } = parseArgs({
  options: { project: { type: 'string' }, backup: { type: 'string' }, delete: { type: 'boolean', default: false }, confirm: { type: 'string' } },
})
if (!args.project) {
  console.error('Erreur : --project <id-du-projet-firebase> est obligatoire.')
  process.exit(1)
}
if (args.delete && (!args.backup || args.confirm !== args.project)) {
  console.error('Erreur : --delete exige --backup <dossier> et --confirm <id-du-projet> identique à --project.')
  process.exit(1)
}

initializeApp({ projectId: args.project })
const db = getFirestore()
console.log(`Projet : ${args.project}${process.env.FIRESTORE_EMULATOR_HOST ? '  (ÉMULATEUR)' : ''} · ${args.delete ? 'SUPPRESSION' : 'lecture seule'}\n`)
if (args.backup) mkdirSync(args.backup, { recursive: true })

let totalDocs = 0
let totalFields = 0
// listDocuments : inclut les comptes sans document users/{uid} mais avec des sous-collections
for (const userRef of await db.collection('users').listDocuments()) {
  const uid = userRef.id
  const legacy = {}
  for (const name of SUBCOLLECTIONS) legacy[name] = (await userRef.collection(name).get()).docs
  const docs = Object.values(legacy).flat()
  const main = (await userRef.get()).data() || {}
  const fields = FIELDS.filter((f) => f in main)
  if (!docs.length && !fields.length) continue

  const v2 = (await userRef.collection('library').count().get()).data().count
  const line = `${uid} : ${SUBCOLLECTIONS.map((n) => `${n} ${legacy[n].length}`).join(', ')} · champs [${fields.join(', ')}] · library ${v2}`
  if (legacy.works.length && !v2) {
    console.log(`IGNORÉ  ${line}  (œuvres v1 sans aucune fiche v2)`)
    continue
  }
  console.log(line)
  totalDocs += docs.length
  totalFields += fields.length

  if (args.backup) {
    const dump = { uid, fields: Object.fromEntries(fields.map((f) => [f, main[f]])) }
    for (const name of SUBCOLLECTIONS) dump[name] = Object.fromEntries(legacy[name].map((d) => [d.id, d.data()]))
    writeFileSync(join(args.backup, `${uid}.json`), JSON.stringify(dump))
  }
  if (args.delete) {
    const writer = db.bulkWriter()
    docs.forEach((d) => writer.delete(d.ref))
    await writer.close()
    if (fields.length) await userRef.update(Object.fromEntries(fields.map((f) => [f, FieldValue.delete()])))
  }
}

console.log(`\n${totalDocs} document(s) et ${totalFields} champ(s) de l'ancien modèle ${args.delete ? 'supprimés' : 'à supprimer'}.`)
