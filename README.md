# Jilu

Suivi culturel personnel — séries, films, animés, livres, jeux vidéo, musique.

Stack : React 19 + Vite · Firebase Auth + Firestore · Vercel

---

## Prérequis

- Node.js 20+
- Un projet Firebase (Auth email/mot de passe activé, Firestore en mode production)
- Clés API optionnelles : TMDB, RAWG, Spotify (pour la recherche de catalogue)

---

## Installation locale

```bash
git clone <url-du-dépôt>
cd jilu-app
corepack enable              # pnpm (le dépôt utilise pnpm-lock.yaml)
pnpm install
cp .env.example .env.local   # puis remplir les variables
pnpm run dev                 # http://localhost:5173
```

---

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner chaque valeur.

| Variable | Portée | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | client | Configuration Firebase (publique par conception — restreindre la clé par référent dans Google Cloud) |
| `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` | client | Formulaire de feedback |
| `TMDB_API_KEY` | serveur | Clé TMDB (séries & films) |
| `RAWG_API_KEY` | serveur | Clé RAWG (jeux vidéo) |
| `GOOGLE_BOOKS_API_KEY` | serveur | Clé Google Books |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | serveur | Spotify (**ne pas préfixer `VITE_`**) |
| `FIREBASE_SERVICE_ACCOUNT` | serveur | Clé de compte de service (JSON ou base64) : permet à `api/refresh-work.js` de mettre à jour le catalogue partagé. Jamais dans le dépôt ni côté client |

> Les variables « serveur » sont lues par les fonctions Vercel de `api/` (et par le plugin de dev dans `vite.config.js`). Un préfixe `VITE_` les ferait entrer dans le bundle client.

> `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` sont lus uniquement par `api/spotify-token.js` (fonction Vercel serverless) — ils ne doivent jamais apparaître dans le bundle client.

---

## Règles Firestore

Publier les règles depuis la console Firebase ou via la CLI :

```bash
firebase deploy --only firestore:rules
```

Le fichier `firestore.rules` est inclus dans le dépôt. Chaque utilisateur lit/écrit son propre espace (`users/{uid}`) ; les profils publics sont lisibles par tous ; les pseudos sont uniques et non réattribuables ; les avis et scores du quiz sont validés (types, bornes, auteur).

Tester les règles (émulateur Firestore + Java requis) :

```bash
pnpm run test:rules
```

---

## Déploiement Vercel

```bash
vercel                # lier / créer le projet
vercel env add        # ajouter chaque variable du tableau ci-dessus
vercel --prod         # déployer en production
```

Ou connecter le dépôt directement dans le dashboard Vercel (Project → Settings → Environment Variables) et laisser Vercel builder au push.

---

## Dev Docker

```bash
docker compose up     # http://localhost:5173 avec hot-reload
```

`.env.local` doit exister avant de lancer le conteneur.

---

## Tests

```bash
pnpm test             # vitest (une passe)
pnpm run lint         # oxlint
pnpm run test:rules   # règles Firestore (émulateur)
```
