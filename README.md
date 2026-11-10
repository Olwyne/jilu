# Jilu

Suivi culturel personnel — séries, films, animés, livres, jeux vidéo, musique.

Stack : React 19 + Vite · Firebase Auth + Firestore · Vercel

---

## Prérequis

- Docker (rien d'autre à installer : Node, pnpm, Java et les émulateurs Firebase sont dans l'image)
- Pour la prod : un projet Firebase (Auth e-mail/mot de passe, Firestore) et un projet Vercel
- Clés API facultatives en local : TMDB, IGDB (Twitch), Google Books, Spotify (recherche de catalogue)

---

## Développement local (Docker)

```bash
git clone <url-du-dépôt> && cd jilu-app
cp .env.example .env.local   # facultatif : clés des API de catalogue
make up                      # site http://localhost:5173 · émulateurs http://localhost:4000
```

| Commande | Effet |
|---|---|
| `make up` | (Re)construit l'image et lance le site + les émulateurs Auth/Firestore |
| `make down` | Arrête tout ; les comptes et données locales sont conservés |
| `make logs` | Suit les journaux |
| `make reset` | Arrête tout et **efface** les données locales des émulateurs |
| `make ci` | Lint, tests, tests des règles Firestore, build, audit — dans le conteneur |

Le site local est branché sur les **émulateurs** Firebase (projet `demo-jilu`) : aucune donnée de production
n'est lue ni écrite, et les variables `VITE_FIREBASE_*` sont ignorées. C'est vrai pour tout serveur de dev
(`vite`), même lancé hors Docker : seul le build de production utilise le vrai projet Firebase. Les règles `firestore.rules` sont
rechargées à chaud. Les recherches de catalogue passent par les fonctions de `api/` (servies par Vite, même code qu'en prod) et
les vraies API (clés dans `.env.local`) ; `api/refresh-work` écrit dans l'émulateur.
Après un changement de dépendances, relancer `make up` (l'image est reconstruite).

---

## Variables d'environnement

Copier `.env.example` en `.env.local` et renseigner chaque valeur.

| Variable | Portée | Description |
|---|---|---|
| `VITE_FIREBASE_API_KEY` … `VITE_FIREBASE_APP_ID` | client | Configuration Firebase (publique par conception — restreindre la clé par référent dans Google Cloud) |
| `VITE_EMAILJS_PUBLIC_KEY`, `VITE_EMAILJS_SERVICE_ID`, `VITE_EMAILJS_TEMPLATE_ID` | client | Formulaire de feedback |
| `TMDB_API_KEY` | serveur | Clé TMDB (séries & films) |
| `TWITCH_CLIENT_ID` / `TWITCH_CLIENT_SECRET` | serveur | Application Twitch pour IGDB (jeux vidéo, durées de jeu) — [dev.twitch.tv/console/apps](https://dev.twitch.tv/console/apps) |
| `GOOGLE_BOOKS_API_KEY` | serveur | Clé Google Books |
| `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` | serveur | Spotify (**ne pas préfixer `VITE_`**) |
| `FIREBASE_SERVICE_ACCOUNT` | serveur | Clé de compte de service (JSON ou base64) : permet à `api/refresh-work.js` de mettre à jour le catalogue partagé. Jamais dans le dépôt ni côté client |
| `CRON_SECRET` | serveur | Chaîne aléatoire (ex. `openssl rand -hex 32`) : Vercel l'envoie au cron quotidien `api/cron-refresh.js` (4 h UTC) qui rafraîchit les séries, animés et mangas en cours ; sans elle, le cron refuse de tourner |

> Les variables « serveur » sont lues par les fonctions Vercel de `api/` (servies telles quelles en dev par `vite.config.js`). Un préfixe `VITE_` les ferait entrer dans le bundle client.

> `SPOTIFY_CLIENT_ID` et `SPOTIFY_CLIENT_SECRET` sont lus uniquement par `api/spotify-token.js` (fonction Vercel serverless) — ils ne doivent jamais apparaître dans le bundle client.

---

## Règles Firestore

Publier les règles depuis la console Firebase ou via la CLI :

```bash
firebase deploy --only firestore:rules
```

Le fichier `firestore.rules` est inclus dans le dépôt. Chaque utilisateur lit/écrit son propre espace (`users/{uid}`) ; les profils publics sont lisibles par tous ; les pseudos sont uniques et non réattribuables ; les avis et scores du quiz sont validés (types, bornes, auteur).

Tests des règles : inclus dans `make ci`.

---

## Déploiement Vercel

```bash
vercel                # lier / créer le projet
vercel env add        # ajouter chaque variable du tableau ci-dessus
vercel --prod         # déployer en production
```

Ou connecter le dépôt directement dans le dashboard Vercel (Project → Settings → Environment Variables) et laisser Vercel builder au push.

---

## Tests

```bash
make ci   # lint, tests, règles Firestore (émulateur), build, audit
```
