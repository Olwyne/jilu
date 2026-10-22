# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Former TV Time users and fans of series and anime who track what they watch day to day, mostly in short sessions (ticking off an episode, checking what airs next), often on a phone through the installed PWA. French and English speakers.

## Product Purpose
Jilu is a free personal media tracker. It replaces TV Time and extends it to films, anime, manga, books and video games, so a person's whole culture lives in one account. Success means a user can log an episode in a couple of taps and trust their history, stats and calendar to stay accurate.

## Positioning
Six media types in one app, free, no ads and no subscription, with a direct import of a TV Time export. Built by a TV Time user as a replacement.

## Operating Context
- TV Time is shutting down: confirmed by the product owner on 2026-10-22 (no shutdown date recorded). The landing page's lead hook ("TV Time ferme ses portes") rests on this; do not add a date or further claims about it without confirmation.
- Daily, short, repeated actions: mark watched, rate, comment, check the release calendar.
- Data comes from external catalogues (TMDB, AniList, RAWG, Google Books, Spotify), refreshed server side into a shared catalogue.
- Accounts are Firebase email/password; profiles can be public at `/u/<handle>`.
- Deployed on Vercel; installable as a PWA on desktop, iOS and Android.

## Capabilities and Constraints
- Episode-by-episode tracking with per-episode ratings and comments; journal, reviews, quiz, goals.
- Release calendar, stats (hours watched, genres, weekly activity, heatmap), library, search across sources.
- TV Time ZIP import.
- Bilingual FR/EN (i18next), light and dark themes.
- Stack: React 19, Vite, Firebase Auth + Firestore, Vercel functions in `api/`.
- Music search is announced but not yet available ("coming soon").
- Undecided: none recorded.

## Brand Commitments
Name "Jilu". Existing violet-to-pink accent and the Bricolage Grotesque / Instrument Sans pairing are the incumbent look; no further visual commitment has been made binding.

## Evidence on Hand
- Landing copy and FAQ in `index.html` and `public/llms.txt`.
- Prior audits in `docs/` (`audit-2026-10-20.md`, `responsiveness-check-2026-07-22.md`).
- No testimonials, user counts or press are on hand; do not invent them.

## Product Principles
- Logging must be faster than the thought of logging it: the frequent action is always one or two taps away.
- One account, every medium: no medium feels like a second-class add-on.
- Free and ad-free is a promise; no design pattern may imply upsell or tracking.
- A user's history is theirs: imports, exports and public profile visibility stay explicit and under their control.

## Accessibility & Inclusion
Target WCAG 2.2 AA. The 2026-10 audit found gaps: keyboard-unreachable clickable divs, non-semantic modals, low-contrast muted tokens, no reduced-motion handling. French and English must both be fully supported.
