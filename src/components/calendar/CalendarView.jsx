import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText, DAY } from '../../lib/domain'

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
          {catchGroups.map(({ w, s, e, remaining }) => (
            <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
              <PosterBox id={w.id} title={w.title} poster={w.poster} width={48} height={68} radius={10} fontSize={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>
                  S{s.n} · {t('term.series.ep')} {e.n}{remaining > 1 ? ` · ${t('calendar.remaining', { count: remaining - 1 })}` : ''}
                </div>
              </div>
              <div onClick={(ev) => { ev.stopPropagation(); onMarkWatched(w.id, s.n, e.n) }} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>{t('calendar.markWatched')}</div>
            </div>
          ))}
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
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--color-accent)' }}>{d.getDate()}</div>
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
          {abandoned.map(({ w, s, e, remaining }) => (
            <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', borderRadius: 14, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: 'pointer' }}>
              <PosterBox id={w.id} title={w.title} poster={w.poster} width={48} height={68} radius={10} fontSize={20} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>
                  S{s.n} · {t('term.series.ep')} {e.n}{remaining > 1 ? ` · ${t('calendar.remainingUnseen', { count: remaining - 1 })}` : ''}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
