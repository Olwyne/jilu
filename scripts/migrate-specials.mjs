#!/usr/bin/env node
// Reprise UNIQUE : la saison « Spéciaux » des animés passe du numéro « dernière saison + 1 » au numéro fixe 0
// (src/catalog/anilist.js). Ce script renumérote les fiches du catalogue et déplace, dans chaque bibliothèque,
// la progression et les notes des spéciaux vers la saison 0.
//
//   LECTURE SEULE par défaut : affiche ce qui serait modifié. Rien n'est écrit sans --apply.
//   À lancer juste après le déploiement du nouveau code (voir scripts/README.md).
//
// Usage :
//   export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle-de-service.json
//   node scripts/migrate-specials.mjs --project <id-du-projet-firebase>
//   node scripts/migrate-specials.mjs --project <id> --apply
//
// Non repris : les avis publics (collection reviews) et les commentaires du fil déjà postés sur un épisode spécial.

import assert from 'node:assert/strict'
import { parseArgs } from 'node:util'
import { initializeApp } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

// Déplace la saison `old` vers la saison 0 : eps '3-1' -> '0-1', notes 's:3' -> 's:0' et 'e:3-1' -> 'e:0-1'.
// Retourne null s'il n'y a rien à déplacer (le script peut donc être relancé sans effet).
function moveSeason({ eps = {}, ratings = {} }, old) {
  let moved = 0
  const rename = (map, from, to) => Object.fromEntries(Object.entries(map).map(([k, v]) => {
    if (k !== from && !k.startsWith(from + '-')) return [k, v]
    moved++
    return [to + k.slice(from.length), v]
  }))
  const out = {
    eps: rename(eps, String(old), '0'),
    ratings: rename(rename(ratings, `s:${old}`, 's:0'), `e:${old}`, 'e:0'),
  }
  return moved ? out : null
}

assert.deepEqual(
  moveSeason({ eps: { '3-1': 5, '1-3': 6, '30-1': 7 }, ratings: { 's:3': 4, 'e:3-2': 5, w: 3, 's:1': 2 } }, 3),
  { eps: { '0-1': 5, '1-3': 6, '30-1': 7 }, ratings: { 's:0': 4, 'e:0-2': 5, w: 3, 's:1': 2 } },
)
assert.equal(moveSeason({ eps: { '1-1': 5 } }, 3), null)

const { values: args } = parseArgs({ options: { project: { type: 'string' }, apply: { type: 'boolean', default: false } } })
if (!args.project) {
  console.error('Erreur : --project <id-du-projet-firebase> est obligatoire.')
  process.exit(1)
}
initializeApp({ projectId: args.project })
const db = getFirestore()
console.log(`Projet : ${args.project}${process.env.FIRESTORE_EMULATOR_HOST ? '  (ÉMULATEUR)' : ''} · ${args.apply ? 'ÉCRITURE' : 'lecture seule'}\n`)

// 1. Catalogue : animés dont la dernière saison est « Spéciaux » -> ancien numéro de cette saison
const oldNumber = new Map()
for (const c of (await db.collection('catalog').where('category', '==', 'animes').get()).docs) {
  const seasons = c.get('seasons') || []
  const last = seasons.at(-1)
  if (last?.name !== 'Spéciaux') continue
  // Fiche déjà rafraîchie par le nouveau code (n = 0) : l'ancien numéro était sa position dans la liste
  oldNumber.set(c.id, last.n || seasons.length)
  if (last.n === 0) continue
  console.log(`catalogue  ${c.id} : spéciaux ${last.n} -> 0`)
  if (args.apply) await c.ref.update({ seasons: [...seasons.slice(0, -1), { ...last, n: 0 }], updatedAt: Date.now() })
}

// 2. Bibliothèques : progression et notes des spéciaux
let docs = 0
for (const l of (await db.collectionGroup('library').get()).docs) {
  const old = oldNumber.get(l.get('catalogId'))
  const next = old && moveSeason(l.data(), old)
  if (!next) continue
  docs++
  console.log(`bibliothèque  ${l.ref.path} : saison ${old} -> 0`)
  // updatedAt : les appareils reprennent la fiche à leur prochaine synchronisation
  if (args.apply) await l.ref.update({ ...next, updatedAt: Date.now() })
}

console.log(`\n${oldNumber.size} animé(s) avec spéciaux, ${docs} fiche(s) de bibliothèque ${args.apply ? 'modifiée(s)' : 'à modifier (relancer avec --apply)'}.`)
