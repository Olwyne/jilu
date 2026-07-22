# Manga Tracking — Design Spec
Date: 2026-07-22

## Contexte

Jilu tracks animes par épisodes via AniList. Les mangas (scans hebdomadaires + tomes) nécessitent une nouvelle catégorie `mangas` avec suivi dissocié chapitres/tomes.

Cas d'usage principal : One Piece — ~1 scan (chapitre) par semaine, tomes publiés en retard regroupant ~8-11 chapitres.

## Décisions clés

| Décision | Choix |
|---|---|
| Catégorie | `mangas` — séparée de `animes` |
| Source primaire | AniList (type: MANGA) |
| Mapping chapitre→tome | MangaDex API (complément) |
| Modèle de données | Réutilisation season=tome / episode=chapitre |
| Chapitres hors-tome | Tome virtuel `n=0` nommé "Scans" |
| Recherche | Onglet "Manga" séparé dans SearchModal |
| 1 chapitre = | 1 scan |

## Modèle de données

Work manga : même shape qu'un anime, `category: 'mangas'`.

```js
{
  id: 'anilist-manga-13',
  category: 'mangas',
  title: 'One Piece',
  source: 'anilist',
  sourceId: 13,            // AniList manga ID
  seasons: [
    // Tome Scans (n=0) : chapitres publiés pas encore en tome
    {
      n: 0,
      name: 'Scans',
      episodes: [
        { n: 1109, title: 'Chapitre 1109', air: 1709000000000 }
      ]
    },
    // Tomes réels (n=1…N)
    {
      n: 1,
      name: 'Tome 1',
      episodes: [
        { n: 1, title: 'Chapitre 1', air: 0 },
        // ...
        { n: 7, title: 'Chapitre 7', air: 0 }
      ]
    }
  ],
  ended: false,      // false si manga en cours
  chapters: 1109,   // total chapitres AniList
  volumes: 107      // total tomes AniList
}
```

`watched` inchangé — clé `{workId}-{seasonN}-{chapterN}`.
Exemple chapitre 1109 (tome Scans) : `anilist-manga-13-0-1109`.

## Couche catalogue

### `src/catalog/anilist.js` — nouvelles fonctions

**`anilistSearchManga(query)`**
- Query AniList : `type: MANGA`, `perPage: 10`
- Shape retournée identique à `anilistSearch` avec `category: 'mangas'`

**`anilistGetMangaDetail(anilistId)`**
1. Fetch AniList : `chapters`, `volumes`, `status`, `title`
2. Fetch MangaDex : mapping `chapterNum → volumeNum` via `mangadexGetChapterMap(title)`
3. Construit `seasons[]` :
   - Pour chaque volume 1…N : `{ n, name: 'Tome N', episodes: chapitres du tome }`
   - Tome Scans `{ n: 0, name: 'Scans', episodes: chapitres sans tome }` placé en index 0
4. Retourne `{ seasons, ended, chapters, volumes }`

### `src/catalog/mangadex.js` — nouveau fichier

**`mangadexGetChapterMap(mangaTitle)`**
- `GET https://api.mangadex.org/manga?title={title}&limit=1` → manga ID
- `GET https://api.mangadex.org/manga/{id}/aggregate` → volumes avec chapitres
- Retourne `Map<chapterNum (int), volumeNum (int)>` (chapitres sans tome → `null`)
- Pas de clé API requise (API publique)

### `src/catalog/search.js`

Branche `mangas` ajoutée, appelle `anilistSearchManga`.

### `src/hooks/useWorkActions.js`

```js
const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: (work) => anilistGetDetail(work.anilistId || work.sourceId).then(d => ({ ...work, ...d })),
  'anilist-manga': (work) => anilistGetMangaDetail(work.sourceId).then(d => ({ ...work, ...d })),
  spotify: spotifyGetDetail
}
```

Work manga stocke `source: 'anilist-manga'` pour router vers le bon fetcher.

## UI

### `SeasonList.jsx`

Détecte `work.category === 'mangas'` :
- Labels : "Saison" → "Tome", "Épisode" → "Chapitre"
- Tome `n=0` (Scans) affiché en premier avec traitement visuel distinct (badge/couleur)
- Logique `watched` / `toggleEpisode` / `markSeason` : inchangée

### `SearchModal`

Nouvel onglet "Manga" dans la barre de catégories, appelle `anilistSearchManga`.

### `LibraryView`

Catégorie `mangas` ajoutée aux filtres. Icône dédiée (ex: 📖 ou SVG manga).

### `DetailView`

`category: 'mangas'` traité identiquement à `animes` — panneau `SeasonList`. Pas de `GamePanel`.

### i18n (`src/i18n/`)

```json
{
  "manga.tome": "Tome",
  "manga.chapitre": "Chapitre",
  "manga.scans": "Scans",
  "manga.chapter_count": "{{count}} chapitre",
  "manga.chapter_count_plural": "{{count}} chapitres"
}
```

## Ce qui fonctionne sans modification

- `watched` / `toggleEpisode` / `markSeason` — inchangés
- `computeAutoStatus` — fonctionne (chapitres = épisodes)
- Stats, Calendar, Journal — fonctionnent (chapitres comptent comme épisodes)
- Ratings, reviews, feed — inchangés

## Hors scope

- Notifications scan hebdo
- Import depuis MyAnimeList
- Lecteur de scans intégré
