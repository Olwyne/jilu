# Shared Reviews System — Design Spec

**Date:** 2026-07-06

## Goal

Replace the private per-user journal (`feed`) and work-level `reviews` with a global shared review system. All authenticated users can write and read reviews, but visibility is gated by the current user's watch progress (anti-spoiler).

---

## Firestore Data Model

### New collection: `reviews` (root-level)

```
reviews/{reviewId}
  workId:  string         // work this review belongs to
  sNum:    number | null  // null = global work review; number = episode season
  eNum:    number | null  // null = global work review; number = episode number
  userId:  string         // author's Firebase UID
  handle:  string         // author's display handle (denormalized)
  text:    string         // review body
  rating:  number | null  // 1–5 stars; only set on global work reviews
  ts:      number         // Unix ms timestamp
```

Global work review: `sNum: null, eNum: null`
Episode review: `sNum: <n>, eNum: <n>`

### Removed

- `users/{uid}.feed` — replaced by global `reviews`
- `users/{uid}.reviews` — replaced by global `reviews`
- `users/{uid}.ratings` — star rating moves into global `reviews` (rating field on global review)

---

## Visibility Rules (client-side anti-spoiler)

| Review type | Visible when |
|---|---|
| Episode review | `watched[workId-sNum-eNum]` exists |
| Global work review | `work.status === 'termine'` |

Gating is always client-side. All authenticated users can read the full `reviews` collection from Firestore; the filter happens in the hook before rendering.

---

## Firestore Security Rules

```
match /reviews/{reviewId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow update: if false; // no edits
}
```

---

## New Hook: `useReviews(workId)`

- Subscribes via `onSnapshot` to `reviews` where `workId == workId`, ordered by `ts desc`
- Returns `{ episodeReviews, globalReviews, addReview, deleteReview }`
- `addReview({ sNum, eNum, text, rating })` — writes to Firestore with current user's uid + handle
- `deleteReview(reviewId)` — deletes if `userId === currentUser.uid`

---

## UI Changes

### `DetailView` — replaces `JournalThread`

- **Global review section** (below work header, above seasons):
  - If `work.status !== 'termine'`: show locked state "Termine l'œuvre pour voir les avis"
  - If `work.status === 'termine'`: show `ReviewThread` with global reviews + star input + text form

### `SeasonList` / episode row

- Each watched episode shows a comment bubble icon
- Clicking opens episode review inline or in modal
- Shows reviews from all users on that episode (filtered: only if current user has watched it)
- Unwatched episodes: no review access, no spoilers shown

### New component: `ReviewThread`

Replaces `JournalThread`. Props:
```
{ reviews, currentUserId, onAdd, onDelete, locked, lockedMessage, showRating }
```
- `locked`: shows placeholder instead of reviews
- `showRating`: renders star input (only for global reviews)
- Shows author handle, timestamp, text, rating (if set)
- Delete button only for own reviews

### `DashboardView` — "Dernières notes & commentaires"

- Reads from global `reviews` collection (all users)
- Filters: episode reviews where `watched[key]` exists, global reviews where `work.status` in `['en_cours', 'termine']`
- `useReviews` not scoped to a single workId here — needs a broader query or separate hook

---

## Migration

- Existing `feed` and `reviews` data in `users/{uid}`: not migrated automatically (old private data stays but is no longer read by UI)
- `ratings` in `users/{uid}`: old star ratings stay in Firestore but UI stops reading them; new ratings live in global `reviews`

---

## Out of Scope

- Likes on reviews
- Editing reviews (no updates allowed)
- Pagination of review feed (load all for a given workId)
