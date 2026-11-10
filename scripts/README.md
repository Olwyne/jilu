# Scripts d'administration

Dossier isolé du site (son propre `package.json`) : `cd scripts && pnpm install`.

## `audit-accounts.mjs` — croiser Authentication et Firestore

Liste chaque compte avec sa date de création, sa **dernière connexion**, son pseudo, le nombre d'œuvres et d'avis,
le nombre de fiches de bibliothèque, et repère les **orphelins** : données Firestore dont le compte Authentication n'existe plus
(ex. suppression de compte échouée avec l'ancien code).

Prérequis : une clé de compte de service (console Firebase → Paramètres du projet → Comptes de service → Générer une clé).
Ne jamais la committer.

```bash
export GOOGLE_APPLICATION_CREDENTIALS=/chemin/vers/cle.json

# 1. Lecture seule (aucune modification)
node audit-accounts.mjs --project <id-du-projet> --out rapport.json

# 2. Sauvegarder les données des orphelins (toujours sans rien supprimer)
node audit-accounts.mjs --project <id-du-projet> --backup ./sauvegarde

# 3. Supprimer les orphelins (exige --backup et --confirm avec l'id du projet)
node audit-accounts.mjs --project <id-du-projet> --backup ./sauvegarde --delete-orphans --confirm <id-du-projet>
```

Garde-fous : lecture seule par défaut ; la suppression est refusée sans sauvegarde, sans `--confirm` correspondant au
projet, ou si Authentication ne renvoie aucun compte (mauvais projet/identifiants : tout paraîtrait orphelin).
Seuls les comptes absents d'Authentication sont supprimés ; les comptes inactifs ne sont jamais touchés.

## Depuis Docker (sans rien installer)

```bash
docker compose run --rm --no-deps \
  -v /chemin/vers/cle.json:/key.json:ro -e GOOGLE_APPLICATION_CREDENTIALS=/key.json \
  -e FIRESTORE_EMULATOR_HOST= -e FIREBASE_AUTH_EMULATOR_HOST= \
  web node scripts/audit-accounts.mjs --project <id-du-projet>
```

Les deux `-e …_EMULATOR_HOST=` vides sont indispensables : le service `web` vise les émulateurs par défaut.

## Tester sur les émulateurs (sans toucher à la prod)

`seed-emulator.mjs` crée des comptes de test (actif, sans pseudo, orphelins) et refuse de tourner hors émulateur.
Lancer les émulateurs Auth + Firestore, exporter `FIRESTORE_EMULATOR_HOST` et `FIREBASE_AUTH_EMULATOR_HOST`
(fait automatiquement par `firebase emulators:exec`), puis `node seed-emulator.mjs` et `node audit-accounts.mjs --project demo-jilu`.
