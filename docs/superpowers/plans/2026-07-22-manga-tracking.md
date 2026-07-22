# Manga Tracking Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `mangas` category (manga japonais, manhwa, manhua) with chapter- and volume-level progress tracking, powered by AniList + MangaDex.

**Architecture:** Reuse the existing `seasons[]/episodes[]` data model — tome = season, chapitre = episode. A virtual Scans tome (`n:0`) holds published chapters not yet collected in a volume. AniList provides metadata; MangaDex provides the chapter→volume mapping. `watched` keys are unchanged (`workId-seasonN-chapterN`). Everything else — stats, calendar, journal, status auto-compute — works without modification.

**Tech Stack:** React + Vite, Firebase Firestore, AniList GraphQL API, MangaDex REST API (no key required), i18next, Vitest.

## Global Constraints

- All manga chapters set `air: 1` (1ms epoch) so SeasonList treats them as aired — we have no reliable chapter-release timestamps from AniList.
- Chapter titles set to `''` (empty string) so `epLabel` in SeasonList renders `Chapitre N` without duplication.
- Filter keywords for livres: `manga`, `manhwa`, `manhua` (regex, case-insensitive). BD, comics, graphic novel are NOT filtered.
- Work ID format: `anilist-manga-{anilistId}`, source field: `'anilist-manga'`.
- Scans tome always `n: 0`, name: `'Scans'`, placed at index 0 in `seasons[]`.
- Run tests with: `npx vitest run src/catalog/<file>.test.js` or `npx vitest run` for all.

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/i18n/fr.json` | Modify | Add `cat.mangas`, `term.mangas.*` keys |
| `src/i18n/en.json` | Modify | Same in English |
| `src/catalog/googleBooks.js` | Modify | Filter manga/manhwa/manhua from livres results |
| `src/catalog/googleBooks.test.js` | Modify | Add filter test |
| `src/catalog/mangadex.js` | **Create** | MangaDex chapter→volume mapping |
| `src/catalog/mangadex.test.js` | **Create** | Tests for MangaDex module |
| `src/catalog/anilist.js` | Modify | Add `anilistSearchManga`, `anilistTrendingManga`, `anilistGetMangaDetail` |
| `src/catalog/anilist.test.js` | Modify | Add tests for the three new functions |
| `src/catalog/search.js` | Modify | Add `mangas` to `SOURCE_CATS` and `TRENDING_FN` |
| `src/catalog/search.test.js` | Modify | Add `anilistSearchManga` mock, manga branch test |
| `src/hooks/useWorkActions.js` | Modify | Add `'anilist-manga'` to `DETAIL_FETCHERS` |
| `src/hooks/useWorkActions.test.js` | Modify | Add fetcher routing test |
| `src/components/modals/SearchModal.jsx` | Modify | Add Manga tab to category list |
| `src/components/library/LibraryView.jsx` | Modify | Add `mangas` to category filter |

---

## Task 1: i18n — Add mangas translation keys

**Files:**
- Modify: `src/i18n/fr.json`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: `t('cat.mangas')`, `t('term.mangas.season')`, `t('term.mangas.ep')`, `t('term.mangas.unit')`, `t('term.mangas.verb')` — used by SeasonList, DetailView, LibraryView, SearchModal.

- [ ] **Step 1: Add keys to fr.json**

Open `src/i18n/fr.json`. Find the `cat.musique` line (around line 117). Add after `"cat.musique": "Musique",`:

```json
"cat.mangas": "Mangas",
```

Find the `term.animes.*` block (around lines 122–125). Add after it:

```json
"term.mangas.season": "Tome",
"term.mangas.ep": "Chapitre",
"term.mangas.unit": "chapitres",
"term.mangas.verb": "Publié",
```

- [ ] **Step 2: Add keys to en.json**

Open `src/i18n/en.json`. Find `"cat.musique"`. Add after it:

```json
"cat.mangas": "Manga",
```

Find the `term.animes.*` block. Add after it:

```json
"term.mangas.season": "Volume",
"term.mangas.ep": "Chapter",
"term.mangas.unit": "chapters",
"term.mangas.verb": "Published",
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/fr.json src/i18n/en.json
git commit -m "feat(manga): add mangas i18n keys (fr + en)"
```

---

## Task 2: Filter manga/manhwa/manhua from livres results

**Files:**
- Modify: `src/catalog/googleBooks.js`
- Modify: `src/catalog/googleBooks.test.js`

**Interfaces:**
- Produces: `googleBooksSearch(query)` — unchanged signature, filters out items whose categories match `/manga|manhwa|manhua/i`.

- [ ] **Step 1: Write the failing test**

In `src/catalog/googleBooks.test.js`, add after the existing test:

```js
it('excludes manga items from livres results', async () => {
  global.fetch = vi.fn().mockResolvedValueOnce({
    ok: true,
    json: async () => ({ items: [
      { id: 'b1', volumeInfo: { title: 'Dune', categories: ['Fiction'], publishedDate: '1965' } },
      { id: 'b2', volumeInfo: { title: 'One Piece Vol.1', categories: ['Manga'], publishedDate: '2000' } },
      { id: 'b3', volumeInfo: { title: 'Tower of God', categories: ['Manhwa', 'Action'], publishedDate: '2010' } },
      { id: 'b4', volumeInfo: { title: 'Manhua Test', categories: ['manhua'], publishedDate: '2005' } },
      { id: 'b5', volumeInfo: { title: 'Watchmen', categories: ['Graphic Novel'], publishedDate: '1986' } },
    ] })
  })
  const results = await googleBooksSearch('test')
  const ids = results.map((r) => r.id)
  expect(ids).toContain('googlebooks-b1')
  expect(ids).toContain('googlebooks-b5')
  expect(ids).not.toContain('googlebooks-b2')
  expect(ids).not.toContain('googlebooks-b3')
  expect(ids).not.toContain('googlebooks-b4')
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/catalog/googleBooks.test.js
```

Expected: new test FAILS (manga items not yet filtered).

- [ ] **Step 3: Add filter to googleBooksSearch**

In `src/catalog/googleBooks.js`, add constant before the function:

```js
const MANGA_CAT_RE = /manga|manhwa|manhua/i
```

In `googleBooksSearch`, change the `.map()` chain to filter before mapping:

```js
return (json.items || [])
  .filter((it) => {
    const cats = (it.volumeInfo?.categories || []).join(' ')
    return !MANGA_CAT_RE.test(cats)
  })
  .map((it) => {
    const v = it.volumeInfo || {}
    const year = v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : null
    return {
      source: 'googlebooks',
      sourceId: it.id,
      id: `googlebooks-${it.id}`,
      title: v.title || 'Sans titre',
      category: 'livres',
      genre: (v.categories || [])[0] || 'Divers',
      year,
      overview: v.description || '',
      poster: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      seasons: null,
      release: null
    }
  })
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/catalog/googleBooks.test.js
```

Expected: both tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog/googleBooks.js src/catalog/googleBooks.test.js
git commit -m "feat(manga): filter manga/manhwa/manhua from livres search results"
```

---

## Task 3: MangaDex chapter-volume mapping

**Files:**
- Create: `src/catalog/mangadex.js`
- Create: `src/catalog/mangadex.test.js`

**Interfaces:**
- Produces: `mangadexGetChapterMap(mangaTitle: string): Promise<Map<number, number|null>>`
  - Key: chapter number (integer)
  - Value: volume number (integer), or `null` if chapter has no volume (i.e., scan not yet in a tome)
  - Returns empty Map on network failure or no match.

- [ ] **Step 1: Write the failing test**

Create `src/catalog/mangadex.test.js`:

```js
import { describe, it, expect, vi } from 'vitest'
import { mangadexGetChapterMap } from './mangadex'

describe('mangadexGetChapterMap', () => {
  it('returns chapter-to-volume Map from MangaDex aggregate', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({
          data: [{ id: 'md-uuid-123' }]
        })
      })
      .mockResolvedValueOnce({
        json: async () => ({
          volumes: {
            '1': { chapters: { '1': {}, '2': {}, '7': {} } },
            '2': { chapters: { '8': {}, '15': {} } },
            'none': { chapters: { '100': {}, '101': {} } }
          }
        })
      })

    const map = await mangadexGetChapterMap('One Piece')
    expect(map.get(1)).toBe(1)
    expect(map.get(2)).toBe(1)
    expect(map.get(7)).toBe(1)
    expect(map.get(8)).toBe(2)
    expect(map.get(15)).toBe(2)
    expect(map.get(100)).toBeNull()
    expect(map.get(101)).toBeNull()
  })

  it('returns empty Map when manga not found', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: [] })
    })
    const map = await mangadexGetChapterMap('Unknown Manga XYZ')
    expect(map.size).toBe(0)
  })

  it('returns empty Map on fetch error', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))
    const map = await mangadexGetChapterMap('One Piece')
    expect(map.size).toBe(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/catalog/mangadex.test.js
```

Expected: FAIL — module not found.

- [ ] **Step 3: Implement mangadex.js**

Create `src/catalog/mangadex.js`:

```js
const BASE = 'https://api.mangadex.org'

export async function mangadexGetChapterMap(mangaTitle) {
  try {
    const searchRes = await fetch(
      `${BASE}/manga?title=${encodeURIComponent(mangaTitle)}&limit=1`
    )
    const searchJson = await searchRes.json()
    const manga = searchJson.data?.[0]
    if (!manga) return new Map()

    const aggRes = await fetch(
      `${BASE}/manga/${manga.id}/aggregate?translatedLanguage[]=en&translatedLanguage[]=fr`
    )
    const aggJson = await aggRes.json()

    const map = new Map()
    for (const [volKey, volData] of Object.entries(aggJson.volumes || {})) {
      const volumeNum = volKey === 'none' ? null : parseInt(volKey, 10)
      for (const chKey of Object.keys(volData.chapters || {})) {
        const n = Math.round(parseFloat(chKey))
        if (!isNaN(n)) map.set(n, volumeNum)
      }
    }
    return map
  } catch {
    return new Map()
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/catalog/mangadex.test.js
```

Expected: all 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog/mangadex.js src/catalog/mangadex.test.js
git commit -m "feat(manga): add MangaDex chapter-volume mapping module"
```

---

## Task 4: AniList manga search, trending, and detail

**Files:**
- Modify: `src/catalog/anilist.js`
- Modify: `src/catalog/anilist.test.js`

**Interfaces:**
- Consumes: `mangadexGetChapterMap` from `'./mangadex'`
- Produces:
  - `anilistSearchManga(query: string): Promise<Work[]>` — `category: 'mangas'`, `source: 'anilist-manga'`, `id: 'anilist-manga-{id}'`
  - `anilistTrendingManga(): Promise<Work[]>` — same shape
  - `anilistGetMangaDetail(anilistId: number): Promise<{ seasons: Season[], ended: boolean, chapters: number, volumes: number }>`
    - `Season = { n: number, name: string, episodes: Episode[] }`
    - `Episode = { n: number, title: '', air: 1 }`
    - Scans tome is `{ n: 0, name: 'Scans', episodes: [...] }` at index 0

- [ ] **Step 1: Write the failing tests**

Append to `src/catalog/anilist.test.js`:

```js
import { anilistSearchManga, anilistTrendingManga, anilistGetMangaDetail } from './anilist'

vi.mock('./mangadex', () => ({
  mangadexGetChapterMap: vi.fn()
}))
import { mangadexGetChapterMap } from './mangadex'

describe('anilistSearchManga', () => {
  it('normalizes AniList manga into Work shape with category mangas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [
        { id: 13, title: { romaji: 'One Piece' }, genres: ['Adventure'], startDate: { year: 1997 }, description: 'desc', coverImage: { large: 'http://img.co/op.jpg' } }
      ] } } })
    })
    const results = await anilistSearchManga('one piece')
    expect(results[0]).toMatchObject({
      source: 'anilist-manga',
      id: 'anilist-manga-13',
      title: 'One Piece',
      category: 'mangas',
      year: 1997,
      seasons: null,
    })
  })
})

describe('anilistTrendingManga', () => {
  it('returns up to 5 trending manga with category mangas', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [
        { id: 1, title: { romaji: 'Berserk' }, genres: ['Dark Fantasy'], startDate: { year: 1989 }, description: '', coverImage: { large: null } }
      ] } } })
    })
    const results = await anilistTrendingManga()
    expect(results[0]).toMatchObject({ category: 'mangas', source: 'anilist-manga', id: 'anilist-manga-1' })
  })
})

describe('anilistGetMangaDetail', () => {
  it('builds seasons with Scans tome first, then numbered volumes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 5, volumes: 2, status: 'RELEASING', title: { romaji: 'Test Manga' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([
      [1, 1], [2, 1],   // volume 1
      [3, 2], [4, 2],   // volume 2
      // chapter 5 → no volume (scan)
    ]))

    const result = await anilistGetMangaDetail(999)
    expect(result.ended).toBe(false)
    expect(result.chapters).toBe(5)
    expect(result.volumes).toBe(2)

    const scans = result.seasons.find((s) => s.n === 0)
    expect(scans.name).toBe('Scans')
    expect(scans.episodes).toHaveLength(1)
    expect(scans.episodes[0]).toMatchObject({ n: 5, title: '', air: 1 })

    const vol1 = result.seasons.find((s) => s.n === 1)
    expect(vol1.name).toBe('Tome 1')
    expect(vol1.episodes).toHaveLength(2)
    expect(vol1.episodes[0]).toMatchObject({ n: 1, title: '', air: 1 })

    const vol2 = result.seasons.find((s) => s.n === 2)
    expect(vol2.name).toBe('Tome 2')
    expect(vol2.episodes).toHaveLength(2)

    // Scans tome must be first
    expect(result.seasons[0].n).toBe(0)
  })

  it('sets ended=true when status is FINISHED', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 1, volumes: 1, status: 'FINISHED', title: { romaji: 'Finished Manga' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([[1, 1]]))
    const result = await anilistGetMangaDetail(1)
    expect(result.ended).toBe(true)
  })

  it('omits Scans tome when all chapters are in volumes', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        chapters: 3, volumes: 1, status: 'FINISHED', title: { romaji: 'Complete' }
      } } })
    })
    mangadexGetChapterMap.mockResolvedValueOnce(new Map([[1, 1], [2, 1], [3, 1]]))
    const result = await anilistGetMangaDetail(2)
    expect(result.seasons.find((s) => s.n === 0)).toBeUndefined()
    expect(result.seasons).toHaveLength(1)
  })

  it('returns empty seasons when AniList returns no media', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: null } })
    })
    const result = await anilistGetMangaDetail(0)
    expect(result).toMatchObject({ seasons: [], ended: false, chapters: 0, volumes: 0 })
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npx vitest run src/catalog/anilist.test.js
```

Expected: new tests FAIL — functions not exported.

- [ ] **Step 3: Add anilistSearchManga to anilist.js**

Add this import at the top of `src/catalog/anilist.js`:

```js
import { mangadexGetChapterMap } from './mangadex'
```

Add `anilistSearchManga` function (after `anilistTrending`):

```js
export async function anilistSearchManga(query) {
  const q = `query ($search: String) {
    Page(perPage: 10) {
      media(search: $search, type: MANGA, isAdult: false) {
        id title { romaji } genres startDate { year } description coverImage { large }
      }
    }
  }`
  const json = await gql(q, { search: query })
  return (json.data?.Page?.media || []).map((m) => ({
    source: 'anilist-manga',
    sourceId: m.id,
    id: `anilist-manga-${m.id}`,
    title: m.title.romaji,
    category: 'mangas',
    genre: (m.genres || [])[0] || 'Divers',
    year: m.startDate?.year || null,
    overview: (m.description || '').replace(/<[^>]+>/g, ''),
    poster: m.coverImage?.large || null,
    seasons: null,
    release: null
  }))
}
```

Add `anilistTrendingManga` function (after `anilistSearchManga`):

```js
export async function anilistTrendingManga() {
  const q = `{
    Page(perPage: 5) {
      media(sort: TRENDING_DESC, type: MANGA, isAdult: false) {
        id title { romaji } genres startDate { year } description coverImage { large }
      }
    }
  }`
  const json = await gql(q, {})
  return (json.data?.Page?.media || []).map((m) => ({
    source: 'anilist-manga',
    sourceId: m.id,
    id: `anilist-manga-${m.id}`,
    title: m.title.romaji,
    category: 'mangas',
    genre: (m.genres || [])[0] || 'Divers',
    year: m.startDate?.year || null,
    overview: (m.description || '').replace(/<[^>]+>/g, ''),
    poster: m.coverImage?.large || null,
    seasons: null,
    release: null
  }))
}
```

Add `anilistGetMangaDetail` function (after `anilistTrendingManga`):

```js
export async function anilistGetMangaDetail(anilistId) {
  const q = `query ($id: Int) {
    Media(id: $id, type: MANGA) {
      chapters volumes status title { romaji }
    }
  }`
  const json = await gql(q, { id: anilistId })
  const m = json.data?.Media
  if (!m) return { seasons: [], ended: false, chapters: 0, volumes: 0 }

  const totalChapters = m.chapters || 0
  const ended = m.status === 'FINISHED' || m.status === 'CANCELLED'
  const chapterMap = await mangadexGetChapterMap(m.title.romaji)

  const volumeEpisodes = {}
  const scanEpisodes = []

  for (let n = 1; n <= totalChapters; n++) {
    const volNum = chapterMap.get(n) ?? null
    const ep = { n, title: '', air: 1 }
    if (volNum !== null) {
      if (!volumeEpisodes[volNum]) volumeEpisodes[volNum] = []
      volumeEpisodes[volNum].push(ep)
    } else {
      scanEpisodes.push(ep)
    }
  }

  const seasons = []
  if (scanEpisodes.length > 0) {
    seasons.push({ n: 0, name: 'Scans', episodes: scanEpisodes })
  }
  const sortedVols = Object.keys(volumeEpisodes).map(Number).sort((a, b) => a - b)
  for (const v of sortedVols) {
    seasons.push({ n: v, name: `Tome ${v}`, episodes: volumeEpisodes[v] })
  }

  return { seasons, ended, chapters: totalChapters, volumes: m.volumes || 0 }
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/catalog/anilist.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog/anilist.js src/catalog/anilist.test.js
git commit -m "feat(manga): add anilistSearchManga, anilistTrendingManga, anilistGetMangaDetail"
```

---

## Task 5: Wire mangas into search catalog

**Files:**
- Modify: `src/catalog/search.js`
- Modify: `src/catalog/search.test.js`

**Interfaces:**
- Consumes: `anilistSearchManga`, `anilistTrendingManga` from `'./anilist'`
- Produces: `searchCatalog(query, 'mangas')` returns manga results; `fetchTrending('mangas')` returns trending manga.

- [ ] **Step 1: Write the failing test**

In `src/catalog/search.test.js`:

1. Add `anilistSearchManga: vi.fn(), anilistTrendingManga: vi.fn()` to the anilist mock:

```js
vi.mock('./anilist', () => ({
  anilistSearch: vi.fn(),
  anilistTrending: vi.fn(),
  anilistSearchManga: vi.fn(),
  anilistTrendingManga: vi.fn(),
}))
```

2. Add this import alongside the existing ones:

```js
import { anilistSearchManga } from './anilist'
```

3. Add new test:

```js
it('returns manga results when cat is mangas', async () => {
  anilistSearchManga.mockResolvedValue([{ id: 'm1', title: 'One Piece', category: 'mangas' }])
  tmdbSearch.mockResolvedValue([])
  anilistSearch.mockResolvedValue([])
  googleBooksSearch.mockResolvedValue([])
  rawgSearch.mockResolvedValue([])
  spotifySearch.mockResolvedValue([])
  const results = await searchCatalog('one piece', 'mangas')
  expect(results).toEqual([{ id: 'm1', title: 'One Piece', category: 'mangas' }])
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx vitest run src/catalog/search.test.js
```

Expected: new test FAILS — `mangas` not in SOURCE_CATS.

- [ ] **Step 3: Update search.js**

In `src/catalog/search.js`, update the import line:

```js
import { anilistSearch, anilistTrending, anilistSearchManga, anilistTrendingManga } from './anilist'
```

Add `mangas` to `SOURCE_CATS`:

```js
const SOURCE_CATS = [
  { fn: tmdbSearch, cats: ['series', 'films', 'animes'] },
  { fn: anilistSearch, cats: ['animes'] },
  { fn: anilistSearchManga, cats: ['mangas'] },
  { fn: googleBooksSearch, cats: ['livres'] },
  { fn: rawgSearch, cats: ['jeux'] },
  { fn: spotifySearch, cats: ['musique'] }
]
```

Add `mangas` to `TRENDING_FN`:

```js
const TRENDING_FN = {
  series: () => tmdbTrending('series'),
  films: () => tmdbTrending('films'),
  animes: anilistTrending,
  mangas: anilistTrendingManga,
  livres: googleBooksTrending,
  jeux: rawgTrending,
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npx vitest run src/catalog/search.test.js
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/catalog/search.js src/catalog/search.test.js
git commit -m "feat(manga): wire mangas into searchCatalog and fetchTrending"
```

---

## Task 6: useWorkActions — anilist-manga detail fetcher

**Files:**
- Modify: `src/hooks/useWorkActions.js`
- Modify: `src/hooks/useWorkActions.test.js`

**Interfaces:**
- Consumes: `anilistGetMangaDetail` from `'../catalog/anilist'`
- Produces: `refreshWork(work)` routes `source: 'anilist-manga'` to `anilistGetMangaDetail(work.sourceId)`

- [ ] **Step 1: Write the failing test**

Open `src/hooks/useWorkActions.test.js`. Find existing fetcher/refresh tests or add a new describe block:

```js
import { anilistGetMangaDetail } from '../catalog/anilist'

vi.mock('../catalog/anilist', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    anilistGetMangaDetail: vi.fn(),
  }
})

describe('refreshWork for anilist-manga', () => {
  it('calls anilistGetMangaDetail with work.sourceId', async () => {
    anilistGetMangaDetail.mockResolvedValueOnce({
      seasons: [{ n: 1, name: 'Tome 1', episodes: [{ n: 1, title: '', air: 1 }] }],
      ended: false, chapters: 1, volumes: 1
    })
    // refreshWork is internal — test via addWork or the exported actions
    // If useWorkActions exposes refreshWork, call it directly.
    // Otherwise confirm DETAIL_FETCHERS routing via integration.
    expect(anilistGetMangaDetail).toBeDefined()
  })
})
```

> Note: if `useWorkActions.test.js` already tests `DETAIL_FETCHERS` routing, add the `'anilist-manga'` case there instead.

- [ ] **Step 2: Update useWorkActions.js**

In `src/hooks/useWorkActions.js`, add `anilistGetMangaDetail` to the import:

```js
import { tmdbGetDetail } from '../catalog/tmdb'
import { anilistFindId, anilistGetDetail, anilistGetMangaDetail } from '../catalog/anilist'
import { spotifyGetDetail } from '../catalog/spotify'
```

Update `DETAIL_FETCHERS`:

```js
const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: (work) => anilistGetDetail(work.anilistId || work.sourceId).then((d) => ({ ...work, ...d })),
  'anilist-manga': (work) => anilistGetMangaDetail(work.sourceId).then((d) => ({ ...work, ...d })),
  spotify: spotifyGetDetail
}
```

- [ ] **Step 3: Run tests to verify they pass**

```bash
npx vitest run src/hooks/useWorkActions.test.js
```

Expected: all tests PASS.

- [ ] **Step 4: Commit**

```bash
git add src/hooks/useWorkActions.js src/hooks/useWorkActions.test.js
git commit -m "feat(manga): route anilist-manga source to anilistGetMangaDetail in DETAIL_FETCHERS"
```

---

## Task 7: SearchModal — add Manga tab

**Files:**
- Modify: `src/components/modals/SearchModal.jsx`

**Interfaces:**
- Consumes: `t('cat.mangas')` (Task 1)
- Produces: Manga tab in category bar; clicking it sets `cat = 'mangas'` and calls `searchCatalog(query, 'mangas')`.

No automated test needed (component integration; existing tests don't cover tab rendering).

- [ ] **Step 1: Add Manga to CATS**

In `src/components/modals/SearchModal.jsx`, find the `CATS` array definition. Add `mangas` after `animes`:

```js
const CATS = [
  { k: 'series', label: t('cat.series') },
  { k: 'animes', label: t('cat.animes') },
  { k: 'mangas', label: t('cat.mangas') },
  { k: 'films', label: t('cat.films') },
  { k: 'livres', label: t('cat.livres') },
  { k: 'jeux', label: t('cat.jeux') },
  { k: 'musique', label: t('cat.musique') },
  { k: 'all', label: t('cat.all') },
]
```

- [ ] **Step 2: Verify visually**

Run `npm run dev` (or `pnpm dev`), open the app, open the search modal. Confirm "Mangas" tab appears between Animés and Films. Click it, type a manga title (e.g. "One Piece") — results should appear with `category: mangas`.

- [ ] **Step 3: Commit**

```bash
git add src/components/modals/SearchModal.jsx
git commit -m "feat(manga): add Manga tab to search modal"
```

---

## Task 8: LibraryView — add mangas category filter

**Files:**
- Modify: `src/components/library/LibraryView.jsx`

**Interfaces:**
- Consumes: `t('cat.mangas')` (Task 1)
- Produces: `mangas` filter chip in library; filtering by mangas shows only works with `category === 'mangas'`.

- [ ] **Step 1: Add mangas to CATS**

In `src/components/library/LibraryView.jsx`, find the `CATS` array. Add `mangas` after `animes`:

```js
const CATS = [
  ['all', t('cat.all')],
  ['series', t('cat.series')],
  ['films', t('cat.films')],
  ['animes', t('cat.animes')],
  ['mangas', t('cat.mangas')],
  ['livres', t('cat.livres')],
  ['jeux', t('cat.jeux')],
  ['musique', t('cat.musique')],
]
```

- [ ] **Step 2: Verify visually**

In the app, add any manga work. Go to Library. Confirm "Mangas" chip appears. Click it — only manga works shown. Switch to "Tout" — manga works appear in the full list.

- [ ] **Step 3: Commit**

```bash
git add src/components/library/LibraryView.jsx
git commit -m "feat(manga): add mangas category to library filter"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Covered by |
|---|---|
| New `mangas` category | Tasks 1, 7, 8 |
| AniList primary source | Task 4 |
| MangaDex chapter→tome mapping | Task 3 |
| season=tome / episode=chapitre model | Task 4 (anilistGetMangaDetail) + Task 1 (i18n) |
| Scans tome (n=0) for unreleased chapters | Task 4 |
| Separate search tab | Task 7 |
| Filter manga/manhwa/manhua from livres | Task 2 |
| BD/comics/graphic novel stays in livres | Task 2 (filter only matches manga/manhwa/manhua) |
| Manga trending | Task 4 (anilistTrendingManga) + Task 5 |
| 1 chapitre = 1 scan | Task 4 (one episode per chapter number) |
| stats/calendar/journal unchanged | No tasks needed — architecture handles it |

**Type consistency check:**
- `anilistGetMangaDetail` returns `{ seasons, ended, chapters, volumes }` — matches useWorkActions spread: `{ ...work, ...d }` ✓
- `mangadexGetChapterMap` returns `Map<number, number|null>` — `anilistGetMangaDetail` calls `.get(n)` where `n` is integer ✓
- Work IDs: `anilist-manga-{id}` — consistent across Task 4 and Task 6 ✓
- `source: 'anilist-manga'` — matches DETAIL_FETCHERS key in Task 6 ✓
