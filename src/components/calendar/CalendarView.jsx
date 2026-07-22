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
