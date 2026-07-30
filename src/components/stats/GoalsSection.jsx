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
                {reached && <span style={{ fontSize: 14, marginLeft: 2 }}>{t('stats.goalsReached')}</span>}
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
