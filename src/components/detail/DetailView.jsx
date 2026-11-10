import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PosterBox from '../ui/PosterBox'
import StatusSelect from '../ui/StatusSelect'
import { STATUS, tint, epTotals, localizedTitle, localizedPoster } from '../../lib/domain'
import SeasonList from './SeasonList'
import GamePanel from './GamePanel'
import ReviewFeed from './ReviewFeed'
import { pressable } from '../../lib/a11y'
import StarRating from '../ui/StarRating'
import Button from '../ui/Button'
import { nextAiredUnwatched } from '../../lib/nextUp'

export default function DetailView({ work, watched, ratings, games, actions, onOpenEpisode, favorites, currentUser }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleRefresh() {
    setMenuOpen(false)
    setRefreshing(true)
    try {
      await Promise.race([
        actions.refreshWork(work.id),
        new Promise((_, r) => setTimeout(() => r(new Error('timeout')), 30000))
      ])
    } catch {} finally { setRefreshing(false) }
  }

  async function handleRemove() {
    setMenuOpen(false)
    await actions.removeWork(work.id)
    navigate('/library')
  }
  const { total, watchedCount } = epTotals(work, watched)
  const rating = ratings[`w:${work.id}`] || 0
  const isFav = !!(favorites && favorites[work.id])
  const now = Date.now()
  const hasEpisodes = work.seasons?.some((s) => s.episodes.some((e) => e.air <= now))
  const allWatched = hasEpisodes && work.seasons.every((s) =>
    s.episodes.filter((e) => e.air <= now).every((e) => watched[`${work.id}-${s.n}-${e.n}`])
  )
  const next = work.seasons ? nextAiredUnwatched(work, watched, now) : null
  const currentYear = new Date().getFullYear()
  const isUnreleased = (work.release && work.release > now) ||
    (work.category === 'livres' && work.year && work.year > currentYear)

  return (
    <div>
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 28 }}>
        <PosterBox id={work.id} title={localizedTitle(work, i18n.language)} poster={localizedPoster(work, i18n.language)} width={150} height={220} radius={18} fontSize={52} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: STATUS[work.status].color, background: tint(STATUS[work.status].color, 13) }}>{t('status.' + work.status)}</span>
            <span style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>
              {t('cat.' + work.category)} · {work.genre} · {work.year}
              {work.ended === true && <span style={{ marginLeft: 6, color: 'var(--color-green)', fontWeight: 600 }}>{t('detail.ended')}</span>}
              {work.ended === false && <span style={{ marginLeft: 6, color: 'var(--color-gold)', fontWeight: 600 }}>{t('detail.ongoing')}</span>}
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, margin: '0 0 12px' }}>{localizedTitle(work, i18n.language)}</h1>
          <p style={{ color: 'var(--color-muted)', fontSize: 15, lineHeight: 1.55, maxWidth: 560 }}>{work.overview}</p>
          {work.seasons && (
            <div style={{ maxWidth: 420, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                <span style={{ color: 'var(--color-muted)' }}>{t('detail.progress')}</span>
                <span style={{ fontWeight: 600 }}>{watchedCount} / {total} {t('term.' + work.category + '.unit')}</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: 'var(--color-progress-track)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total ? Math.round((watchedCount / total) * 100) : 0}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))' }} />
              </div>
            </div>
          )}
          {next && actions.toggleEpisode && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginBottom: 20 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-muted)' }}>{t('detail.nextEpisode')}</div>
                <div style={{ fontWeight: 700, fontSize: 16 }}>S{next.s.n} · {t('term.' + work.category + '.ep')} {next.e.n}</div>
              </div>
              <Button variant="primary" onClick={() => actions.toggleEpisode(work.id, next.s.n, next.e.n)}>{t('calendar.markWatched')}</Button>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 13, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('detail.myRating')}</span>
              <StarRating value={rating} onChange={(n) => actions.setRating('w', work.id, n)} label={t('detail.myRating')} />
            </div>
            <StatusSelect value={work.status} onChange={(s) => actions.setStatus(work.id, s)} disabled={isUnreleased} />
            {actions.toggleFavorite && (
              <div {...pressable(() => actions.toggleFavorite(work.id))} style={{ padding: '11px 16px', borderRadius: 13, background: isFav ? tint('var(--color-gold)', 14) : 'var(--color-chip-bg)', border: `1px solid ${isFav ? tint('var(--color-gold)', 40) : 'var(--color-border-btn)'}`, color: isFav ? 'var(--color-gold)' : 'var(--color-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{isFav ? t('detail.favorite') : t('detail.notFavorite')}</div>
            )}
            {(actions.removeWork || actions.refreshWork || (actions.markWorkWatched && hasEpisodes)) && (
              <div ref={menuRef} style={{ position: 'relative' }}>
                <div {...pressable(() => setMenuOpen((o) => !o))} style={{ padding: '11px 14px', borderRadius: 13, background: menuOpen ? 'var(--color-border-btn)' : 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)', color: 'var(--color-muted)', fontWeight: 700, fontSize: 17, cursor: 'pointer', lineHeight: 1, letterSpacing: 1 }}>⋯</div>
                {menuOpen && (
                  <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, minWidth: 210, background: 'var(--color-surface)', border: '1px solid var(--color-border-btn)', borderRadius: 13, boxShadow: '0 8px 32px rgba(0,0,0,.28)', zIndex: 100, overflow: 'hidden' }}>
                    {actions.markWorkWatched && hasEpisodes && (
                      <div {...pressable(() => { setMenuOpen(false); if (allWatched && !window.confirm(t('detail.confirmUncheckAll'))) return; actions.markWorkWatched(work.id) })} style={{ padding: '13px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-text)', borderBottom: '1px solid var(--color-border)' }}>
                        {allWatched ? t('detail.uncheckAll') : t('detail.checkAll')}
                      </div>
                    )}
                    {actions.refreshWork && (
                      <div {...pressable(handleRefresh)} style={{ padding: '13px 18px', fontSize: 14, fontWeight: 600, cursor: refreshing ? 'wait' : 'pointer', opacity: refreshing ? 0.6 : 1, color: 'var(--color-text)', borderBottom: actions.removeWork ? '1px solid var(--color-border)' : 'none' }}>
                        {refreshing ? t('detail.refreshing') : t('detail.refreshMeta')}
                      </div>
                    )}
                    {actions.removeWork && (
                      <div {...pressable(handleRemove)} style={{ padding: '13px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer', color: 'var(--color-danger-text)' }}>{t('detail.removeWork')}</div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {work.category === 'jeux' && (
        <GamePanel workId={work.id} game={games[work.id]} onAddMinutes={actions.addGameMinutes} onToggleTier={actions.toggleGameTier} />
      )}

      {work.seasons && work.seasons.length > 0 && (
        <SeasonList
          work={work}
          watched={watched}
          onToggleEpisode={actions.toggleEpisode}
          onMarkSeason={actions.markSeason}
          onOpenEpisode={onOpenEpisode}
        />
      )}

      <div style={{ marginTop: 28 }}>
        <ReviewFeed
          workId={work.id}
          currentUser={currentUser}
          myRating={rating}
          onFeedPost={(text) => actions.postComment(work.id, null, null, text)}
        />
      </div>

    </div>
  )
}
