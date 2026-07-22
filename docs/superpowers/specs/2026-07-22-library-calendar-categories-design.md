# Library & Calendar — Category-Aware Tabs

**Date:** 2026-07-22

## Scope

Two related changes:
1. **Library** — status filter label `a_voir` adapts per selected category
2. **Calendar** — add category chips; each type uses appropriate tab logic

---

## 1. Library — Status Labels Per Category

### Problem
`status.a_voir` = "À voir" (FR) / "Plan to watch" (EN). Wrong for livres ("À lire") and jeux ("À jouer").

### Solution
Only `a_voir` needs per-category labels. The others (`en_cours`, `termine`, `abandonne`) are generic enough.

### Label mapping

| Category | `a_voir` FR | `a_voir` EN |
|---|---|---|
| all / series / films / animes | À voir | Plan to watch |
| livres | À lire | Plan to read |
| jeux | À jouer | Plan to play |

### Implementation
- Add i18n keys: `status.a_voir_livres`, `status.a_voir_jeux` in `fr.json` and `en.json`
- In `LibraryView.jsx`, compute `aVoirLabel` based on `category` state and use it in `STATUSES` array

---

## 2. Calendar — Category Chips + Per-Type Logic

### Problem
Calendar only processes works with `w.seasons` (series). Films, animes, livres, jeux are ignored.

### Category chips
Same chip UI as library: Tout · Séries · Films · Animés · Livres · Jeux (musique disabled).

### Tab logic per category type

#### Séries & Animés (have `w.seasons` with `e.air` timestamps)
- **À rattraper** — episodes with `e.air <= now`, not watched, work status `en_cours`
- **À venir** — episodes with `e.air > now`, work status `en_cours` or `a_voir`
- **Abandonné** — work status `abandonne`, has unwatched aired episodes

#### Films & Jeux (have `w.release` timestamp)
- **À rattraper** — status `a_voir` + (`w.release <= now` OR `w.release` is null)
- **À venir** — status `a_voir` + `w.release > now`
- **Abandonné** — status `abandonne`

#### Livres (have `w.year`, `w.release` always null)
- **À rattraper** — status `a_voir` + (`w.year <= currentYear` OR `!w.year`)
- **À venir** — status `a_voir` + `w.year > currentYear`
- **Abandonné** — status `abandonne`

#### Tout
Union of all types using each type's logic combined.

### Data shape for non-series items
Series/anime items in calendar lists carry `{ w, s, e, remaining }`. Films/jeux/livres carry `{ w }` only — no episode context.

### Card rendering per type
- Séries/Animés: existing card with episode badge + mark-watched button
- Films/Jeux: poster card showing title + release date (or year); no mark-watched button in calendar (handled in detail view)
- Livres: same simple card, show year if available

### Files to change
- `src/components/calendar/CalendarView.jsx` — add category state, split logic per type, conditional rendering
- `src/i18n/fr.json` — add `status.a_voir_livres`, `status.a_voir_jeux`
- `src/i18n/en.json` — same

---

## Out of scope
- Musique (disabled, coming soon)
- Mark-watched action for films/jeux/livres in calendar (use detail view)
- Changing `en_cours` label per category (generic "En cours" works)
