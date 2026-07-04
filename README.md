# Jilu

Suivi culturel personnel — séries, films, animés, livres, jeux vidéo, musique.

Stack : React 18 + Vite · Firebase Auth + Firestore · Vercel

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
npm install
cp .env.example .env.local   # puis remplir les variables
npm run dev                  # http://localhost:5173
```

---

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner chaque valeur.

| Variable | Description |
|---|---|
| `VITE_FIREBASE_API_KEY` | Clé API Firebase |
| `VITE_FIREBASE_AUTH_DOMAIN` | Domaine Auth Firebase (`*.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | ID du projet Firebase |
| `VITE_FIREBASE_STORAGE_BUCKET` | Bucket Storage Firebase |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Sender ID Firebase |
| `VITE_FIREBASE_APP_ID` | App ID Firebase |
| `VITE_TMDB_API_KEY` | Clé API TMDB (séries & films) |
| `VITE_RAWG_API_KEY` | Clé API RAWG (jeux vidéo) |
| `SPOTIFY_CLIENT_ID` | Client ID Spotify (côté serveur uniquement) |
| `SPOTIFY_CLIENT_SECRET` | Client Secret Spotify (**ne pas préfixer `VITE_`**) |

> `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` sont lus uniquement par `api/spotify-token.js` (fonction Vercel serverless) — ils ne doivent jamais apparaître dans le bundle client.

---

## Règles Firestore

Publier les règles depuis la console Firebase ou via la CLI :

```bash
firebase deploy --only firestore:rules
```

Le fichier `firestore.rules` est inclus dans le dépôt. Il garantit que chaque utilisateur ne peut lire et écrire que son propre document (`users/{uid}`).

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
npm test              # vitest (mode watch)
npm run test:run      # vitest (une passe, CI)
```
