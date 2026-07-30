# Yearly Goals per Media Category — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Objectifs [year]" section at the top of StatsView with per-category yearly completion goals, progress bars, and inline editing.

**Architecture:** New `GoalsSection` component reads `finishedAt` timestamps on works to compute current-year progress, reads goals from `settings.goals`, and writes back via `onSaveSettings`. The `finishedAt` field is stamped on works when their status is set to `'termine'` — in both the manual `setStatus` path and the auto-computed `buildStatusPatch` path.

**Tech Stack:** React 18, Vitest + @testing-library/react, Firebase Firestore (existing `mutate` API), react-i18next

## Global Constraints

- No new Firestore collections or documents — all writes go through existing `mutate()` in useAppData
- `finishedAt` set **only** if not already present (never overwrite)
- Goals default to `{}` (zero = not set); do not show progress bar when goal = 0
- 6 categories: `series`, `films`, `animes`, `mangas`, `livres`, `jeux`
- i18n keys added to both `fr.json` and `en.json`
- Tests run with: `pnpm vitest run`

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `src/hooks/useWorkActions.js` | Modify | Stamp `finishedAt` on works when status → `'termine'` |
| `src/hooks/useAppData.js` | Modify | Add `goals: {}` to `EMPTY_DATA.settings` |
| `src/i18n/fr.json` | Modify | Add goals i18n keys (French) |
| `src/i18n/en.json` | Modify | Add goals i18n keys (English) |
| `src/components/stats/GoalsSection.jsx` | Create | Goals section UI with inline edit |
| `src/components/stats/GoalsSection.test.jsx` | Create | Tests for GoalsSection |
| `src/components/stats/StatsView.jsx` | Modify | Accept `settings` + `onSaveSettings`; render `<GoalsSection>` |
| `src/App.jsx` | Modify | Pass `settings` and `onSaveSettings` to `<StatsView>` |

---

### Task 1: Stamp `finishedAt` on works + add `goals` default

**Files:**
- Modify: `src/hooks/useWorkActions.js:86-89` (`setStatus`) and `25-29` (`buildStatusPatch`)
- Modify: `src/hooks/useAppData.js:34-38` (`EMPTY_DATA`)

**Interfaces:**
- Produces: works in Firestore gain optional `finishedAt: number` (ms timestamp)
- Produces: `data.settings.goals` exists (defaults to `{}`)

- [ ] **Step 1: Write failing test for `setStatus` stamping `finishedAt`**

Create `src/hooks/useWorkActions.test.js`:

```js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useWorkActions } from './useWorkActions'

describe('setStatus → finishedAt', () => {
  it('stamps finishedAt when setting status to termine on a work that lacks it', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const mutate = vi.fn()
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const actions = useWorkActions(data, mutate)

    const before = Date.now()
    await actions.setStatus('w1', 'termine')
    const after = Date.now()

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.status).toBe('termine')
    expect(saved.finishedAt).toBeGreaterThanOrEqual(before)
    expect(saved.finishedAt).toBeLessThanOrEqual(after)
  })

  it('does not overwrite finishedAt when already set', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'en_cours', finishedAt: 999 }
    const mutate = vi.fn()
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const actions = useWorkActions(data, mutate)

    await actions.setStatus('w1', 'termine')

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBe(999)
  })

  it('does not stamp finishedAt when status is not termine', async () => {
    const work = { id: 'w1', title: 'Film', category: 'films', status: 'a_voir' }
    const mutate = vi.fn()
    const data = { works: { w1: work }, watched: {}, feed: [] }
    const actions = useWorkActions(data, mutate)

    await actions.setStatus('w1', 'en_cours')

    const saved = mutate.mock.calls[0][0].works.w1
    expect(saved.finishedAt).toBeUndefined()
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run src/hooks/useWorkActions.test.js
```

Expected: FAIL — `finishedAt` is undefined.

- [ ] **Step 3: Update `setStatus` in `src/hooks/useWorkActions.js`**

Replace lines 86-90:

```js
async function setStatus(workId, status) {
  const work = data.works[workId]
  const updatedWork = { ...work, status }
  if (status === 'termine' && !work.finishedAt) {
    updatedWork.finishedAt = Date.now()
  }
  const works = { ...data.works, [workId]: updatedWork }
  await mutate({ works })
}
```

- [ ] **Step 4: Update `buildStatusPatch` in `src/hooks/useWorkActions.js`**

Replace lines 25-29:

```js
function buildStatusPatch(work, watched, works) {
  const auto = computeAutoStatus(work, watched)
  if (!auto || auto === work.status) return {}
  const updatedWork = { ...work, status: auto }
  if (auto === 'termine' && !work.finishedAt) {
    updatedWork.finishedAt = Date.now()
  }
  return { works: { ...works, [work.id]: updatedWork } }
}
```

- [ ] **Step 5: Add `goals: {}` to EMPTY_DATA in `src/hooks/useAppData.js`**

Find line 35 (`settings: { startPage: ...`). Add `goals: {}` at the end of that settings object:

```js
settings: { startPage: 'library', autoNext: true, spoilerFree: true, notifNewEp: true, notifCalendar: true, notifWeekly: false, publicProfile: false, adult: false, darkMode: true, language: null, goals: {} },
```

- [ ] **Step 6: Run tests to verify they pass**

```bash
pnpm vitest run src/hooks/useWorkActions.test.js
```

Expected: PASS (3 tests)

- [ ] **Step 7: Commit**

```bash
rtk git add src/hooks/useWorkActions.js src/hooks/useAppData.js src/hooks/useWorkActions.test.js
rtk git commit -m "feat(goals): stamp finishedAt on works when status → termine"
```

---

### Task 2: i18n keys

**Files:**
- Modify: `src/i18n/fr.json`
- Modify: `src/i18n/en.json`

**Interfaces:**
- Produces: `t('stats.goalsTitle', { year: 2026 })` → `"Objectifs 2026"` (FR) / `"Goals 2026"` (EN)
- Produces: `t('stats.setGoal')` → `"Définir"` / `"Set goal"`
- Produces: `t('stats.goalsReached')` → `"Atteint !"` / `"Goal reached!"`

- [ ] **Step 1: Add keys to `src/i18n/fr.json`**

Find the `"stats.streak"` key and add after it:

```json
"stats.goalsTitle": "Objectifs {{year}}",
"stats.setGoal": "Définir",
"stats.goalsReached": "Atteint !",
```

- [ ] **Step 2: Add keys to `src/i18n/en.json`**

Find the `"stats.streak"` key and add after it:

```json
"stats.goalsTitle": "Goals {{year}}",
"stats.setGoal": "Set goal",
"stats.goalsReached": "Goal reached!",
```

- [ ] **Step 3: Verify keys load**

```bash
pnpm vitest run
```

Expected: all existing tests still PASS.

- [ ] **Step 4: Commit**

```bash
rtk git add src/i18n/fr.json src/i18n/en.json
rtk git commit -m "feat(goals): add i18n keys for yearly goals section"
```

---

### Task 3: GoalsSection component

**Files:**
- Create: `src/components/stats/GoalsSection.jsx`
- Create: `src/components/stats/GoalsSection.test.jsx`

**Interfaces:**
- Consumes: `works` (object of work documents, each may have `finishedAt: number`)
- Consumes: `settings` (object with optional `goals: { series?: number, films?: number, ... }`)
- Consumes: `onSaveSettings(updates: { goals: object })` → void
- Produces: `<GoalsSection>` React component, default export

- [ ] **Step 1: Write failing tests**

Create `src/components/stats/GoalsSection.test.jsx`:

```jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GoalsSection from './GoalsSection'

const THIS_YEAR = new Date().getFullYear()
const JAN_THIS_YEAR = new Date(THIS_YEAR, 0, 15).getTime()
const LAST_YEAR_TS = new Date(THIS_YEAR - 1, 6, 1).getTime()

const BASE_WORKS = {
  f1: { id: 'f1', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
  f2: { id: 'f2', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
  f3: { id: 'f3', category: 'films', status: 'termine', finishedAt: LAST_YEAR_TS },
  s1: { id: 's1', category: 'series', status: 'termine', finishedAt: JAN_THIS_YEAR },
}
const SETTINGS = { goals: { films: 5, series: 10 } }

describe('GoalsSection', () => {
  it('renders a card for each of the 6 categories', () => {
    render(<GoalsSection works={{}} settings={{ goals: {} }} onSaveSettings={() => {}} />)
    expect(screen.getByText('Films')).toBeInTheDocument()
    expect(screen.getByText('Series')).toBeInTheDocument()
    expect(screen.getByText('Anime')).toBeInTheDocument()
  })

  it('counts only works finished in current year', () => {
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={() => {}} />)
    // films: f1 + f2 = 2 this year (f3 is last year)
    // Goal is 5, so we see "2" as the done count next to the goal "5"
    const filmsDone = screen.getAllByText('2')
    expect(filmsDone.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Set goal when goal is 0', () => {
    render(<GoalsSection works={{}} settings={{ goals: {} }} onSaveSettings={() => {}} />)
    const setGoalButtons = screen.getAllByText('Set goal')
    expect(setGoalButtons.length).toBe(6)
  })

  it('clicking goal number shows input', () => {
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={() => {}} />)
    fireEvent.click(screen.getByText('5')) // films goal = 5
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('blur on input calls onSaveSettings with new value', () => {
    const onSave = vi.fn()
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={onSave} />)
    fireEvent.click(screen.getByText('5'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledWith({ goals: expect.objectContaining({ films: 8 }) })
  })

  it('shows checkmark when done >= goal', () => {
    const works = {
      f1: { id: 'f1', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
      f2: { id: 'f2', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
    }
    render(<GoalsSection works={works} settings={{ goals: { films: 2 } }} onSaveSettings={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
pnpm vitest run src/components/stats/GoalsSection.test.jsx
```

Expected: FAIL — `GoalsSection` not found.

- [ ] **Step 3: Create `src/components/stats/GoalsSection.jsx`**

```jsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

const CATS = ['series', 'films', 'animes', 'mangas', 'livres', 'jeux']
const CAT_COLORS = {
  series: 'var(--color-blue)',
  films: 'var(--color-pink)',
  animes: 'var(--color-accent)',
  mangas: '#f97316',
  livres: 'var(--color-green)',
  jeux: 'var(--color-gold)',
}
const CARD = { padding: 22, borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }

export default function GoalsSection({ works, settings, onSaveSettings }) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(null)
  const [draft, setDraft] = useState('')

  const currentYear = new Date().getFullYear()
  const goals = settings.goals || {}

  const countByCategory = {}
  Object.values(works).forEach((w) => {
    if (w.finishedAt && new Date(w.finishedAt).getFullYear() === currentYear) {
      countByCategory[w.category] = (countByCategory[w.category] || 0) + 1
    }
  })

  function startEdit(cat, currentGoal) {
    setEditing(cat)
    setDraft(String(currentGoal || 0))
  }

  function commitEdit(cat) {
    const val = Math.max(0, parseInt(draft, 10) || 0)
    onSaveSettings({ goals: { ...goals, [cat]: val } })
    setEditing(null)
  }

  function cancelEdit() {
    setEditing(null)
  }

  return (
    <div style={{ ...CARD, marginBottom: 30 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>
        {t('stats.goalsTitle', { year: currentYear })}
      </h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
        {CATS.map((cat) => {
          const done = countByCategory[cat] || 0
          const goal = goals[cat] || 0
          const pct = goal > 0 ? Math.min(100, Math.round((done / goal) * 100)) : 0
          const reached = goal > 0 && done >= goal
          const color = reached ? 'var(--color-green)' : CAT_COLORS[cat]

          return (
            <div key={cat} style={{ padding: '16px 18px', borderRadius: 14, background: 'var(--color-bg)', border: `1px solid ${goal === 0 ? 'var(--color-border)' : 'transparent'}` }}>
              <div style={{ fontSize: 12, color: 'var(--color-muted)', marginBottom: 8, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {t('cat.' + cat)}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 10 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 26, color, lineHeight: 1 }}>{done}</span>
                <span style={{ color: 'var(--color-muted-2)', fontSize: 16 }}>/</span>
                {editing === cat ? (
                  <input
                    type="number"
                    min="0"
                    value={draft}
                    autoFocus
                    onChange={(e) => setDraft(e.target.value)}
                    onBlur={() => commitEdit(cat)}
                    onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(cat); if (e.key === 'Escape') cancelEdit() }}
                    style={{ width: 52, fontSize: 18, fontFamily: 'var(--font-display)', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '2px solid var(--color-accent)', outline: 'none', color: 'var(--color-muted)', padding: 0 }}
                  />
                ) : (
                  <button
                    type="button"
                    onClick={() => startEdit(cat, goal)}
                    style={{ fontSize: goal === 0 ? 12 : 18, fontFamily: 'var(--font-display)', fontWeight: 700, color: 'var(--color-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, lineHeight: 1, borderBottom: goal === 0 ? '1px dashed var(--color-muted-2)' : 'none' }}
                  >
                    {goal === 0 ? t('stats.setGoal') : goal}
                  </button>
                )}
                {reached && <span style={{ fontSize: 14, marginLeft: 2 }}>✓</span>}
              </div>
              {goal > 0 && (
                <div style={{ height: 5, borderRadius: 5, background: 'var(--color-border)', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 5, transition: 'width 0.3s ease' }} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
pnpm vitest run src/components/stats/GoalsSection.test.jsx
```

Expected: PASS (6 tests). If `'Anime'` key doesn't match, check en.json for `cat.animes`.

- [ ] **Step 5: Commit**

```bash
rtk git add src/components/stats/GoalsSection.jsx src/components/stats/GoalsSection.test.jsx
rtk git commit -m "feat(goals): GoalsSection component with inline goal editing"
```

---

### Task 4: Wire GoalsSection into StatsView and App

**Files:**
- Modify: `src/components/stats/StatsView.jsx:23` (props) + `107` (JSX)
- Modify: `src/App.jsx:229-237` (StatsView Route)

**Interfaces:**
- Consumes: `GoalsSection` from `./GoalsSection`
- Consumes: `settings` prop added to `StatsView`
- Consumes: `onSaveSettings` prop added to `StatsView`

- [ ] **Step 1: Update StatsView to accept and use GoalsSection**

In `src/components/stats/StatsView.jsx`, add the import after line 5:

```jsx
import GoalsSection from './GoalsSection'
```

Change the function signature (line 23) from:

```jsx
export default function StatsView({ works, watched, ratings, onOpenWork, isMobile }) {
```

to:

```jsx
export default function StatsView({ works, watched, ratings, onOpenWork, isMobile, settings = {}, onSaveSettings }) {
```

Insert `<GoalsSection>` as the first child inside the `<div>` returned at line 108, before the top KPI cards grid:

```jsx
return (
  <div>
    {settings && onSaveSettings && (
      <GoalsSection works={works} settings={settings} onSaveSettings={onSaveSettings} />
    )}
    {/* Top KPI Cards */}
    ...
```

- [ ] **Step 2: Pass `settings` and `onSaveSettings` to StatsView in `src/App.jsx`**

Find the StatsView Route (around line 229-237):

```jsx
<Route path="/stats" element={
  <StatsView
    works={data.works}
    watched={data.watched}
    ratings={data.ratings}
    onOpenWork={openWork}
    isMobile={isMobile}
  />
} />
```

Replace with:

```jsx
<Route path="/stats" element={
  <StatsView
    works={data.works}
    watched={data.watched}
    ratings={data.ratings}
    onOpenWork={openWork}
    isMobile={isMobile}
    settings={data.settings}
    onSaveSettings={(updates) => mutate({ settings: { ...data.settings, ...updates } })}
  />
} />
```

- [ ] **Step 3: Run full test suite**

```bash
pnpm vitest run
```

Expected: all tests PASS including the pre-existing `StatsView.test.jsx` (the new `settings` prop has a default of `{}` so the existing render call still works).

- [ ] **Step 4: Commit**

```bash
rtk git add src/components/stats/StatsView.jsx src/App.jsx
rtk git commit -m "feat(goals): wire GoalsSection into StatsView"
```
