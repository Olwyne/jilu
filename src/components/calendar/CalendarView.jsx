import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText, DAY } from '../../lib/domain'
import { posterGradient } from '../../lib/posterBox'

const TABS = ['rattraper', 'venir', 'abandonne']

export default function CalendarView({ works, watched, onOpenWork, onMarkWatched }) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('rattraper')
  const now = Date.now()
  const catchGroups = []
  const upcoming = []
  const abandoned = []

  const TAB_LABELS = {
    rattraper: t('calendar.catchUp'),
    venir: t('calendar.upcoming'),
    abandonne: t('calendar.dropped'),
  }

  Object.values(works).forEach((w) => {
    if (w.seasons) {
      let first = null, remaining = 0
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        const key = `${w.id}-${s.n}-${e.n}`
        if (!watched[key] && e.air > 0 && e.air <= now && w.status === 'en_cours') {
          if (!first) first = { s, e }
          remaining++
        }
      }))
      if (first) catchGroups.push({ w, ...first, remaining })

      let nextUp = null
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        if (e.air > now && (w.status === 'en_cours' || w.status === 'a_voir') && !nextUp) nextUp = { s, e }
      }))
      if (nextUp) upcoming.push({ w, ...nextUp })

      if (w.status === 'abandonne') {
        let aFirst = null, aRemaining = 0
        w.seasons.forEach((s) => s.episodes.forEach((e) => {
          const key = `${w.id}-${s.n}-${e.n}`
          if (!watched[key] && e.air > 0 && e.air <= now) {
            if (!aFirst) aFirst = { s, e }
            aRemaining++
          }
        }))
        if (aFirst) abandoned.push({ w, ...aFirst, remaining: aRemaining })
      }
    }
  })
  catchGroups.sort((a, b) => b.e.air - a.e.air)
  upcoming.sort((a, b) => a.e.air - b.e.air)
  abandoned.sort((a, b) => b.e.air - a.e.air)

  const counts = { rattraper: catchGroups.length, venir: upcoming.length, abandonne: abandoned.length }

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 24 }}>
        {TABS.map((t) => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '7px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: 13, background: tab === t ? 'var(--color-accent)' : 'var(--color-chip-bg)', color: tab === t ? '#fff' : 'var(--color-muted)' }}>
            {TAB_LABELS[t]}{counts[t] > 0 ? ` · ${counts[t]}` : ''}
          </button>
        ))}
      </div>

      {tab === 'rattraper' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catchGroups.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.upToDate')}</div>}
          {catchGroups.map(({ w, s, e, remaining }) => {
            const { from, to } = posterGradient(w.id)
            return (
              <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
                {/* Fond flouté très fade */}
                {w.poster
                  ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${w.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.9 }} />
                  : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}, ${to})`, opacity: 0.25 }} />
                }
                <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', opacity: 0.68 }} />
                {/* Affiche à gauche à proportion réelle */}
                <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 76, alignSelf: 'stretch', borderRadius: '14px 0 0 14px', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
                  {w.poster
                    ? <img src={w.poster} alt={w.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    : <PosterBox id={w.id} title={w.title} poster={null} width="100%" height="100%" radius={0} fontSize={22} style={{ flexShrink: 1 }} />
                  }
                </div>
                {/* Contenu */}
                <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 6 }}>
                        S{s.n} · {t('term.series.ep')} {e.n}{remaining > 1 ? ` · ${t('calendar.remaining', { count: remaining - 1 })}` : ''}
                      </span>
                    </div>
                  </div>
                  <div onClick={(ev) => { ev.stopPropagation(); onMarkWatched(w.id, s.n, e.n) }} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{t('calendar.markWatched')}</div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tab === 'venir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcoming.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingUpcoming')}</div>}
          {upcoming.slice(0, 14).map(({ w, s, e }) => {
            const d = new Date(e.air)
            return (
              <div key={`${w.id}-${s.n}-${e.n}`} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
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
          })}
        </div>
      )}

      {tab === 'abandonne' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {abandoned.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingDropped')}</div>}
          {abandoned.map(({ w, s, e, remaining }) => {
            const { from, to } = posterGradient(w.id)
            return (
              <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 14, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
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
                    <div style={{ marginTop: 5 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.92)', background: 'rgba(0,0,0,0.5)', padding: '3px 8px', borderRadius: 6 }}>
                        S{s.n} · {t('term.series.ep')} {e.n}{remaining > 1 ? ` · ${t('calendar.remainingUnseen', { count: remaining - 1 })}` : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
