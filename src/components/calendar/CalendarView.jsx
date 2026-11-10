import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { relText, DAY } from '../../lib/domain'
import { posterGradient } from '../../lib/posterBox'
import { pressable } from '../../lib/a11y'
import Button from '../ui/Button'
import Chip from '../ui/Chip'

const TABS = ['rattraper', 'commencer', 'venir', 'abandonne']
const CAT_KEYS = ['all', 'series', 'films', 'animes', 'mangas', 'livres', 'jeux']

function SimpleCard({ item, onOpenWork, onMarkDone, t, language }) {
  const { w } = item
  const { from, to } = posterGradient(w.id)
  const subtitle = w.release
    ? new Date(w.release).toLocaleDateString(language, { day: 'numeric', month: 'short', year: 'numeric' })
    : w.year ? String(w.year) : null
  const markLabel = w.category === 'livres' || w.category === 'mangas'
    ? t('calendar.markRead')
    : w.category === 'jeux'
    ? t('calendar.markPlayed')
    : t('calendar.markWatched')
  return (
    <div onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
      {w.poster
        ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${w.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.9 }} />
        : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}, ${to})`, opacity: 0.25 }} />
      }
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', opacity: 0.68 }} />
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 76, alignSelf: 'stretch', borderRadius: '16px 0 0 16px', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
        {w.poster
          ? <img src={w.poster} alt={w.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <PosterBox id={w.id} title={w.title} poster={null} width="100%" height="100%" radius={0} fontSize={22} style={{ flexShrink: 1 }} />
        }
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div {...pressable((ev) => { ev.stopPropagation(); onOpenWork(w.id) }, { role: 'link' })} style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
          {subtitle && (
            <span style={{ marginTop: 5, fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
              {subtitle}
            </span>
          )}
        </div>
        {onMarkDone && (
          <Button variant="primary" size="sm" style={{ flexShrink: 0 }} onClick={(ev) => { ev.stopPropagation(); onMarkDone(w.id) }}>
            {markLabel}
          </Button>
        )}
      </div>
    </div>
  )
}

function EpisodeCard({ item, showMarkWatched, onOpenWork, onMarkWatched, t }) {
  const { w, s, e, remaining } = item
  const { from, to } = posterGradient(w.id)
  return (
    <div onClick={() => onOpenWork(w.id)} style={{ position: 'relative', borderRadius: 16, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'stretch', minHeight: 88 }}>
      {w.poster
        ? <div style={{ position: 'absolute', inset: 0, backgroundImage: `url(${w.poster})`, backgroundSize: 'cover', backgroundPosition: 'center top', filter: 'blur(6px) brightness(0.35)', transform: 'scale(1.15)', opacity: 0.9 }} />
        : <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(135deg, ${from}, ${to})`, opacity: 0.25 }} />
      }
      <div style={{ position: 'absolute', inset: 0, background: 'var(--color-surface)', opacity: 0.68 }} />
      <div style={{ position: 'relative', zIndex: 1, flexShrink: 0, width: 76, alignSelf: 'stretch', borderRadius: '16px 0 0 16px', overflow: 'hidden', boxShadow: '2px 0 8px rgba(0,0,0,0.2)' }}>
        {w.poster
          ? <img src={w.poster} alt={w.title} loading="lazy" decoding="async" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          : <PosterBox id={w.id} title={w.title} poster={null} width="100%" height="100%" radius={0} fontSize={22} style={{ flexShrink: 1 }} />
        }
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px 12px 12px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div {...pressable((ev) => { ev.stopPropagation(); onOpenWork(w.id) }, { role: 'link' })} style={{ fontWeight: 700, fontSize: 15 }}>{w.title}</div>
          <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '3px 8px', borderRadius: 6, display: 'inline-block' }}>
              S{s.n} · {t('term.series.ep')} {e.n}
            </span>
            {remaining > 1 && (
              <span style={{ fontSize: 12, fontWeight: 600, color: '#fff', background: 'rgba(0,0,0,0.72)', padding: '2px 7px', borderRadius: 5, display: 'inline-block' }}>
                {showMarkWatched ? t('calendar.remaining', { count: remaining - 1 }) : t('calendar.remainingUnseen', { count: remaining - 1 })}
              </span>
            )}
          </div>
        </div>
        {showMarkWatched && (
          <Button variant="primary" size="sm" style={{ flexShrink: 0 }} onClick={(ev) => { ev.stopPropagation(); onMarkWatched(w.id, s.n, e.n) }}>{t('calendar.markWatched')}</Button>
        )}
      </div>
    </div>
  )
}

function UpcomingEpisodeRow({ item, onOpenWork, language, t, now }) {
  const { w, s, e } = item
  const d = new Date(e.air)
  return (
    <div {...pressable(() => onOpenWork(w.id))} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
      <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--color-accent)', lineHeight: 1 }}>{d.getDate()}</div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)', textTransform: 'uppercase', marginTop: 2 }}>{d.toLocaleString(language, { month: 'short' })}</div>
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
        <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>S{s.n} · {t('term.series.ep')} {e.n}</div>
      </div>
      <div style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: e.air < now + 7 * DAY ? 'var(--color-accent)' : 'var(--color-chip-bg)', color: e.air < now + 7 * DAY ? '#fff' : 'var(--color-muted)' }}>{relText(e.air, now, language)}</div>
    </div>
  )
}

function UpcomingReleaseRow({ item, onOpenWork, language, now }) {
  const { w } = item
  const dateLabel = w.release
    ? relText(w.release, now, language)
    : w.year ? String(w.year) : null
  return (
    <div {...pressable(() => onOpenWork(w.id))} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
      </div>
      {dateLabel && (
        <div style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: 'var(--color-chip-bg)', color: 'var(--color-muted)' }}>{dateLabel}</div>
      )}
    </div>
  )
}

export default function CalendarView({ works, watched, onOpenWork, onMarkWatched, onMarkDone }) {
  const { t, i18n } = useTranslation()
  const [tab, setTab] = useState('rattraper')
  const [category, setCategory] = useState('all')
  const now = Date.now()
  const currentYear = new Date().getFullYear()

  const TAB_LABELS = {
    rattraper: t('calendar.catchUp'),
    commencer: t('calendar.toStart'),
    venir: t('calendar.upcoming'),
    abandonne: t('calendar.dropped'),
  }

  const catchGroups = []
  const toStart = []
  const upcoming = []
  const abandoned = []

  Object.values(works).forEach((w) => {
    const cat = w.category
    if (category !== 'all' && cat !== category) return

    if (w.seasons && (cat === 'series' || cat === 'animes' || cat === 'mangas' || !cat)) {
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

      let sFirst = null, sRemaining = 0
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        const key = `${w.id}-${s.n}-${e.n}`
        if (!watched[key] && e.air > 0 && e.air <= now && w.status === 'a_voir') {
          if (!sFirst) sFirst = { s, e }
          sRemaining++
        }
      }))
      if (sFirst) toStart.push({ w, ...sFirst, remaining: sRemaining, type: 'episode' })

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
        if (w.year && w.year >= currentYear) {
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

  toStart.sort((a, b) => {
    if (a.e && b.e) return b.e.air - a.e.air
    return 0
  })

  const counts = { rattraper: catchGroups.length, commencer: toStart.length, venir: upcoming.length, abandonne: abandoned.length }

  return (
    <div>
      {/* Category chips */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {CAT_KEYS.map((key) => (
          <Chip key={key} size="sm" active={category === key} onClick={() => setCategory(key)}>{t(`cat.${key}`)}</Chip>
        ))}
      </div>

      {/* Status tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map((tk) => (
          <Chip key={tk} active={tab === tk} onClick={() => setTab(tk)}>
            {TAB_LABELS[tk]}{counts[tk] > 0 ? ` · ${counts[tk]}` : ''}
          </Chip>
        ))}
      </div>

      {tab === 'rattraper' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catchGroups.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.upToDate')}</div>}
          {catchGroups.map((item) =>
            item.type === 'episode'
              ? <EpisodeCard key={item.w.id} item={item} showMarkWatched={true} onOpenWork={onOpenWork} onMarkWatched={onMarkWatched} t={t} />
              : <SimpleCard key={item.w.id} item={item} onOpenWork={onOpenWork} onMarkDone={onMarkDone} t={t} language={i18n.language} />
          )}
        </div>
      )}

      {tab === 'commencer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {toStart.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingToStart')}</div>}
          {toStart.map((item) =>
            <EpisodeCard key={item.w.id} item={item} showMarkWatched={false} onOpenWork={onOpenWork} onMarkWatched={onMarkWatched} t={t} />
          )}
        </div>
      )}

      {tab === 'venir' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcoming.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingUpcoming')}</div>}
          {upcoming.slice(0, 14).map((item) =>
            item.type === 'episode'
              ? <UpcomingEpisodeRow key={`${item.w.id}-${item.s.n}-${item.e.n}`} item={item} onOpenWork={onOpenWork} language={i18n.language} t={t} now={now} />
              : <UpcomingReleaseRow key={item.w.id} item={item} onOpenWork={onOpenWork} language={i18n.language} now={now} />
          )}
        </div>
      )}

      {tab === 'abandonne' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {abandoned.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>{t('calendar.nothingDropped')}</div>}
          {abandoned.map((item) =>
            item.type === 'episode'
              ? <EpisodeCard key={item.w.id} item={item} showMarkWatched={false} onOpenWork={onOpenWork} onMarkWatched={onMarkWatched} t={t} />
              : <SimpleCard key={item.w.id} item={item} onOpenWork={onOpenWork} language={i18n.language} />
          )}
        </div>
      )}
    </div>
  )
}
