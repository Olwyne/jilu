# Shared Reviews System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the private per-user `feed`/`reviews` with a global Firestore `reviews` collection where all authenticated users can write and read reviews, with client-side anti-spoiler visibility gating.

**Architecture:** A new `useReviews(workId, currentUser)` hook subscribes to the root-level `reviews` Firestore collection, scoped by `workId`. A new `ReviewThread` component renders shared reviews with author handles, star input (work-level only), and delete-own controls. `DetailView` and `EpisodeModal` call the hook directly and render `ReviewThread`; `DashboardView` uses a broader `useAllReviews` hook and applies visibility filters.

**Tech Stack:** React 19, Firebase 12 (Firestore onSnapshot/addDoc/deleteDoc), Vitest + Testing Library

## Global Constraints

- All Firebase calls use named imports from `firebase/firestore` (no default SDK object)
- Firestore collection path: `reviews/{reviewId}` (root-level, NOT under users)
- Review schema: `{ workId, sNum, eNum, userId, handle, text, rating, ts }` — `sNum`/`eNum` are `null` for global work reviews; `rating` is `null` for episode reviews
- Visibility gating is **client-side only** — Firestore rules allow all authenticated reads
- No likes on reviews, no editing reviews, no pagination
- `currentUser` prop shape everywhere: `{ uid: string, handle: string }`
- Episode star ratings (scope `e:`) are removed from UI; work star ratings move into global reviews
- `ProfileView` and `FeedView` are **not changed** — they still read old `data.feed`

---

## File Map

| Action | Path | Responsibility |
|--------|------|----------------|
| **Create** | `src/hooks/useReviews.js` | Firestore subscription + addReview/deleteReview |
| **Create** | `src/components/detail/ReviewThread.jsx` | Shared review list UI + form |
| **Modify** | `src/components/detail/DetailView.jsx` | Wire useReviews, global review section, remove JournalThread + old rating widget |
| **Modify** | `src/components/modals/EpisodeModal.jsx` | Wire useReviews, remove JournalThread + episode rating |
| **Modify** | `src/components/dashboard/DashboardView.jsx` | Use new reviews schema, remove old feed merge |
| **Modify** | `src/App.jsx` | Pass `currentUser`, call useAllReviews, update prop shapes |
| **Modify** | `src/hooks/useWorkActions.js` | Remove postComment/toggleLike/deleteComment/setRating (work scope) |
| **Modify** | `src/components/detail/DetailView.test.jsx` | Update to remove ratings/feed props |

---

### Task 1: `useReviews` hook

**Files:**
- Create: `src/hooks/useReviews.js`

**Interfaces:**
- Produces:
  - `useReviews(workId: string, currentUser: { uid, handle }) → { episodeReviews, globalReviews, addReview, deleteReview }`
  - `useAllReviews(currentUser: { uid, handle }) → Review[]`
  - `Review` shape: `{ id, workId, sNum, eNum, userId, handle, text, rating, ts }`
  - `addReview({ sNum, eNum, text, rating }) → Promise<void>`
  - `deleteReview(reviewId: string) → Promise<void>`

- [ ] **Step 1: Create the hook file**

```js
// src/hooks/useReviews.js
import { useEffect, useState } from 'react'
import {
  collection, query, where, orderBy, onSnapshot,
  addDoc, deleteDoc, doc, limit
} from 'firebase/firestore'
import { db } from '../firebase'

export function useReviews(workId, currentUser) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!workId || !currentUser?.uid) return
    const q = query(
      collection(db, 'reviews'),
      where('workId', '==', workId),
      orderBy('ts', 'desc')
    )
    return onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [workId, currentUser?.uid])

  const episodeReviews = reviews.filter(r => r.sNum != null)
  const globalReviews = reviews.filter(r => r.sNum == null)

  async function addReview({ sNum = null, eNum = null, text, rating = null }) {
    if (!currentUser?.uid || !text?.trim()) return
    await addDoc(collection(db, 'reviews'), {
      workId,
      sNum,
      eNum,
      userId: currentUser.uid,
      handle: currentUser.handle || 'Anonyme',
      text: text.trim(),
      rating,
      ts: Date.now()
    })
  }

  async function deleteReview(reviewId) {
    if (!currentUser?.uid) return
    await deleteDoc(doc(db, 'reviews', reviewId))
  }

  return { episodeReviews, globalReviews, addReview, deleteReview }
}

export function useAllReviews(currentUser) {
  const [reviews, setReviews] = useState([])

  useEffect(() => {
    if (!currentUser?.uid) return
    const q = query(
      collection(db, 'reviews'),
      orderBy('ts', 'desc'),
      limit(100)
    )
    return onSnapshot(q, snap => {
      setReviews(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [currentUser?.uid])

  return reviews
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/hooks/useReviews.js
rtk git commit -m "feat: useReviews hook — subscribe to global reviews collection"
```

> **Note on Firestore index:** The `useReviews` query uses `where('workId', ...) + orderBy('ts', 'desc')`. Firestore will log a link to create the composite index on first run. Create it via that link or in the Firebase console (`reviews` collection, fields: `workId ASC`, `ts DESC`).

---

### Task 2: `ReviewThread` component

**Files:**
- Create: `src/components/detail/ReviewThread.jsx`

**Interfaces:**
- Consumes:
  - `reviews: Review[]` — from `useReviews`
  - `currentUserId: string` — to identify own reviews
  - `onAdd({ text, rating }) → void`
  - `onDelete(reviewId: string) → void`
  - `locked: boolean` — show locked placeholder instead of content
  - `lockedMessage: string`
  - `showRating: boolean` — render star input (global reviews only)
- Produces: JSX — no exports other than default component

- [ ] **Step 1: Create the component**

```jsx
// src/components/detail/ReviewThread.jsx
import { useState } from 'react'
import { relText } from '../../lib/domain'

export default function ReviewThread({ reviews, currentUserId, onAdd, onDelete, locked, lockedMessage, showRating }) {
  const [draft, setDraft] = useState('')
  const [rating, setRating] = useState(0)

  function submit() {
    if (!draft.trim()) return
    onAdd({ text: draft, rating: showRating ? rating : null })
    setDraft('')
    setRating(0)
  }

  if (locked) {
    return (
      <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, background: 'rgba(255,255,255,.02)', padding: '18px 20px' }}>
        <div style={{ fontSize: 14, color: 'var(--color-muted-2)', textAlign: 'center', padding: '8px 0' }}>{lockedMessage}</div>
      </div>
    )
  }

  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, background: 'rgba(255,255,255,.02)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Avis</span>
        <span style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{reviews.length}</span>
      </div>

      {showRating && (
        <div style={{ display: 'flex', gap: 4, marginBottom: 10 }}>
          {[1, 2, 3, 4, 5].map(n => (
            <span
              key={n}
              onClick={() => setRating(r => r === n ? 0 : n)}
              style={{ fontSize: 24, cursor: 'pointer', color: n <= rating ? 'var(--color-gold)' : '#4a4a58' }}
            >
              {n <= rating ? '★' : '☆'}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submit()}
          placeholder="Partage ton avis…"
          style={{ flex: 1, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '11px 14px', color: 'var(--color-text)', fontSize: 14 }}
        />
        <div
          onClick={submit}
          style={{ padding: '11px 18px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
        >
          Publier
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {reviews.map(r => (
          <div key={r.id} style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>{r.handle || 'Anonyme'}</span>
                {r.rating > 0 && (
                  <span style={{ fontSize: 13, color: 'var(--color-gold)' }}>{'★'.repeat(r.rating)}</span>
                )}
                <span style={{ fontSize: 12, color: 'var(--color-muted-3)' }}>· {relText(r.ts, Date.now())}</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 3 }}>{r.text}</div>
              {r.userId === currentUserId && (
                <div
                  onClick={() => onDelete(r.id)}
                  style={{ fontSize: 12, color: 'var(--color-muted-3)', cursor: 'pointer', marginTop: 4 }}
                >
                  Supprimer
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/detail/ReviewThread.jsx
rtk git commit -m "feat: ReviewThread component — shared reviews with author handle, stars, delete-own"
```

---

### Task 3: Update `DetailView`

**Files:**
- Modify: `src/components/detail/DetailView.jsx`
- Modify: `src/components/detail/DetailView.test.jsx`

**Interfaces:**
- Consumes (new props):
  - `currentUser: { uid: string, handle: string }` — replaces `feed` and `ratings`
- Consumes (removed props): `feed`, `ratings`
- Consumes (useReviews): `{ episodeReviews, globalReviews, addReview, deleteReview }` — called internally with `work.id` + `currentUser`

- [ ] **Step 1: Rewrite `DetailView.jsx`**

```jsx
// src/components/detail/DetailView.jsx
import PosterBox from '../ui/PosterBox'
import StatusSelect from '../ui/StatusSelect'
import { CAT, STATUS, term } from '../../lib/domain'
import SeasonList from './SeasonList'
import GamePanel from './GamePanel'
import ReviewThread from './ReviewThread'
import { useReviews } from '../../hooks/useReviews'

function epTotals(work, watched) {
  if (!work.seasons) return { total: 0, watchedCount: 0 }
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  return { total, watchedCount }
}

export default function DetailView({ work, watched, games, actions, onOpenEpisode, favorites, currentUser }) {
  const { total, watchedCount } = epTotals(work, watched)
  const isFav = !!(favorites && favorites[work.id])
  const { globalReviews, addReview, deleteReview } = useReviews(work.id, currentUser)
  const isFinished = work.status === 'termine'

  return (
    <div>
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 28 }}>
        <PosterBox id={work.id} title={work.title} poster={work.poster} width={150} height={220} radius={18} fontSize={52} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: STATUS[work.status].color, background: `${STATUS[work.status].color}22` }}>{STATUS[work.status].label}</span>
            <span style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>
              {CAT[work.category]} · {work.genre} · {work.year}
              {work.ended === true && <span style={{ marginLeft: 6, color: '#4ade80', fontWeight: 600 }}>· Terminée</span>}
              {work.ended === false && <span style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 600 }}>· En cours</span>}
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, margin: '0 0 12px' }}>{work.title}</h2>
          <p style={{ color: '#b9b9c8', fontSize: 15, lineHeight: 1.55, maxWidth: 560 }}>{work.overview}</p>
          {work.seasons && (
            <div style={{ maxWidth: 420, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                <span style={{ color: 'var(--color-muted)' }}>Progression</span>
                <span style={{ fontWeight: 600 }}>{watchedCount} / {total} {term(work.category).unit}</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total ? Math.round((watchedCount / total) * 100) : 0}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <StatusSelect value={work.status} onChange={(s) => actions.setStatus(work.id, s)} />
            {actions.toggleFavorite && (
              <div
                onClick={() => actions.toggleFavorite(work.id)}
                style={{ padding: '11px 16px', borderRadius: 13, background: isFav ? 'rgba(255,196,75,.14)' : 'rgba(255,255,255,.045)', border: `1px solid ${isFav ? 'rgba(255,196,75,.4)' : 'rgba(255,255,255,.08)'}`, color: isFav ? '#ffc24b' : 'var(--color-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
              >
                {isFav ? '★ Favori' : '☆ Favori'}
              </div>
            )}
          </div>
        </div>
      </div>

      {work.category === 'jeux' && (
        <GamePanel workId={work.id} game={games[work.id]} onAddHours={actions.addGameHours} onToggleTier={actions.toggleGameTier} />
      )}

      <div style={{ marginBottom: 22 }}>
        <ReviewThread
          reviews={globalReviews}
          currentUserId={currentUser?.uid}
          onAdd={({ text, rating }) => addReview({ sNum: null, eNum: null, text, rating })}
          onDelete={deleteReview}
          locked={!isFinished}
          lockedMessage="Termine l'œuvre pour voir les avis"
          showRating={true}
        />
      </div>

      {work.seasons && (
        <SeasonList
          work={work}
          watched={watched}
          onToggleEpisode={actions.toggleEpisode}
          onMarkSeason={actions.markSeason}
          onOpenEpisode={onOpenEpisode}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 2: Update `DetailView.test.jsx`**

```jsx
// src/components/detail/DetailView.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DetailView from './DetailView'

// Mock useReviews so tests don't need Firestore
vi.mock('../../hooks/useReviews', () => ({
  useReviews: () => ({
    globalReviews: [],
    episodeReviews: [],
    addReview: vi.fn(),
    deleteReview: vi.fn()
  })
}))

const work = {
  id: 'w1', title: 'Severance', category: 'series', genre: 'Thriller', year: 2022, status: 'en_cours',
  overview: 'desc', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Good News', air: 0 }] }]
}

const currentUser = { uid: 'u1', handle: 'testuser' }

describe('DetailView', () => {
  it('shows title, overview, and status label', () => {
    render(<DetailView work={work} watched={{}} games={{}} actions={{}} currentUser={currentUser} />)
    expect(screen.getByText('Severance')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
    expect(screen.getAllByText('En cours').length).toBeGreaterThan(0)
  })

  it('clicking a status option calls actions.setStatus with the work id and new value', async () => {
    const setStatus = vi.fn()
    render(<DetailView work={work} watched={{}} games={{}} actions={{ setStatus }} currentUser={currentUser} />)
    await userEvent.click(screen.getByRole('button', { name: /cours/i }))
    await userEvent.click(screen.getByText('Terminé'))
    expect(setStatus).toHaveBeenCalledWith('w1', 'termine')
  })

  it('shows locked review section when work is not finished', () => {
    render(<DetailView work={work} watched={{}} games={{}} actions={{}} currentUser={currentUser} />)
    expect(screen.getByText("Termine l'œuvre pour voir les avis")).toBeInTheDocument()
  })

  it('shows review thread when work is finished', () => {
    const finishedWork = { ...work, status: 'termine' }
    render(<DetailView work={finishedWork} watched={{}} games={{}} actions={{}} currentUser={currentUser} />)
    expect(screen.getByText('Avis')).toBeInTheDocument()
  })
})
```

- [ ] **Step 3: Run tests**

```bash
rtk vitest run src/components/detail/DetailView.test.jsx
```
Expected: all 4 tests pass.

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/detail/DetailView.jsx src/components/detail/DetailView.test.jsx
rtk git commit -m "feat: DetailView uses ReviewThread + useReviews, removes JournalThread"
```

---

### Task 4: Update `EpisodeModal`

**Files:**
- Modify: `src/components/modals/EpisodeModal.jsx`

**Interfaces:**
- Consumes (new): `currentUser: { uid, handle }` — replaces `feed` and `ratings`
- Consumes (removed): `feed`, `ratings`
- Uses `useReviews(work.id, currentUser)` internally, filters `episodeReviews` by `sNum`/`eNum`

- [ ] **Step 1: Rewrite `EpisodeModal.jsx`**

```jsx
// src/components/modals/EpisodeModal.jsx
import { term } from '../../lib/domain'
import ReviewThread from '../detail/ReviewThread'
import { useReviews } from '../../hooks/useReviews'

export default function EpisodeModal({ work, sNum, eNum, currentUser, onClose }) {
  const season = work.seasons.find((s) => s.n === sNum)
  const ep = season.episodes.find((e) => e.n === eNum)
  const label = `S${sNum} · ${term(work.category).ep} ${eNum}${ep.title && !/^Épisode /.test(ep.title) ? ' · ' + ep.title : ''}`
  const { episodeReviews, addReview, deleteReview } = useReviews(work.id, currentUser)
  const reviews = episodeReviews.filter(r => r.sNum === sNum && r.eNum === eNum)

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.68)', zIndex: 70, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '7vh 20px 20px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#15151d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{work.title}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, marginTop: 2 }}>{label}</div>
          </div>
          <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ padding: '0 22px 22px', paddingTop: 20 }}>
          <ReviewThread
            reviews={reviews}
            currentUserId={currentUser?.uid}
            onAdd={({ text }) => addReview({ sNum, eNum, text, rating: null })}
            onDelete={deleteReview}
            locked={false}
            lockedMessage=""
            showRating={false}
          />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/modals/EpisodeModal.jsx
rtk git commit -m "feat: EpisodeModal uses ReviewThread + useReviews, removes JournalThread"
```

---

### Task 5: Update `DashboardView`

**Files:**
- Modify: `src/components/dashboard/DashboardView.jsx`

**Interfaces:**
- Consumes (new): `reviews: Review[]` — flat array from `useAllReviews`, all works
- Consumes (removed): `feed`, `reviews` (old per-user reviews array)
- `Review` shape: `{ id, workId, sNum, eNum, userId, handle, text, rating, ts }`
- Visibility filter: episode reviews shown only if `watched[workId-sNum-eNum]` exists; global reviews shown only if `work.status` in `['en_cours', 'termine']`

- [ ] **Step 1: Rewrite the activity section in `DashboardView.jsx`**

Replace lines 29–51 (feed/reviews merge) and lines 83–109 (allActivity render) with the new logic. Full file:

```jsx
// src/components/dashboard/DashboardView.jsx
import PosterBox from '../ui/PosterBox'
import { relText } from '../../lib/domain'

function nextEpisode(work, watched) {
  if (!work.seasons) return null
  const now = Date.now()
  for (const s of work.seasons) {
    for (const e of s.episodes) {
      if (!watched[`${work.id}-${s.n}-${e.n}`] && e.air <= now) return { s, e }
    }
  }
  return null
}

const ACTIVE = new Set(['en_cours', 'termine'])

export default function DashboardView({ works, watched, reviews, onOpenWork, onWatchNext }) {
  const list = Object.values(works)
  const enCours = list.filter((w) => w.status === 'en_cours')
  let totalEps = 0, toCatch = 0
  list.forEach((w) => {
    if (!w.seasons) return
    w.seasons.forEach((s) => s.episodes.forEach((e) => {
      const key = `${w.id}-${s.n}-${e.n}`
      if (watched[key]) totalEps++
      else if (e.air <= Date.now() && w.status === 'en_cours') toCatch++
    }))
  })
  const upNext = enCours.map((w) => ({ w, nx: nextEpisode(w, watched) })).filter((x) => x.nx).slice(0, 4)

  const visible = (reviews || []).filter(r => {
    const w = works[r.workId]
    if (!w || !ACTIVE.has(w.status)) return false
    if (r.sNum != null) return !!watched[`${r.workId}-${r.sNum}-${r.eNum}`]
    return true
  }).slice(0, 50)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          [String(list.length), 'Œuvres suivies'],
          [String(enCours.length), 'En cours'],
          [String(totalEps), 'Épisodes vus'],
          [String(toCatch), 'À rattraper']
        ].map(([value, label]) => (
          <div key={label} style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30 }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Prochain épisode à regarder</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 34 }}>
        {upNext.map(({ w, nx }) => (
          <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 12, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
            <PosterBox id={w.id} title={w.title} poster={w.poster} width={54} height={78} radius={11} fontSize={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 3 }}>S{nx.s.n} · Épisode {nx.e.n}</div>
            </div>
            <div onClick={(ev) => { ev.stopPropagation(); onWatchNext(w.id, nx.s.n, nx.e.n) }} style={{ alignSelf: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✓</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Dernières notes & commentaires</h3>
      {visible.length === 0
        ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>Aucun avis sur des épisodes vus ou œuvres terminées.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {visible.map(r => {
              const w = works[r.workId]
              const subtitle = r.sNum != null ? `S${r.sNum} · Ep. ${r.eNum}` : 'Avis global'
              return (
                <div key={r.id} onClick={() => w && onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
                  <PosterBox id={w?.id || r.workId} title={w?.title || ''} poster={w?.poster} width={46} height={66} radius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w?.title || r.workId}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>{subtitle}</span>
                      <span style={{ fontSize: 12, color: 'var(--color-muted-3)' }}>· {r.handle}</span>
                    </div>
                    {r.rating > 0 && <div style={{ color: 'var(--color-gold)', fontSize: 13, marginBottom: 2 }}>{'★'.repeat(r.rating)}</div>}
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{r.text}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>{relText(r.ts, Date.now())}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
rtk git add src/components/dashboard/DashboardView.jsx
rtk git commit -m "feat: DashboardView uses global reviews collection, removes feed merge"
```

---

### Task 6: Wire everything in `App.jsx` + clean up `useWorkActions`

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/hooks/useWorkActions.js`

**Interfaces:**
- `App.jsx` adds: `useAllReviews(currentUser)` call in Shell; passes `currentUser` to `DetailRoute`, `DetailView`, `EpisodeModal`; passes `reviews` to `DashboardView`
- `useWorkActions.js` removes: `postComment`, `toggleLike`, `deleteComment`, work-scope `setRating`; updates `clearAll`

- [ ] **Step 1: Update `App.jsx`**

In `App.jsx`, make these changes:

1. Add import at top:
```js
import { useAllReviews } from './hooks/useReviews'
```

2. Update `DetailRoute` to accept and pass `currentUser`:
```jsx
function DetailRoute({ data, workActions, onOpenEpisode, currentUser }) {
  const { workId } = useParams()
  const work = data.works[workId]
  if (!work) return <Navigate to="/library" replace />
  return (
    <DetailView
      work={work}
      watched={data.watched}
      games={data.games}
      actions={workActions}
      favorites={data.favorites}
      onOpenEpisode={onOpenEpisode}
      currentUser={currentUser}
    />
  )
}
```

3. In `Shell`, add after `const workActions = ...`:
```js
const currentUser = user ? { uid: user.uid, handle: data.profile.handle } : null
const allReviews = useAllReviews(currentUser)
```

4. Update `/dashboard` route — remove `ratings` and `feed`, add `reviews`:
```jsx
<Route path="/dashboard" element={
  <DashboardView
    works={data.works}
    watched={data.watched}
    reviews={allReviews}
    onOpenWork={openWork}
    onWatchNext={(id, s, e) => workActions.markWatchedToast(data.works[id], s, e, setToast)}
  />
} />
```

5. Update `/work/:workId` route to pass `currentUser`:
```jsx
<Route path="/work/:workId" element={
  <DetailRoute
    data={data}
    workActions={workActions}
    onOpenEpisode={(w, s, e) => setEpisodeModal({ workId: w.id, sNum: s.n, eNum: e.n })}
    currentUser={currentUser}
  />
} />
```

6. Update `EpisodeModal` usage — remove `ratings` and `feed`, add `currentUser`:
```jsx
{episodeModal && data.works[episodeModal.workId] && (
  <EpisodeModal
    work={data.works[episodeModal.workId]}
    sNum={episodeModal.sNum}
    eNum={episodeModal.eNum}
    currentUser={currentUser}
    onClose={() => setEpisodeModal(null)}
  />
)}
```

- [ ] **Step 2: Remove dead actions from `useWorkActions.js`**

Remove the three private feed functions and update `setRating` to not write `reviews`. Replace lines 58–99 with:

```js
async function setRating(scope, id, val) {
  // episode ratings only; work ratings live in global reviews collection
  if (scope !== 'e') return
  const key = `${scope}:${id}`
  const current = data.ratings?.[key] || 0
  const next = current === val ? 0 : val
  await mutate({ ratings: { ...data.ratings, [key]: next } })
}
```

Update `clearAll` to remove feed/reviews (they're no longer in user data):
```js
async function clearAll() {
  if (window.confirm('Tout effacer ? Progression, notes et œuvres importées seront supprimés. Irréversible.')) {
    await mutate({ works: {}, watched: {}, ratings: {}, games: {}, favorites: {} })
  }
}
```

Update the return object — remove `postComment`, `toggleLike`, `deleteComment`:
```js
return { addWork, toggleEpisode, markSeason, setRating, setStatus, addGameHours, toggleGameTier, markAllWatched, resetProgress, clearAll, toggleFavorite, markWatchedToast, refreshAllWorks }
```

- [ ] **Step 3: Run all tests**

```bash
rtk vitest run
```
Expected: all tests pass. (DetailView.test.jsx mocks useReviews; other tests don't reference removed actions.)

- [ ] **Step 4: Commit**

```bash
rtk git add src/App.jsx src/hooks/useWorkActions.js
rtk git commit -m "feat: wire useAllReviews in Shell, pass currentUser to DetailView/EpisodeModal, remove dead feed actions"
```

---

## Firestore Setup (manual, outside code)

After deploying, update Firestore security rules in the Firebase console:

```
match /reviews/{reviewId} {
  allow read: if request.auth != null;
  allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
  allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
  allow update: if false;
}
```

Create the composite index: collection `reviews`, fields `workId ASC` + `ts DESC`. Firebase will log the direct creation link on first query.
