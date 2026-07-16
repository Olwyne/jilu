# Anime Multi-Season via AniList Relations — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Anime works show all sequel seasons by following AniList SEQUEL relation chains, while keeping TMDB French titles/posters.

**Architecture:** TMDB remains the search and metadata source. On `addWork` and `refreshAllWorks`, `anilistFindId` resolves an AniList ID from the TMDB `original_name`. `anilistGetDetail(anilistId)` then walks the SEQUEL chain, building one season per entry. The `anilistId` is stored on the work for future refreshes.

**Tech Stack:** AniList GraphQL API, TMDB REST API, Vitest, React (hooks)

## Global Constraints

- Test runner: `pnpm test` (vitest run)
- No new npm dependencies
- All network calls mocked in tests via `global.fetch = vi.fn()`
- French titles/posters always come from TMDB — never overwrite `title`, `poster`, `overview` with AniList data
- AniList errors are always silent (no user-visible error, fallback to existing data)

---

### Task 1: `anilist.js` — `anilistFindId` + updated `anilistGetDetail`

**Files:**
- Modify: `src/catalog/anilist.js`
- Modify: `src/catalog/anilist.test.js`

**Interfaces:**
- Produces:
  - `anilistFindId(originalTitle: string, year: number | null): Promise<number | null>` — exported
  - `anilistGetDetail(anilistId: number): Promise<{ seasons: Array<{n: number, name: null, episodes: Array<{n: number, title: string, air: number}>}>, ended: boolean }>` — exported, signature changes (was `(work)`, now `(anilistId: number)`)

- [ ] **Step 1: Replace the `anilistGetDetail` test and add new tests**

Replace `src/catalog/anilist.test.js` entirely:

```js
import { describe, it, expect, vi } from 'vitest'
import { anilistSearch, anilistFindId, anilistGetDetail } from './anilist'

describe('anilistSearch', () => {
  it('normalizes AniList media into Work shape', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { Page: { media: [
        { id: 21, title: { romaji: 'One Piece' }, genres: ['Adventure'], startDate: { year: 1999 }, description: 'desc', episodes: 24, status: 'RELEASING', coverImage: { large: null } }
      ] } } })
    })
    const results = await anilistSearch('one piece')
    expect(results[0]).toMatchObject({ source: 'anilist', id: 'anilist-21', title: 'One Piece', category: 'animes', year: 1999 })
  })
})

describe('anilistFindId', () => {
  it('returns AniList ID matched by title and year', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 163134, startDate: { year: 2022 } }] } } })
    })
    const id = await anilistFindId('Blue Lock', 2022)
    expect(id).toBe(163134)
  })

  it('returns null when result list is empty', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [] } } })
    })
    const id = await anilistFindId('Nonexistent Anime', 2023)
    expect(id).toBeNull()
  })

  it('returns null when best result year is more than 1 year off', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 999, startDate: { year: 2018 } }] } } })
    })
    const id = await anilistFindId('Something', 2023)
    expect(id).toBeNull()
  })

  it('returns first result when year is null', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Page: { media: [{ id: 42, startDate: { year: 2020 } }] } } })
    })
    const id = await anilistFindId('Some Anime', null)
    expect(id).toBe(42)
  })
})

describe('anilistGetDetail', () => {
  it('returns 1 season for single entry with no SEQUEL', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        episodes: 3, status: 'FINISHED',
        startDate: { year: 2020, month: 1, day: 1 },
        relations: { edges: [] }
      } } })
    })
    const detail = await anilistGetDetail(21)
    expect(detail.seasons).toHaveLength(1)
    expect(detail.seasons[0].n).toBe(1)
    expect(detail.seasons[0].episodes).toHaveLength(3)
    expect(detail.seasons[0].episodes[1].air - detail.seasons[0].episodes[0].air).toBe(7 * 86400000)
    expect(detail.ended).toBe(true)
  })

  it('follows SEQUEL chain and returns multiple seasons', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 24, status: 'FINISHED',
          startDate: { year: 2022, month: 10, day: 8 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 200 } }] }
        } } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 13, status: 'RELEASING',
          startDate: { year: 2024, month: 4, day: 6 },
          relations: { edges: [] }
        } } })
      })
    const detail = await anilistGetDetail(163134)
    expect(detail.seasons).toHaveLength(2)
    expect(detail.seasons[0]).toMatchObject({ n: 1, episodes: expect.arrayContaining([expect.objectContaining({ n: 1 })]) })
    expect(detail.seasons[1]).toMatchObject({ n: 2 })
    expect(detail.seasons[0].episodes).toHaveLength(24)
    expect(detail.seasons[1].episodes).toHaveLength(13)
    expect(detail.ended).toBe(false)
  })

  it('stops at cycle to prevent infinite loop', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 1, status: 'FINISHED',
          startDate: { year: 2020, month: 1, day: 1 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 101 } }] }
        } } })
      })
      .mockResolvedValueOnce({
        json: async () => ({ data: { Media: {
          episodes: 1, status: 'FINISHED',
          startDate: { year: 2021, month: 1, day: 1 },
          relations: { edges: [{ relationType: 'SEQUEL', node: { id: 100 } }] }
        } } })
      })
    const detail = await anilistGetDetail(100)
    expect(detail.seasons).toHaveLength(2)
  })

  it('ignores non-SEQUEL relation edges', async () => {
    global.fetch = vi.fn().mockResolvedValueOnce({
      json: async () => ({ data: { Media: {
        episodes: 12, status: 'FINISHED',
        startDate: { year: 2021, month: 4, day: 1 },
        relations: { edges: [
          { relationType: 'PREQUEL', node: { id: 50 } },
          { relationType: 'SIDE_STORY', node: { id: 51 } }
        ] }
      } } })
    })
    const detail = await anilistGetDetail(99)
    expect(detail.seasons).toHaveLength(1)
  })
})
```

- [ ] **Step 2: Run tests — verify failures**

```bash
pnpm test src/catalog/anilist.test.js
```

Expected: `anilistFindId` — "not a function", `anilistGetDetail` tests — various failures (wrong signature, no SEQUEL logic).

- [ ] **Step 3: Rewrite `src/catalog/anilist.js`**

```js
const ENDPOINT = 'https://graphql.anilist.co'
const DAY = 86400000

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  return res.json()
}

export async function anilistSearch(query) {
  const q = `query ($search: String) {
    Page(perPage: 10) {
      media(search: $search, type: ANIME) {
        id title { romaji } genres startDate { year } description episodes status coverImage { large }
      }
    }
  }`
  const json = await gql(q, { search: query })
  return (json.data?.Page?.media || []).map((m) => ({
    source: 'anilist',
    sourceId: m.id,
    id: `anilist-${m.id}`,
    title: m.title.romaji,
    category: 'animes',
    genre: (m.genres || [])[0] || 'Divers',
    year: m.startDate?.year || null,
    overview: (m.description || '').replace(/<[^>]+>/g, ''),
    poster: m.coverImage?.large || null,
    seasons: null,
    release: null
  }))
}

export async function anilistFindId(originalTitle, year) {
  const q = `query ($search: String) {
    Page(perPage: 5) {
      media(search: $search, type: ANIME) { id startDate { year } }
    }
  }`
  const json = await gql(q, { search: originalTitle })
  const results = json.data?.Page?.media || []
  if (!results.length) return null
  if (!year) return results[0].id
  const match = results.find((r) => r.startDate?.year && Math.abs(r.startDate.year - year) <= 1)
  return match?.id || null
}

async function fetchEntry(id) {
  const q = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes status startDate { year month day }
      relations { edges { relationType node { id } } }
    }
  }`
  const json = await gql(q, { id })
  return json.data?.Media || null
}

export async function anilistGetDetail(anilistId) {
  const visited = new Set()
  const seasons = []
  let currentId = anilistId
  let ended = false

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const m = await fetchEntry(currentId)
    if (!m) break

    const start = m.startDate?.year
      ? new Date(m.startDate.year, (m.startDate.month || 1) - 1, m.startDate.day || 1).getTime()
      : Date.now()
    const count = m.episodes || 1
    const episodes = Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      title: 'Épisode ' + (i + 1),
      air: start + i * 7 * DAY
    }))
    seasons.push({ n: seasons.length + 1, name: null, episodes })
    ended = m.status === 'FINISHED' || m.status === 'CANCELLED'

    const sequel = (m.relations?.edges || []).find((e) => e.relationType === 'SEQUEL')
    currentId = sequel?.node?.id || null
  }

  return { seasons, ended }
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
pnpm test src/catalog/anilist.test.js
```

Expected: all 8 tests PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/catalog/anilist.js src/catalog/anilist.test.js
rtk git commit -m "feat: anilistFindId + anilistGetDetail follows SEQUEL chain"
```

---

### Task 2: `tmdb.js` — expose `originalTitle`

**Files:**
- Modify: `src/catalog/tmdb.js`
- Modify: `src/catalog/tmdb.test.js`

**Interfaces:**
- Produces: `tmdbSearch` results include `originalTitle: string` (from `r.original_name`)

- [ ] **Step 1: Add `originalTitle` assertion to existing tmdb tests**

In `src/catalog/tmdb.test.js`, update the two `tmdbSearch` test mocks to include `original_name` and assert `originalTitle`:

```js
// In "normalizes multi-search results into Work shape":
// Change the mock data to add original_name:
{ id: 1396, media_type: 'tv', name: 'Breaking Bad', original_name: 'Breaking Bad', overview: '...', first_air_date: '2008-01-20', genre_ids: [18] },
{ id: 42, media_type: 'movie', title: 'Dune', original_name: 'Dune', overview: '...', release_date: '2021-10-22', genre_ids: [878] }
// Add assertions:
expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-1396', title: 'Breaking Bad', originalTitle: 'Breaking Bad', category: 'series', year: 2008 })

// In "categorizes animation tv as animes":
// Change mock to add original_name:
{ id: 130590, media_type: 'tv', name: 'Blue Lock', original_name: 'ブルーロック', overview: '...', first_air_date: '2022-10-08', genre_ids: [16, 28] }
// Add assertion:
expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-130590', title: 'Blue Lock', originalTitle: 'ブルーロック', category: 'animes' })
```

Full updated `src/catalog/tmdb.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { tmdbSearch, tmdbGetDetail } from './tmdb'

beforeEach(() => { global.fetch = vi.fn() })

describe('tmdbSearch', () => {
  it('normalizes multi-search results into Work shape', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: 1396, media_type: 'tv', name: 'Breaking Bad', original_name: 'Breaking Bad', overview: '...', first_air_date: '2008-01-20', genre_ids: [18] },
          { id: 42, media_type: 'movie', title: 'Dune', original_name: 'Dune', overview: '...', release_date: '2021-10-22', genre_ids: [878] }
        ]
      })
    })
    const results = await tmdbSearch('bre')
    expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-1396', title: 'Breaking Bad', originalTitle: 'Breaking Bad', category: 'series', year: 2008 })
    expect(results[1]).toMatchObject({ source: 'tmdb', id: 'tmdb-movie-42', title: 'Dune', originalTitle: 'Dune', category: 'films', year: 2021 })
  })

  it('categorizes animation tv as animes', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        results: [
          { id: 130590, media_type: 'tv', name: 'Blue Lock', original_name: 'ブルーロック', overview: '...', first_air_date: '2022-10-08', genre_ids: [16, 28] }
        ]
      })
    })
    const results = await tmdbSearch('blue lock')
    expect(results[0]).toMatchObject({ source: 'tmdb', id: 'tmdb-tv-130590', title: 'Blue Lock', originalTitle: 'ブルーロック', category: 'animes' })
  })

  it('ignores non-tv/movie results (e.g. person)', async () => {
    global.fetch.mockResolvedValueOnce({ ok: true, json: async () => ({ results: [{ id: 9, media_type: 'person', name: 'Someone' }] }) })
    const results = await tmdbSearch('someone')
    expect(results).toHaveLength(0)
  })
})

describe('tmdbGetDetail', () => {
  it('fetches season/episode lists for a tv work', async () => {
    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ seasons: [{ season_number: 1, name: 'Season 1' }] }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ episodes: [{ episode_number: 1, name: 'Pilot', air_date: '2008-01-20' }] }) })
    const work = { source: 'tmdb', id: 'tmdb-tv-1396', sourceId: 1396, category: 'series', title: 'Breaking Bad' }
    const detailed = await tmdbGetDetail(work)
    expect(detailed.seasons).toHaveLength(1)
    expect(detailed.seasons[0].episodes[0]).toMatchObject({ n: 1, title: 'Pilot' })
  })

  it('returns seasons: null for a film', async () => {
    const work = { source: 'tmdb', id: 'tmdb-movie-42', sourceId: 42, category: 'films', title: 'Dune', release: Date.parse('2021-10-22') }
    const detailed = await tmdbGetDetail(work)
    expect(detailed.seasons).toBeNull()
  })
})
```

- [ ] **Step 2: Run tests — verify failure**

```bash
pnpm test src/catalog/tmdb.test.js
```

Expected: 2 failures — `originalTitle` undefined.

- [ ] **Step 3: Add `originalTitle` to `tmdbSearch` in `src/catalog/tmdb.js`**

In the `.map()` callback, add one field:

```js
return {
  source: 'tmdb',
  sourceId: r.id,
  id: `tmdb-${r.media_type}-${r.id}`,
  title: isTv ? r.name : r.title,
  originalTitle: r.original_name || null,   // ← add this line
  category: isAnime ? 'animes' : isTv ? 'series' : 'films',
  genre: genreLabel(r.genre_ids),
  year,
  overview: r.overview || '',
  poster: r.poster_path ? `https://image.tmdb.org/t/p/w300${r.poster_path}` : null,
  seasons: null,
  release: dateStr ? Date.parse(dateStr) : null
}
```

- [ ] **Step 4: Run tests — verify all pass**

```bash
pnpm test src/catalog/tmdb.test.js
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/catalog/tmdb.js src/catalog/tmdb.test.js
rtk git commit -m "feat: expose originalTitle from TMDB search results"
```

---

### Task 3: `useWorkActions.js` — wire AniList into addWork + refreshAllWorks

**Files:**
- Modify: `src/hooks/useWorkActions.js`
- Modify: `src/hooks/useWorkActions.test.js`

**Interfaces:**
- Consumes:
  - `anilistFindId(originalTitle: string, year: number | null): Promise<number | null>` (from Task 1)
  - `anilistGetDetail(anilistId: number): Promise<{ seasons, ended }>` (from Task 1)
  - `tmdbSearch` results now include `originalTitle` (from Task 2)

- [ ] **Step 1: Add anime addWork test and refreshAllWorks anime test**

Add to `src/hooks/useWorkActions.test.js`:

```js
import * as anilist from '../catalog/anilist'

// Inside describe('useWorkActions'):

it('addWork stores anilistId and AniList seasons for anime', async () => {
  const mutate = vi.fn().mockResolvedValue()
  const data = { works: {} }
  vi.spyOn(tmdb, 'tmdbGetDetail').mockResolvedValue({
    id: 'tmdb-tv-131041', sourceId: 131041, title: 'Blue Lock', category: 'animes',
    originalTitle: 'ブルーロック', year: 2022, seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }]
  })
  vi.spyOn(anilist, 'anilistFindId').mockResolvedValue(163134)
  vi.spyOn(anilist, 'anilistGetDetail').mockResolvedValue({
    seasons: [
      { n: 1, name: null, episodes: [{ n: 1, title: 'Épisode 1', air: 0 }] },
      { n: 2, name: null, episodes: [{ n: 1, title: 'Épisode 1', air: 1 }] }
    ],
    ended: false
  })
  const { result } = renderHook(() => useWorkActions(data, mutate))
  await act(async () => {
    await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-131041', sourceId: 131041, title: 'Blue Lock', category: 'animes', originalTitle: 'ブルーロック', year: 2022 })
  })
  const stored = mutate.mock.calls[0][0].works['tmdb-tv-131041']
  expect(stored.anilistId).toBe(163134)
  expect(stored.seasons).toHaveLength(2)
  expect(stored.title).toBe('Blue Lock')
})

it('addWork falls back to TMDB seasons when anilistFindId returns null', async () => {
  const mutate = vi.fn().mockResolvedValue()
  const data = { works: {} }
  vi.spyOn(tmdb, 'tmdbGetDetail').mockResolvedValue({
    id: 'tmdb-tv-999', sourceId: 999, title: 'Some Anime', category: 'animes',
    originalTitle: 'Some Anime', year: 2023,
    seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }] }]
  })
  vi.spyOn(anilist, 'anilistFindId').mockResolvedValue(null)
  const { result } = renderHook(() => useWorkActions(data, mutate))
  await act(async () => {
    await result.current.addWork({ source: 'tmdb', id: 'tmdb-tv-999', sourceId: 999, title: 'Some Anime', category: 'animes', originalTitle: 'Some Anime', year: 2023 })
  })
  const stored = mutate.mock.calls[0][0].works['tmdb-tv-999']
  expect(stored.anilistId).toBeUndefined()
  expect(stored.seasons).toHaveLength(1)
})
```

- [ ] **Step 2: Run new tests — verify failures**

```bash
pnpm test src/hooks/useWorkActions.test.js
```

Expected: 2 new tests FAIL — `anilistFindId` not called / `anilistId` not stored.

- [ ] **Step 3: Rewrite `src/hooks/useWorkActions.js`**

Replace the entire file with:

```js
import { tmdbGetDetail } from '../catalog/tmdb'
import { anilistFindId, anilistGetDetail } from '../catalog/anilist'
import { spotifyGetDetail } from '../catalog/spotify'

const DETAIL_FETCHERS = {
  tmdb: tmdbGetDetail,
  anilist: (work) => anilistGetDetail(work.anilistId || work.sourceId).then((d) => ({ ...work, ...d })),
  spotify: spotifyGetDetail
}

function computeAutoStatus(work, watched) {
  if (!work.seasons || !work.seasons.length) return null
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  if (total === 0) return null
  if (watchedCount === 0) return 'a_voir'
  if (watchedCount >= total) return work.ended === false ? 'en_cours' : 'termine'
  return 'en_cours'
}

function buildStatusPatch(work, watched, works) {
  const auto = computeAutoStatus(work, watched)
  if (!auto || auto === work.status) return {}
  return { works: { ...works, [work.id]: { ...work, status: auto } } }
}

export function useWorkActions(data, mutate) {
  async function toggleEpisode(workId, sNum, eNum) {
    const key = `${workId}-${sNum}-${eNum}`
    const watched = { ...data.watched }
    if (watched[key]) delete watched[key]; else watched[key] = Date.now()
    const work = data.works[workId]
    const statusPatch = buildStatusPatch(work, watched, data.works)
    if (statusPatch.works && work.status === 'abandonne') {
      const auto = statusPatch.works[workId].status
      const label = auto === 'en_cours' ? 'En cours' : 'Terminé'
      const resume = window.confirm(`Tu reprends "${work.title}" ? Passer en "${label}" ?`)
      if (!resume) { await mutate({ watched }); return }
    }
    await mutate({ watched, ...statusPatch })
  }

  async function markSeason(workId, sNum) {
    const work = data.works[workId]
    const season = work.seasons.find((s) => s.n === sNum)
    const now = Date.now()
    const aired = season.episodes.filter((e) => e.air <= now)
    const allDone = aired.every((e) => data.watched[`${workId}-${sNum}-${e.n}`])
    const watched = { ...data.watched }
    aired.forEach((e) => {
      const key = `${workId}-${sNum}-${e.n}`
      if (allDone) delete watched[key]; else watched[key] = Date.now()
    })
    const statusPatch = buildStatusPatch(work, watched, data.works)
    if (statusPatch.works && work.status === 'abandonne') {
      const auto = statusPatch.works[workId].status
      const label = auto === 'en_cours' ? 'En cours' : 'Terminé'
      const resume = window.confirm(`Tu reprends "${work.title}" ? Passer en "${label}" ?`)
      if (!resume) { await mutate({ watched }); return }
    }
    await mutate({ watched, ...statusPatch })
  }

  async function setRating(scope, id, val) {
    const key = `${scope}:${id}`
    const current = data.ratings?.[key] || 0
    const next = current === val ? 0 : val
    const ratings = { ...data.ratings, [key]: next }
    let reviews = data.reviews || []
    if (scope === 'w') {
      const idx = reviews.findIndex((r) => r.id === id)
      if (next > 0) {
        const entry = { id, note: idx >= 0 ? reviews[idx].note : 'Note mise à jour.', ts: Date.now() }
        reviews = [entry, ...reviews.filter((r) => r.id !== id)]
      }
    }
    const patch = { ratings }
    if (scope === 'w') patch.reviews = reviews
    await mutate(patch)
  }

  async function setStatus(workId, status) {
    const work = data.works[workId]
    const works = { ...data.works, [workId]: { ...work, status } }
    await mutate({ works })
  }

  async function postComment(workId, sNum, eNum, text) {
    const t = (text || '').trim()
    if (!t) return
    const key = sNum ? `${workId}-${sNum}-${eNum}` : `w:${workId}`
    const entry = { id: 'c' + Date.now(), key, workId, sNum: sNum || null, eNum: eNum || null, text: t, ts: Date.now(), likes: 0, liked: false }
    await mutate({ feed: [entry, ...(data.feed || [])] })
  }

  async function toggleLike(commentId) {
    const feed = (data.feed || []).map((f) => f.id === commentId ? { ...f, liked: !f.liked, likes: f.likes + (f.liked ? -1 : 1) } : f)
    await mutate({ feed })
  }

  async function deleteComment(commentId) {
    const feed = (data.feed || []).filter((f) => f.id !== commentId)
    await mutate({ feed })
  }

  async function addGameHours(workId, delta) {
    const games = { ...data.games }
    const g = { hours: 0, done: {}, ...(games[workId] || {}) }
    g.hours = Math.max(0, (g.hours || 0) + delta)
    games[workId] = g
    await mutate({ games })
  }

  async function toggleGameTier(workId, tier) {
    const games = { ...data.games }
    const g = { hours: 0, done: {}, ...(games[workId] || {}) }
    g.done = { ...(g.done || {}), [tier]: !g.done[tier] }
    games[workId] = g
    await mutate({ games })
  }

  async function markAllWatched() {
    const watched = {}
    const now = Date.now()
    Object.values(data.works).forEach((w) => {
      if (w.seasons) {
        w.seasons.forEach((s) => s.episodes.forEach((e) => {
          if (e.air <= now) watched[`${w.id}-${s.n}-${e.n}`] = true
        }))
      }
    })
    await mutate({ watched })
  }

  async function resetProgress() {
    if (window.confirm('Réinitialiser toute ta progression ? Les épisodes cochés seront remis à zéro.')) {
      await mutate({ watched: {} })
    }
  }

  async function clearAll() {
    if (window.confirm('Tout effacer ? Progression, notes, avis et œuvres importées seront supprimés. Irréversible.')) {
      await mutate({ works: {}, watched: {}, ratings: {}, reviews: [], feed: [], games: {}, favorites: {} })
    }
  }

  async function toggleFavorite(workId) {
    const favorites = { ...(data.favorites || {}) }
    if (favorites[workId]) delete favorites[workId]; else favorites[workId] = true
    await mutate({ favorites })
  }

  async function markWatchedToast(work, sNum, eNum, setToast) {
    await toggleEpisode(work.id, sNum, eNum)
    const label = (sNum != null && eNum != null) ? `S${sNum} · E${eNum}` : null
    setToast({ workId: work.id, title: work.title, label })
  }

  async function addWork(searchResult) {
    if (data.works[searchResult.id]) return
    const fetchDetail = DETAIL_FETCHERS[searchResult.source]
    let detailed = fetchDetail ? await fetchDetail(searchResult) : searchResult

    if (searchResult.category === 'animes' && searchResult.source === 'tmdb') {
      try {
        const anilistId = await anilistFindId(searchResult.originalTitle || searchResult.title, searchResult.year)
        if (anilistId) {
          const anilistDetail = await anilistGetDetail(anilistId)
          detailed = { ...detailed, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
        }
      } catch { /* keep TMDB seasons on failure */ }
    }

    const works = { ...data.works, [searchResult.id]: { ...detailed, status: 'a_voir', added: Date.now() } }
    await mutate({ works })
  }

  async function refreshAllWorks(onProgress) {
    const entries = Object.values(data.works).filter((w) => w.sourceId && DETAIL_FETCHERS[w.source])
    if (!entries.length) { onProgress?.('Aucune œuvre à rafraîchir'); return }
    let done = 0
    const works = { ...data.works }

    for (const work of entries) {
      onProgress?.(`Rafraîchissement… ${done}/${entries.length}`)
      try {
        const fetcher = DETAIL_FETCHERS[work.source]
        const fresh = await fetcher(work)
        let next = { ...work, ...fresh, status: work.status, added: work.added }

        if (work.category === 'animes') {
          let anilistId = work.anilistId
          if (!anilistId) {
            anilistId = await anilistFindId(work.originalTitle || work.title, work.year)
          }
          if (anilistId) {
            const anilistDetail = await anilistGetDetail(anilistId)
            next = { ...next, anilistId, seasons: anilistDetail.seasons, ended: anilistDetail.ended }
          }
        }

        works[work.id] = next
      } catch (e) { console.error('[refresh]', work.title, e) }
      done++
    }

    await mutate({ works })
    onProgress?.(`✓ ${done} œuvre${done > 1 ? 's' : ''} mises à jour`)
  }

  return { addWork, toggleEpisode, markSeason, setRating, setStatus, postComment, toggleLike, deleteComment, addGameHours, toggleGameTier, markAllWatched, resetProgress, clearAll, toggleFavorite, markWatchedToast, refreshAllWorks }
}
```

- [ ] **Step 4: Run all tests — verify all pass**

```bash
pnpm test
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
rtk git add src/hooks/useWorkActions.js src/hooks/useWorkActions.test.js
rtk git commit -m "feat: addWork and refreshAllWorks use AniList SEQUEL chain for anime seasons"
```
