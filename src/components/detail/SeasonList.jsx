import { useState } from 'react'
import { term } from '../../lib/domain'

function fmtFull(ts) {
  const d = new Date(ts)
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}

function epLabel(work, season, ep) {
  const t = term(work.category)
  const base = (work.category === 'series' || work.category === 'animes') ? `S${season.n} · ${t.ep} ${ep.n}` : `${t.ep} ${ep.n}`
  return ep.title && !/^Épisode /.test(ep.title) ? `${base} · ${ep.title}` : base
}

export default function SeasonList({ work, watched, onToggleEpisode, onMarkSeason, onOpenEpisode }) {
  const now = Date.now()
  const firstUnwatched = work.seasons.find((s) => s.episodes.some((e) => e.air > 0 && e.air <= now && !watched[`${work.id}-${s.n}-${e.n}`]))
  const [expanded, setExpanded] = useState(() => new Set([firstUnwatched ? firstUnwatched.n : work.seasons[work.seasons.length - 1].n]))

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
            <div onClick={() => toggleExpanded(s.n)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px', cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{s.name || `Saison ${s.n}`}</span>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{done}/{s.episodes.length} vus</span>
              <div
                onClick={(e) => { e.stopPropagation(); onMarkSeason(work.id, s.n) }}
                style={{ marginLeft: 'auto', fontSize: 12.5, color: 'var(--color-accent)', fontWeight: 600, padding: '5px 10px', borderRadius: 8 }}
              >
                {aired.length > 0 && done === aired.length ? 'Tout décocher' : 'Tout marquer'}
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
                        onClick={(ev) => { ev.stopPropagation(); if (aired2) onToggleEpisode(work.id, s.n, e.n) }}
                        style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, cursor: aired2 ? 'pointer' : 'not-allowed', color: '#fff', background: isWatched ? 'var(--color-accent)' : 'transparent', border: `2px solid ${isWatched ? 'var(--color-accent)' : (aired2 ? 'var(--color-check-border)' : 'var(--color-check-border-dim)')}` }}
                      >
                        {isWatched ? '✓' : ''}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontWeight: 600, fontSize: 14.5, textDecoration: isWatched ? 'line-through' : 'none', color: isWatched ? 'var(--color-muted)' : 'inherit' }}>{epLabel(work, s, e)}</span>
                        {e.air > 0 && <span style={{ marginLeft: 8, fontSize: 12, color: aired2 ? 'var(--color-muted)' : 'var(--color-accent)', fontWeight: 500 }}>{fmtFull(e.air)}</span>}
                      </div>
                      <div onClick={() => aired2 && onOpenEpisode(work, s, e)} style={{ width: 28, height: 28, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: aired2 ? 'pointer' : 'default', color: aired2 ? 'var(--color-muted)' : 'transparent', fontSize: 20, lineHeight: 1 }}>›</div>
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
