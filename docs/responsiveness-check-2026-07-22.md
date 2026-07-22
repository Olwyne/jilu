# Responsiveness Check: http://localhost:5173/

**Date**: 2026-07-22
**Mode**: Standard + code analysis (viewport simulation via JS — Chrome MCP resize not functional in this environment)
**Breakpoints tested**: 320px, 375px, 480px, 860px, 1024px, 1280px, 1440px, 1920px
**Browser tool**: Chrome MCP + JS viewport simulation

## Summary

| Width | Status | Issues |
|-------|--------|--------|
| 320px | Fail | 1 high (nav), 1 medium (padding) |
| 375px | Warn | 1 high (nav), 1 medium (lib cards) |
| 480px | Warn | 1 medium (lib cards 3-col) |
| 860px | Warn | 1 medium (tablet cramped) |
| 1024px | Warn | 1 medium (tablet cramped) |
| 1280px | Pass | — |
| 1440px | Pass | — |
| 1920px | Warn | 1 medium (content not centered) |

**Overall**: 4 distinct issues. Main problems: 6-item bottom nav too cramped at narrow widths, content not centered on wide screens, no tablet optimisation between 860–1024px.

---

## Architecture

- **Mobile threshold**: 860px — JS-controlled (`window.innerWidth < 860` + resize listener)
- **Below 860px**: Bottom `MobileNav` (fixed, 64px, 6 items) — sidebar hidden, `paddingBottom: 74px` on content
- **Above 860px**: Left `Sidebar` (236px, sticky)
- **Only CSS breakpoint**: `max-width: 480px` → library grid switches to `repeat(3, 1fr)`
- **Dashboard grids**: `auto-fit/auto-fill` with minmax — inherently responsive ✓

---

## Critical & High Issues

### 6-item MobileNav too cramped at 320–375px — High

**Width(s)**: 320px, 375px  
**Check**: Touch targets, text overflow

MobileNav renders 6 tabs: Accueil, Biblio, Calendrier, Profil, Statistiques, Compte.

At 320px: `320 / 6 = ~53px` per tab. "Statistiques" (11 chars) at 10.5px font overflows or becomes unreadable. Touch target width (53px) is below the 44px minimum but hits it lengthwise — still very tight.

**File**: `src/components/layout/MobileNav.jsx` — the `ITEMS` array has 6 entries.  
**Fix suggestion**: Remove "Compte" from the nav bar — put it as a settings icon in the Profile page header. Standard bottom navs cap at 5 items. This immediately gives each tab ~64px at 320px.

---

## Transition Analysis

| Transition | Observed At | Clean? | Notes |
|-----------|-------------|--------|-------|
| Sidebar → MobileNav | 860px | Yes | React state-driven, no CSS flicker |
| Library grid: auto → 3-col | 480px | Yes | CSS media query, clean |
| Stats cards: 4-col → 2-col | ~340px | Yes | `auto-fit minmax(130px)` handles it |
| Up Next grid: 2-col → 1-col | ~620px (mobile) | Yes | `auto-fill minmax(280px)` handles it |

---

## Per-Breakpoint Notes

### 320px — Fail

- **[High]** MobileNav 6 items: each tab ~53px wide, "Statistiques" label overflows
- **[Medium]** `main` padding `30px` each side leaves only 260px content width — very tight. Library 3-col grid cards = ~80px each (barely usable poster thumbnails)

### 375px — Warn

- **[High]** MobileNav same issue — tabs ~62px, labels still cramped
- **[Medium]** Library 3-col cards: `(375 - 60) / 3 ≈ 95px` per card. Text labels ("House of the Dragon · Séries · 2022") truncate heavily. 2-col would be more readable.

### 480px — Warn

- **[Medium]** Library grid forced to `repeat(3, 1fr)` — at exactly 480px each card is `(480 - 60 - 20) / 3 ≈ 133px`. Acceptable for posters but tight for text labels below.

### 860–1024px — Warn

- **[Medium]** Sidebar (236px) remains visible. Content area: `1024 - 236 - 60 = 728px` at 1024px, down to `860 - 236 - 60 = 564px` at 860px. No layout adaptation for this range — same grid/padding as desktop. At 860px the "Up Next" cards (`minmax(280px)`) only barely fit 2 columns (564 / 280 ≈ 2.01). A smaller sidebar or a collapsed sidebar option would help.

### 1920px+ — Warn

- **[Medium]** `main` has `maxWidth: 1240px` but `marginLeft: 0` (no `margin: auto`). On a 1920px screen: sidebar 236px + remaining 1684px, but content capped at 1240px → 444px empty space on the right. Content is visually left-heavy.  
  **Fix**: Add `margin: '0 auto'` to the `main` element in `App.jsx`.

---

## Recommendations

### Quick Fixes (CSS / prop changes)

- **`App.jsx`** — add `margin: '0 auto'` to `<main>` style prop → fixes ultra-wide centering  
  ```jsx
  <main style={{ padding: '22px 30px 40px', maxWidth: 1240, width: '100%', margin: '0 auto' }}>
  ```

- **`App.jsx`** — reduce horizontal padding on mobile:  
  ```jsx
  <main style={{ padding: '22px 30px 40px', paddingLeft: isMobile ? 16 : 30, paddingRight: isMobile ? 16 : 30, maxWidth: 1240, width: '100%', margin: '0 auto' }}>
  ```

- **`LibraryView.module.css`** — 2 columns at ≤480px is more readable than 3:  
  ```css
  @media (max-width: 480px) { .grid { grid-template-columns: repeat(2, 1fr); gap: 10px 8px; } }
  ```

### Structural Changes

- **`MobileNav.jsx`** — remove "Compte" from tab bar (move to Profile page as gear icon). Reduces to 5 tabs → 64px each at 320px, "Statistiques" label fits.

- **860–1024px** — consider a narrower sidebar (`180px`) or an icon-only collapsed mode at this range using a CSS media query on `.aside`.
