---
name: docker-local-ci
description: Docker local dev sur jilu.localhost, Makefile up/down, GitLab CI lint+test+build
metadata:
  type: project
---

# Docker Local + CI Design

## Objectif

- Dev local via Docker, accessible sur `http://jilu.localhost`
- Vercel prod inchangé
- Makefile `up` / `down` / `logs`
- GitLab CI: lint + test + build sur MR et `main`

## Approche retenue

**Port mapping direct** (pas de reverse proxy extra). Docker mappe `80:5173`. `.localhost` résout vers `127.0.0.1` automatiquement (RFC 2606). Vite whitelist `jilu.localhost` via `allowedHosts`.

## Fichiers modifiés

### docker-compose.yml

Port `5173:5173` → `80:5173`. Reste inchangé.

### vite.config.js

Ajouter dans `server`:
```js
allowedHosts: ['jilu.localhost', 'localhost']
```

`localhost` ajouté pour accès direct sans Docker (dev natif). Vercel non affecté — `server.*` ignoré en build prod.

### Makefile (nouveau)

- `up`: `docker compose up -d --build`
- `down`: `docker compose down`
- `logs`: `docker compose logs -f web`
- `ci`: lint + test + npm audit (local dry-run du pipeline)

### .gitlab-ci.yml (nouveau)

- Image: `node:20-alpine`
- Cache `.npm/` par branche (`--cache .npm --prefer-offline`) — cache npm downloads, pas `node_modules/` (plus portable entre runners)
- Stages: `lint` → `test` → `build`
- `npm ci --cache .npm --prefer-offline` strict
- Artifact `dist/` 1 jour (build stage)
- Déclenché sur MR + push `main`

## Ce qui ne change pas

- `Dockerfile.dev`: inchangé
- `vercel.json`: inchangé
- `.env.local`: inchangé (pas en CI — secrets via GitLab CI variables)

## Notes

- Port 80 doit être libre sur la machine host
- CI n'a pas accès aux secrets Firebase — `npm run build` nécessite variables définies dans GitLab CI/CD Settings si build utilise des env vars au build time (vérifier si `VITE_*` vars nécessaires)

## Statut — Implémenté (2026-07-20)

| Commit | Ce qui a changé |
|--------|-----------------|
| `dbca02b` | `docker-compose.yml` port `80:5173`, `vite.config.js` `allowedHosts` |
| `bb6af7b` | `Makefile` créé avec targets `up/down/logs/ci` |
| `4582113` | Fix Makefile: commandes `ci` sur lignes séparées |
| `31f1edf` | `.gitlab-ci.yml` créé (lint→test→build) |
| `c9ee229` | Cache `.npm/` au lieu de `node_modules/`, `allowedHosts` + `localhost` |

## Déviations vs plan initial

| Point | Plan | Réel |
|-------|------|------|
| Cache CI | `node_modules/` | `.npm/` + `--cache .npm --prefer-offline` |
| `allowedHosts` | `['jilu.localhost']` | `['jilu.localhost', 'localhost']` |
