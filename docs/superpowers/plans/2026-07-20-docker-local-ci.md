# Docker Local + CI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** App accessible sur `http://jilu.localhost` en local via Docker, Makefile up/down/logs/ci, GitLab CI lint+test+build.

**Architecture:** Port mapping direct `80:5173` — pas de reverse proxy extra. `.localhost` résout vers `127.0.0.1` (RFC 2606). Vite whiteliste `jilu.localhost` via `allowedHosts`. Vercel prod inchangé. GitLab CI séquentiel lint→test→build avec cache `node_modules`.

**Tech Stack:** Docker Compose, Vite 8, Node 20 Alpine, GitLab CI

## Global Constraints

- Ne pas modifier `Dockerfile.dev`, `vercel.json`, `.env.local`
- `server.allowedHosts` dans `vite.config.js` ne doit pas casser Vercel (build prod ignore `server.*`)
- GitLab CI utilise `npm ci` (pas `npm install`) — reproductible strict
- `npm audit` dans `make ci` — exit code non-zero si vulnérabilité critique (comportement par défaut)

---

### Task 1: Docker local sur jilu.localhost

**Files:**
- Modify: `docker-compose.yml:7` (port mapping)
- Modify: `vite.config.js:34-42` (server config)

**Interfaces:**
- Produces: `http://jilu.localhost` → app Vite en dev mode avec HMR

- [ ] **Step 1: Modifier le port dans docker-compose.yml**

Remplacer:
```yaml
    ports:
      - "5173:5173"
```
Par:
```yaml
    ports:
      - "80:5173"
```

- [ ] **Step 2: Ajouter allowedHosts dans vite.config.js**

Remplacer le bloc `server:` existant:
```js
  server: {
    proxy: {
      '/anilist-proxy': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anilist-proxy/, '')
      }
    }
  },
```
Par:
```js
  server: {
    allowedHosts: ['jilu.localhost'],
    proxy: {
      '/anilist-proxy': {
        target: 'https://graphql.anilist.co',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/anilist-proxy/, '')
      }
    }
  },
```

- [ ] **Step 3: Vérifier que le port 80 est libre**

```bash
lsof -i :80
```
Expected: aucune sortie (port libre). Si occupé, stopper le process avant de continuer.

- [ ] **Step 4: Builder et lancer**

```bash
docker compose up -d --build
```
Expected: image buildée, container `jilu-web-1` (ou similaire) en `Up`.

- [ ] **Step 5: Vérifier l'accès**

Ouvrir `http://jilu.localhost` dans le navigateur.
Expected: app Jilu chargée, HMR actif (modifier un fichier src → rechargement auto).

- [ ] **Step 6: Stopper**

```bash
docker compose down
```

- [ ] **Step 7: Commit**

```bash
git add docker-compose.yml vite.config.js
git commit -m "feat: expose app on jilu.localhost via Docker port 80"
```

---

### Task 2: Makefile

**Files:**
- Create: `Makefile`

**Interfaces:**
- Consumes: `docker compose` (Task 1), `npm run lint`, `npm test`, `npm audit`
- Produces: targets `up`, `down`, `logs`, `ci`

- [ ] **Step 1: Créer le Makefile**

```makefile
.PHONY: up down logs ci

up:
	docker compose up -d --build

down:
	docker compose down

logs:
	docker compose logs -f web

ci:
	npm run lint
	npm test
	npm audit
```

> **Important:** Les indentations sont des TABs (pas des espaces) — Make l'exige.

- [ ] **Step 2: Tester chaque target**

```bash
make up
```
Expected: container démarre, app sur `http://jilu.localhost`.

```bash
make logs
```
Expected: logs Vite en streaming (Ctrl+C pour quitter).

```bash
make down
```
Expected: container stoppé et supprimé.

```bash
make ci
```
Expected: lint passe, tests passent, npm audit affiche résumé vulnérabilités (exit 0 si aucune critique).

- [ ] **Step 3: Commit**

```bash
git add Makefile
git commit -m "feat: add Makefile with up/down/logs/ci targets"
```

---

### Task 3: GitLab CI

**Files:**
- Create: `.gitlab-ci.yml`

**Interfaces:**
- Produces: pipeline 3 stages sur MR et push `main` — bloque merge si lint/test/build fail

- [ ] **Step 1: Créer .gitlab-ci.yml**

```yaml
stages:
  - lint
  - test
  - build

default:
  image: node:20-alpine
  cache:
    key: "$CI_COMMIT_REF_SLUG"
    paths:
      - node_modules/

lint:
  stage: lint
  script:
    - npm ci
    - npm run lint

test:
  stage: test
  script:
    - npm ci
    - npm test

build:
  stage: build
  script:
    - npm ci
    - npm run build
  artifacts:
    paths:
      - dist/
    expire_in: 1 day
```

- [ ] **Step 2: Vérifier la syntaxe YAML localement**

```bash
node -e "require('fs').readFileSync('.gitlab-ci.yml', 'utf8'); console.log('YAML valid')"
```
Expected: `YAML valid` (détecte les erreurs d'indentation grossières).

- [ ] **Step 3: Note sur les variables d'env**

Si `vite build` utilise des `VITE_*` vars (Firebase etc.), les déclarer dans GitLab → Settings → CI/CD → Variables avant le premier pipeline. Sans elles, le build passera mais produira une app cassée.

Pour vérifier quelles vars sont nécessaires:
```bash
grep -r "import.meta.env.VITE_" src/ --include="*.js" --include="*.jsx" -h | grep -o "VITE_[A-Z_]*" | sort -u
```

- [ ] **Step 4: Commit**

```bash
git add .gitlab-ci.yml
git commit -m "feat: add GitLab CI pipeline with lint, test, build stages"
```
