import { useTranslation } from 'react-i18next'
import { getUnlocked } from '../../lib/achievements'
import AchievementIcon from './AchievementIcon'

const NEXT_COUNT = 3

function Progress({ value, threshold }) {
  const pct = Math.min(100, Math.round((value / threshold) * 100))
  return (
    <div role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(value, threshold)} style={{ height: 4, borderRadius: 4, background: 'var(--color-progress-track)', overflow: 'hidden', width: '100%' }}>
      <div style={{ height: '100%', width: `${pct}%`, background: 'var(--color-accent-fill)', borderRadius: 4 }} />
    </div>
  )
}

function Tile({ a, locked }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 10px', borderRadius: 14, background: 'var(--color-chip-bg)', border: `1px ${locked ? 'dashed' : 'solid'} var(--color-border-btn)` }}>
      <span style={{ color: locked ? 'var(--color-muted)' : 'var(--color-accent)', display: 'inline-flex' }}><AchievementIcon id={a.id} size={28} /></span>
      <span style={{ fontWeight: locked ? 600 : 700, fontSize: 13, textAlign: 'center' }}>{a.label}</span>
      <span style={{ fontSize: 12.5, color: 'var(--color-muted)', textAlign: 'center' }}>{a.desc}</span>
      {locked && (
        <>
          <Progress value={a.value} threshold={a.threshold} />
          <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>{a.value}/{a.threshold}</span>
        </>
      )}
    </div>
  )
}

export default function AchievementsGrid({ works, watched, ratings, compact = false }) {
  const { t } = useTranslation()
  const all = getUnlocked(works, watched, ratings)
  const unlocked = all.filter((a) => a.unlocked)
  // The ones closest to their threshold are the next goals; the rest stay folded away.
  const locked = all.filter((a) => !a.unlocked).sort((a, b) => b.value / b.threshold - a.value / a.threshold)
  const next = locked.slice(0, NEXT_COUNT)
  const later = locked.slice(NEXT_COUNT)

  if (compact) {
    return (
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', marginBottom: 10 }}>
          {t('achievements.title')} · {unlocked.length}/{all.length}
        </div>
        <ul style={{ display: 'flex', flexWrap: 'wrap', gap: 8, listStyle: 'none', margin: 0, padding: 0 }}>
          {[...unlocked, ...next].map((a) => (
            <li
              key={a.id}
              title={`${a.label} — ${a.desc}`}
              aria-label={`${a.unlocked ? t('achievements.unlocked') : t('achievements.locked')} : ${a.label}, ${a.desc}`}
              style={{ display: 'inline-flex', padding: 8, borderRadius: 10, border: `1px ${a.unlocked ? 'solid' : 'dashed'} var(--color-border-btn)`, color: a.unlocked ? 'var(--color-accent)' : 'var(--color-muted)' }}
            >
              <AchievementIcon id={a.id} size={22} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  const heading = { fontSize: 13, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', letterSpacing: '.04em', marginBottom: 14 }
  const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }
  return (
    <div>
      {next.length > 0 && (
        <>
          <div style={heading}>{t('achievements.next')}</div>
          <div style={{ ...grid, marginBottom: 24 }}>{next.map((a) => <Tile key={a.id} a={a} locked />)}</div>
        </>
      )}
      {unlocked.length > 0 && (
        <>
          <div style={heading}>{t('achievements.unlocked')} · {unlocked.length}</div>
          <div style={{ ...grid, marginBottom: 24 }}>{unlocked.map((a) => <Tile key={a.id} a={a} />)}</div>
        </>
      )}
      {later.length > 0 && (
        <details>
          <summary style={{ ...heading, cursor: 'pointer', marginBottom: 14, minHeight: 44, display: 'flex', alignItems: 'center' }}>{t('achievements.showLocked', { count: later.length })}</summary>
          <div style={grid}>{later.map((a) => <Tile key={a.id} a={a} locked />)}</div>
        </details>
      )}
    </div>
  )
}
