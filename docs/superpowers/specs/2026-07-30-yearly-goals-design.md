# Yearly Goals per Media Category — Design Spec

**Date:** 2026-07-30  
**Status:** Approved

## Summary

Add a dedicated "Objectifs [year]" section at the top of StatsView showing per-category yearly completion goals. Users set goals inline by clicking the goal number. Progress is computed from works finished in the current calendar year via a new `finishedAt` timestamp.

## Feature Scope

- 6 categories: series, films, animes, mangas, livres, jeux
- Goals are per-user, per-category, stored as integers (target count)
- Progress = count of works with `finishedAt` in current calendar year
- No change to existing KPI cards (all-time counts remain)

## Data Model

### `finishedAt` on work documents

When a work's `status` is set to `'termine'`, record the timestamp:

```js
// Firestore: users/{uid}/works/{workId}
{ ..., finishedAt: 1753900000000 }  // ms timestamp, set once
```

- Set **only** if not already present (don't overwrite if user re-terminates after abandoning)
- Written by the existing `mutate({ works: ... })` path — no new Firestore path needed

### `settings.goals`

```js
// Firestore: users/{uid}  (merged into settings field)
settings: {
  ...,
  goals: { series: 20, films: 12, animes: 10, mangas: 8, livres: 6, jeux: 5 }
}
```

- Default: all zeros (= "not set")
- Persisted via existing `mutate({ settings: { ...settings, goals: newGoals } })`

## UI Design

### Placement

New `GoalsSection` component inserted at the top of StatsView's JSX, before the top KPI cards grid.

### GoalsSection Card Layout

```
┌──────────────────────────────────────┐
│  Objectifs 2026                      │
│                                      │
│  [Films]  [Séries]  [Animés]  ...   │  ← 6 cards, auto-fit grid
└──────────────────────────────────────┘
```

Each category card:

```
┌─────────────────────────┐
│  Films                  │
│  8 / 12 ✏️              │  ← click 12 to edit
│  ████████░░░░  67%      │  ← CAT_COLORS bar
└─────────────────────────┘
```

States:
- **Goal = 0**: shows "— / Définir" with dashed border cue
- **0% < progress < 100%**: normal bar, category color
- **≥ 100%**: bar turns `var(--color-green)`, checkmark appended

### Inline Edit

Clicking the goal number (or a pencil icon next to it) replaces the value with a focused `<input type="number" min="0">`. Saving: `onBlur` or `Enter` key. Cancel: `Escape` key (reverts to previous value). No modal.

## Component Plan

| Component | File | Notes |
|-----------|------|-------|
| `GoalsSection` | `src/components/stats/GoalsSection.jsx` | New, self-contained |
| `StatsView` | `src/components/stats/StatsView.jsx` | Add `settings` + `onSaveSettings` props; insert `<GoalsSection>` |
| Work status change | `src/App.jsx` | Set `finishedAt` when saving a work with `status === 'termine'` |
| i18n | `src/i18n/fr.json`, `en.json` | Add `stats.goals`, `stats.goalsTitle`, `stats.setGoal` keys |
| `EMPTY_DATA` | `src/hooks/useAppData.js` | Add `goals: {}` to default settings |

## Where `finishedAt` Is Set

In `App.jsx`, the handler that calls `mutate({ works: ... })` when saving a work — add:

```js
if (updatedWork.status === 'termine' && !updatedWork.finishedAt) {
  updatedWork.finishedAt = Date.now()
}
```

## Progress Computation

In `GoalsSection`:

```js
const currentYear = new Date().getFullYear()
const finishedThisYear = Object.values(works).filter(
  w => w.finishedAt && new Date(w.finishedAt).getFullYear() === currentYear
)
const countByCategory = {}
finishedThisYear.forEach(w => {
  countByCategory[w.category] = (countByCategory[w.category] || 0) + 1
})
```

## i18n Keys

```json
"stats.goalsTitle": "Objectifs {{year}}",
"stats.setGoal": "Définir",
"stats.goalsReached": "Atteint !"
```

## Out of Scope

- Per-year historical goals (only current year)
- Goal reset on January 1 (goals are persistent; user resets manually)
- Musique category (not present in finished-count cards)
- Push notifications when goal is reached
