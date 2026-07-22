# Library & Calendar — Category-Aware Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make library status labels and calendar tabs aware of media category (films, livres, jeux, etc.).

**Architecture:** Two independent changes sharing the same i18n foundation. Library: compute `a_voir` label from selected category. Calendar: add category chip state and split work-processing logic by category type.

**Tech Stack:** React, react-i18next, Vitest + Testing Library

## Global Constraints

- i18n keys must exist in both `src/i18n/fr.json` and `src/i18n/en.json`
- Category keys: `all`, `series`, `films`, `animes`, `livres`, `jeux`, `musique`
- Status keys: `a_voir`, `en_cours`, `termine`, `abandonne`
- Musique remains disabled (coming soon badge) — no logic needed
- No new dependencies

---

## File Map

| File | Change |
|---|---|
| `src/i18n/fr.json` | Add `status.a_voir_livres`, `status.a_voir_jeux` |
| `src/i18n/en.json` | Same |
| `src/components/library/LibraryView.jsx` | Compute `aVoirLabel` from `category` state |
| `src/components/library/LibraryView.test.jsx` | Test label adapts per category |
| `src/components/calendar/CalendarView.jsx` | Category chips + per-type list computation + non-series card rendering |
| `src/components/calendar/CalendarView.test.jsx` | Test film/livre routing into correct tabs |

---

### Task 1: i18n — Add per-category `a_voir` keys

**Files:**
- Modify: `src/i18n/fr.json` (after line 105)
- Modify: `src/i18n/en.json` (after line 105)

**Interfaces:**
- Produces: `t('status.a_voir_livres')` → "À lire" / "Plan to read", `t('status.a_voir_jeux')` → "À jouer" / "Plan to play"

- [ ] **Step 1: Add keys to fr.json**

In `src/i18n/fr.json`, after line `"status.a_voir": "À voir",` add:

```json
"status.a_voir_livres": "À lire",
"status.a_voir_jeux": "À jouer",
```

- [ ] **Step 2: Add keys to en.json**

In `src/i18n/en.json`, after line `"status.a_voir": "Plan to watch",` add:

```json
"status.a_voir_livres": "Plan to read",
"status.a_voir_jeux": "Plan to play",
```

- [ ] **Step 3: Commit**

```bash
git add src/i18n/fr.json src/i18n/en.json
git commit -m "i18n: add per-category a_voir labels for livres and jeux"
```

---

### Task 2: Library — adapt `a_voir` label per selected category

**Files:**
- Modify: `src/components/library/LibraryView.jsx`
- Modify: `src/components/library/LibraryView.test.jsx`

**Interfaces:**
- Consumes: `t('status.a_voir_livres')`, `t('status.a_voir_jeux')` from Task 1
- Produces: STATUSES array with dynamic `a_voir` label based on `category` state

- [ ] **Step 1: Write failing test**

Replace content of `src/components/library/LibraryView.test.jsx`:

```jsx
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LibraryView from './LibraryView'

const works = {
  w1: { id: 'w1', title: 'One Piece', category: 'animes', year: 1999, status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] },
  w2: { id: 'w2', title: 'Dune', category: 'livres', year: 2020, status: 'a_voir' },
  w3: { id: 'w3', title: 'Zelda', category: 'jeux', year: 2023, status: 'a_voir' },
}

describe('LibraryView', () => {
  it('renders a card per work with title and category/year meta', () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
  })

  it('shows the empty state when no work matches', () => {
    render(<LibraryView works={{}} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('No works match these filters.')).toBeInTheDocument()
  })

  it('shows "À voir" as default a_voir label', () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('À voir')).toBeInTheDocument()
  })

  it('shows "À lire" when livres category selected', async () => {
    const user = userEvent.setup()
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    await user.click(screen.getByText('Livres'))
    expect(screen.getByText('À lire')).toBeInTheDocument()
    expect(screen.queryByText('À voir')).not.toBeInTheDocument()
  })

  it('shows "À jouer" when jeux category selected', async () => {
    const user = userEvent.setup()
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    await user.click(screen.getByText('Jeux'))
    expect(screen.getByText('À jouer')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
rtk vitest run src/components/library/LibraryView.test.jsx
```

Expected: "À lire" and "À jouer" tests fail.

- [ ] **Step 3: Add `aVoirLabel` computed from category**

In `src/components/library/LibraryView.jsx`, replace the `STATUSES` array (lines 23–29):

```jsx
const aVoirLabel = category === 'livres'
  ? t('status.a_voir_livres')
  : category === 'jeux'
  ? t('status.a_voir_jeux')
  : t('status.a_voir')

const STATUSES = [
  ['all', t('cat.all')],
  ['en_cours', t('status.en_cours')],
  ['a_voir', aVoirLabel],
  ['termine', t('status.termine')],
  ['abandonne', t('status.abandonne')],
]
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
rtk vitest run src/components/library/LibraryView.test.jsx
```

Expected: all 5 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/library/LibraryView.jsx src/components/library/LibraryView.test.jsx
git commit -m "feat(library): adapt a_voir status label per selected category"
```

---

### Task 3: Calendar — category chips + per-type tab logic

**Files:**
- Modify: `src/components/calendar/CalendarView.jsx`
- Modify: `src/components/calendar/CalendarView.test.jsx`

**Interfaces:**
- Consumes: `t('cat.*')` keys (already exist), `w.release` (timestamp, films/jeux), `w.year` (number, livres), `w.seasons` (series/animes)
- Produces: category-filtered `catchGroups`, `upcoming`, `abandoned` lists

- [ ] **Step 1: Write failing tests**

Replace content of `src/components/calendar/CalendarView.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarView from './CalendarView'

const now = Date.now()
const DAY = 86400000

describe('CalendarView', () => {
  it('shows the up-to-date message when nothing to catch up on', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'termine', seasons: null } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText("You're all caught up! 🎉")).toBeInTheDocument()
  })

  it('lists an aired-unwatched episode under À rattraper', () => {
    const works = { w1: { id: 'w1', title: 'From', category: 'series', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Ep', air: now - DAY }] }] } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('From')).toBeInTheDocument()
  })

  it('shows released a_voir film in À rattraper', async () => {
    const user = userEvent.setup()
    const works = {
      w1: { id: 'w1', title: 'Dune', category: 'films', status: 'a_voir', release: now - DAY, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('Dune')).toBeInTheDocument()
  })

  it('shows unreleased a_voir film in À venir', async () => {
    const user = userEvent.setup()
    const works = {
      w1: { id: 'w1', title: 'Avatar 3', category: 'films', status: 'a_voir', release: now + 7 * DAY, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    await user.click(screen.getByText(/À venir/))
    expect(screen.getByText('Avatar 3')).toBeInTheDocument()
  })

  it('shows a_voir livre with future year in À venir', async () => {
    const user = userEvent.setup()
    const currentYear = new Date().getFullYear()
    const works = {
      w1: { id: 'w1', title: 'Future Book', category: 'livres', status: 'a_voir', year: currentYear + 1, release: null, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    await user.click(screen.getByText(/À venir/))
    expect(screen.getByText('Future Book')).toBeInTheDocument()
  })

  it('shows category chips row', () => {
    render(<CalendarView works={{}} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('Tout')).toBeInTheDocument()
    expect(screen.getByText('Films')).toBeInTheDocument()
    expect(screen.getByText('Livres')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
rtk vitest run src/components/calendar/CalendarView.test.jsx
```

Expected: category chip tests and film/livre routing tests fail.

- [ ] **Step 3: Rewrite CalendarView.jsx**

Replace `src/components/calendar/CalendarView.jsx` with:

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText, DAY } from '../../lib/domain'
import { posterGradient } from '../../lib/posterBox'

const TABS = ['rattraper', 'venir', 'abandonne']
const CAT_KEYS = ['all', 'series', 'films', 'animes', 'livres', 'jeux']

export default function CalendarView({ works, watched, onOpenWork, isMobile, onMarkWatched }) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('rattraper')
  const [category, setCategory] = useState('all')
  const now = Date.now()
  const currentYear = new Date().getFullYear()

  const TAB_LABELS = {
    rattraper: t('calendar.catchUp'),
    venir: t('calendar.upcoming'),
    abandonne: t('calendar.dropped'),
  }

  const catchGroups = []
  const upcoming = []
  const abandoned = []

  Object.values(works).forEach((w) => {
    const cat = w.category
    if (category !== 'all' && cat !== category) return

    if (w.seasons && (cat === 'series' || cat === 'animes' || !cat)) {
      // Series / animes: episode-based logic
      let first = null, remaining = 0
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        const key = `${w.id}-${s.n}-${e.n}`
        if (!watched[key] && e.air > 0 && e.air <= now && w.status === 'en_cours') {
          if (!first) first = { s, e }
          remaining++
        }
      }))
      if (first) catchGroups.push({ w, ...first, remaining, type: 'episode' })

      let nextUp = null
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        if (e.air > now && (w.status === 'en_cours' || w.status === 'a_voir') && !nextUp) nextUp = { s, e }
      }))
      if (nextUp) upcoming.push({ w, ...nextUp, type: 'episode' })

      if (w.status === 'abandonne') {
        let aFirst = null, aRemaining = 0
        w.seasons.forEach((s) => s.episodes.forEach((e) => {
          const key = `${w.id}-${s.n}-${e.n}`
          if (!watched[key] && e.air > 0 && e.air <= now) {
            if (!aFirst) aFirst = { s, e }
            aRemaining++
          }
        }))
        if (aFirst) abandoned.push({ w, ...aFirst, remaining: aRemaining, type: 'episode' })
      }
    } else if (cat === 'films' || cat === 'jeux') {
      // Films / jeux: release timestamp
      if (w.status === 'a_voir') {
        if (w.release && w.release > now) {
          upcoming.push({ w, type: 'release' })
        } else {
          catchGroups.push({ w, type: 'release' })
        }
      }
      if (w.status === 'abandonne') abandoned.push({ w, type: 'release' })
    } else if (cat === 'livres') {
      // Livres: year-based
      if (w.status === 'a_voir') {
        if (w.year && w.year > currentYear) {
          upcoming.push({ w, type: 'livre' })
        } else {
          catchGroups.push({ w, type: 'livre' })
        }
      }
      if (w.status === 'abandonne') abandoned.push({ w, type: 'livre' })
    }
  })

  catchGroups.sort((a, b) => {
    if (a.e && b.e) return b.e.air - a.e.air
    if (a.w.release && b.w.release) return b.w.release - a.w.release
    return (b.w.year || 0) - (a.w.year || 0)
  })
  upcoming.sort((a, b) => {
    if (a.e && b.e) return a.e.air - b.e.air
    if (a.w.release && b.w.release) return a.w.release - b.w.release
    return (a.w.year || 0) - (b.w.year || 0)
  })
  abandoned.sort((a, b) => {
    if (a.e && b.e) return b.e.air - a.e.air
    return 0
  })

  const counts = { rattraper: catchGroups.length, venir: upcoming.length, abandonne: abandoned.length }

  function SimpleCard({ item }) {
    const { w } = item
    const { from, to } = posterGradient(w.id)
    const subtitle = w.release
      ? new Date(w.release).toLocaleDateString(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' })
      : w.year ? String(w.year) : null
    return (
      <div onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
        {w.poster
          ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${w.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.9 }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}, ${to})`, opacity: 0.25 }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', opacity: 0.68 }} />
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 76, alignSelf: 'stretch', borderRadius: '14px 0 0 14px', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
          {w.poster
            ? <img src={w.poster} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <PosterBox id={w.id} title={w.title} poster={null} width="100%" height="100%" radius={0} fontSize={22} style={{ flexShrink: 1 }} />
          }
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '12px 14px 12px 12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
            {subtitle && (
              <span style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                {subtitle}
              </span>
            )}
          </div>
        </div>
      </div>
    )
  }

  function EpisodeCard({ item, showMarkWatched }) {
    const { w, s, e, remaining } = item
    const { from, to } = posterGradient(w.id)
    return (
      <div onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
        {w.poster
          ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${w.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.9 }} />
          : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}, ${to})`, opacity: 0.25 }} />
        }
        <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', opacity: 0.68 }} />
        <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 76, alignSelf: 'stretch', borderRadius: '14px 0 0 14px', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
          {w.poster
            ? <img src={w.poster} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            : <PosterBox id={w.id} title={w.title} poster={null} width="100%" height="100%" radius={0} fontSize={22} style={{ flexShrink: 1 }} />
          }
        </div>
        <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
            <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
                S{s.n} · {t('term.series.ep')} {e.n}
              </span>
              {remaining > 1 && (
                <span style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.75)', background: 'rgba(0,0,0,0.35)', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>
                  {showMarkWatched ? t('calendar.remaining', { count: remaining - 1 }) : t('calendar.remainingUnseen', { count: remaining - 1 })}
                </span>
              )}
            </div>
          </div>
          {showMarkWatched && (
            <div onClick={(ev) => { ev.stopPropagation(); onMarkWatched(w.id, s.n, e.n) }} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{t('calendar.markWatched')}</div>
          )}
        </div>
      </div>
    )
  }

  function UpcomingEpisodeRow({ item }) {
    const { w, s, e } = item
    const d = new Date(e.air)
    return (
      <div onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
        <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--color-accent)', lineHeight: 1 }}>{d.getDate()}</div>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginTop: 2 }}>{d.toLocaleString(i18n.language, { month: 'short' })}</div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
          <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>S{s.n} · {t('term.series.ep')} {e.n}</div>
        </div>
        <div style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: e.air < now + 7 * DAY ? 'var(--color-accent)' : 'var(--color-chip-bg)', color: e.air < now + 7 * DAY ? '#fff' : 'var(--color-muted)' }}>{relText(e.air, now, i18n.language)}</div>
      </div>
    )
  }

  function UpcomingReleaseRow({ item }) {
    const { w } = item
    const dateLabel = w.release
      ? relText(w.release, now, i18n.language)
      : w.year ? String(w.year) : null
    return (
      <div onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
        </div>
        {dateLabel && (
          <div style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: 'var(--color-chip-bg)', color: 'var(--color-muted)' }}>{dateLabel}</div>
        )}
      </div>
    )
  }

  return (
    <div>
      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CAT_KEYS.map((key) => (
          <div
            key={key}
            onClick={() => setCategory(key)}
            style={{ padding: '5px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 600, fontSize: 12, background: category === key ? 'var(--color-accent)' : 'var(--color-chip-bg)', color: category === key ? '#fff' : 'var(--color-muted)' }}
          >
            {t(`cat.${key}`)}
          </div>
        ))}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {TABS.map((tk) => (
          <button key={tk} onClick={() => setTab(tk)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === tk ? 'var(--color-accent)' : 'var(--color-chip-bg)', color: tab === tk ? '#fff' : 'var(--color-muted)' }}>
            {TAB_LABELS[tk]}{counts[tk] > 0 ? ` · ${counts[tk]}` : ''}
          </button>
        ))}
      </div>

      {tab === 'rattraper' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catchGroups.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.upToDate')}</div>}
          {catchGroups.map((item, i) =>
            item.type === 'episode'
              ? <EpisodeCard key={item.w.id} item={item} showMarkWatched={true} />
              : <SimpleCard key={item.w.id + i} item={item} />
          )}
        </div>
      )}

      {tab === 'venir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcoming.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingUpcoming')}</div>}
          {upcoming.slice(0, 14).map((item, i) =>
            item.type === 'episode'
              ? <UpcomingEpisodeRow key={`${item.w.id}-${item.s.n}-${item.e.n}`} item={item} />
              : <UpcomingReleaseRow key={item.w.id + i} item={item} />
          )}
        </div>
      )}

      {tab === 'abandonne' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {abandoned.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingDropped')}</div>}
          {abandoned.map((item, i) =>
            item.type === 'episode'
              ? <EpisodeCard key={item.w.id} item={item} showMarkWatched={false} />
              : <SimpleCard key={item.w.id + i} item={item} />
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
rtk vitest run src/components/calendar/CalendarView.test.jsx
```

Expected: all 6 pass.

- [ ] **Step 5: Commit**

```bash
git add src/components/calendar/CalendarView.jsx src/components/calendar/CalendarView.test.jsx
git commit -m "feat(calendar): add category chips and per-type tab logic for films, jeux, livres"
```

---

### Task 4: Run full test suite

- [ ] **Step 1: Run all tests**

```bash
rtk vitest run
```

Expected: all pass.

- [ ] **Step 2: If failures — fix and re-run**

Fix any broken tests, then re-run until clean.

- [ ] **Step 3: Final commit if fixes needed**

```bash
git add -p
git commit -m "fix: address test regressions after category-aware calendar"
```
