import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { pressable } from '../../lib/a11y'

function fmtFull(ts) {
  const d = new Date(ts)
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}


function epLabel(work, season, ep, t) {
  const cat = work.category
  const epWord = t('term.' + cat + '.ep')
  const seasonCat = ['series', 'animes'].includes(cat)
  const base = seasonCat ? `S${season.n} · ${epWord} ${ep.n}` : `${epWord} ${ep.n}`
  return ep.title && !/^Épisode /.test(ep.title) ? `${base} · ${ep.title}` : base
}

export default function SeasonList({ work, watched, onToggleEpisode, onMarkSeason, onOpenEpisode }) {
  const { t } = useTranslation()
  const now = Date.now()
  const firstUnwatched = work.seasons.find((s) => s.episodes.some((e) => e.air > 0 && e.air <= now && !watched[`${work.id}-${s.n}-${e.n}`]))
  const lastSeason = work.seasons[work.seasons.length - 1]
  const [expanded, setExpanded] = useState(() => new Set(lastSeason ? [firstUnwatched ? firstUnwatched.n : lastSeason.n] : []))

  function toggleExpanded(n) {
    const next = new Set(expanded)
    next.has(n) ? next.delete(n) : next.add(n)
    setExpanded(next)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {work.seasons.map((s) => {
        const aired = s.episodes.filter((e) => e.air > 0 && e.air <= now)
        const done = aired.filter((e) => watched[`${work.id}-${s.n}-${e.n}`]).length
        const isOpen = expanded.has(s.n)
        return (
          <div key={s.n} style={{ border: '1px solid var(--color-border-btn)', borderRadius: 16, overflow: 'hidden', background: 'var(--color-surface)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px' }}>
              <div {...pressable(() => toggleExpanded(s.n), { expanded: isOpen })} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{s.name || t('season.default', { n: s.n })}</span>
                {s.release && <span style={{ fontSize: 12, color: 'var(--color-muted-2)' }}>{fmtFull(s.release)}</span>}
                <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('season.seen', { done, total: s.episodes.length })}</span>
              </div>
              <div
                {...pressable(() => onMarkSeason(work.id, s.n))}
                style={{ flexShrink: 0, fontSize: 12.5, color: 'var(--color-accent)', fontWeight: 600, padding: '5px 10px', borderRadius: 8, cursor: 'pointer' }}
              >
                {aired.length > 0 && done === aired.length ? t('season.unmarkAll') : t('season.markAll')}
              </div>
            </div>
            {isOpen && (
              <div>
                {s.episodes.map((e) => {
                  const key = `${work.id}-${s.n}-${e.n}`
                  const isWatched = !!watched[key]
                  const aired2 = e.air > 0 && e.air <= now
                  return (
                    <div key={e.n} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 20px', borderTop: '1px solid var(--color-border)', opacity: isWatched ? .62 : (aired2 ? 1 : .5) }}>
                      <div
                        {...pressable(() => { if (aired2) onToggleEpisode(work.id, s.n, e.n) }, { role: 'checkbox', checked: isWatched, label: epLabel(work, s, e, t), disabled: !aired2 })}
                        style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: aired2 ? 'pointer' : 'not-allowed', color: 'var(--color-on-accent)', background: isWatched ? 'var(--color-accent-fill)' : 'transparent', border: `2px solid ${isWatched ? 'var(--color-accent-fill)' : (aired2 ? 'var(--color-check-border)' : 'var(--color-check-border-dim)')}` }}
                      >
                        {isWatched ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5, textDecoration: isWatched ? 'line-through' : 'none', color: isWatched ? 'var(--color-muted)' : 'inherit' }}>{epLabel(work, s, e, t)}</span>
                        {e.air > 1000 && <span style={{ marginLeft: 8, fontSize: 12, color: aired2 ? 'var(--color-muted)' : 'var(--color-accent)', fontWeight: 500 }}>{fmtFull(e.air)}</span>}
                      </div>
                      <div {...pressable(() => aired2 && onOpenEpisode(work, s, e))} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aired2 ? 'pointer' : 'default', color: aired2 ? 'var(--color-muted)' : 'transparent', fontSize: 20, lineHeight: 1 }}>›</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
