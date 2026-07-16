# Anime Multi-Season via AniList Relations

**Date:** 2026-07-16  
**Status:** Approved

## Problem

TMDB groups anime seasons inconsistently — Blue Lock S2 is a separate TMDB entry rather than Season 2 of show 131041. Jilu shows 1 season for anime that have multiple sequels on AniList.

## Solution

Hybrid approach: TMDB remains the primary source (French titles, posters, overviews). AniList provides the episode/season structure by following SEQUEL relation chains.

## Data Model

Anime works gain an optional `anilistId` field alongside the existing `sourceId` (TMDB numeric ID):

```js
{
  source: 'tmdb',
  sourceId: 131041,          // TMDB TV ID
  anilistId: 163134,         // AniList media ID (new, optional)
  id: 'tmdb-tv-131041',
  title: 'Blue Lock',        // French title from TMDB
  category: 'animes',
  seasons: [
    { n: 1, name: null, episodes: [...] },  // from AniList
    { n: 2, name: null, episodes: [...] },  // from AniList SEQUEL
  ]
}
```

## Changes

### `src/catalog/tmdb.js`

- Expose `originalTitle` from `r.original_name` in `tmdbSearch` results
- Used for AniList ID lookup (romaji titles match better than French)

### `src/catalog/anilist.js`

**New: `anilistFindId(originalTitle, year)`**
- Searches AniList by `originalTitle`
- Matches first result where `Math.abs(result.year - year) <= 1`
- Returns AniList media ID (number) or `null` if no confident match

**Modified: `anilistGetDetail(anilistId)`**
- Signature changes: accepts AniList ID directly (number), not a work object
- Fetches episodes + relations (SEQUEL edges) for each entry
- Follows SEQUEL chain recursively with `visited = new Set()` for cycle detection
- Each entry in the chain becomes one season (n=1, 2, 3…)
- Episode air dates computed from `startDate + index * 7 days` (same as current)
- Returns `{ seasons: [...], ended }` where `ended` = last entry in chain has status FINISHED/CANCELLED

### `src/hooks/useWorkActions.js`

**Modified: `addWork(searchResult)`**
- After fetching TMDB detail, if `category === 'animes'`:
  - Call `anilistFindId(searchResult.originalTitle, searchResult.year)`
  - If found: store `anilistId` on the work, call `anilistGetDetail(anilistId)` to get seasons
  - If not found: fall back to TMDB seasons (current behavior)

**Modified: `refreshAllWorks`**
- For anime works with `anilistId`: call `anilistGetDetail(work.anilistId)` to refresh seasons, merge result into work
- For anime works without `anilistId`: try `anilistFindId(work.originalTitle || work.title, work.year)` → if found, store `anilistId` and use AniList seasons; otherwise fall back to TMDB detail
- Remove `tryUpgradeToTmdb` and `migrateKeys` helpers (no longer needed)
- `DETAIL_FETCHERS['anilist']` updated to wrap `anilistGetDetail(work.anilistId || work.sourceId)` for legacy anilist-sourced entries

## Error Handling

- `anilistFindId` failure → silently skip AniList, fall back to TMDB seasons
- `anilistGetDetail` failure → silently skip, keep existing seasons on refresh
- Circular SEQUEL references → cycle detection prevents infinite loop

## Out of Scope

- One Piece and other long-running single-entry anime: already work (1 AniList entry, 1 season, all episodes)
- AniList as search source: not changed, TMDB search remains
- Existing anime entries without `anilistId`: handled by refresh (auto-discovers `anilistId` via title match)
