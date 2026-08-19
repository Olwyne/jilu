import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import PosterBox from '../ui/PosterBox'
import StatusSelect from '../ui/StatusSelect'
import { STATUS, epTotals, localizedTitle, localizedPoster } from '../../lib/domain'
import SeasonList from './SeasonList'
import GamePanel from './GamePanel'
import ReviewFeed from './ReviewFeed'

export default function DetailView({ work, watched, ratings, games, feed, actions, onOpenEpisode, favorites, currentUser }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { total, watchedCount } = epTotals(work, watched)
  const rating = ratings[`w:${work.id}`] || 0
  const isFav = !!(favorites && favorites[work.id])
  const now = Date.now()
  const currentYear = new Date().getFullYear()
  const isUnreleased = (work.release && work.release > now) ||
    (work.category === 'livres' && work.year && work.year > currentYear)

  return (
    <div>
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 28 }}>
        <PosterBox id={work.id} title={localizedTitle(work, i18n.language)} poster={localizedPoster(work, i18n.language)} width={150} height={220} radius={18} fontSize={52} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: STATUS[work.status].color, background: `${STATUS[work.status].color}22` }}>{t('status.' + work.status)}</span>
            <span style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>
              {t('cat.' + work.category)} · {work.genre} · {work.year}
              {work.ended === true && <span style={{ marginLeft: 6, color: '#4ade80', fontWeight: 600 }}>{t('detail.ended')}</span>}
              {work.ended === false && <span style={{ marginLeft: 6, color: '#f59e0b', fontWeight: 600 }}>{t('detail.ongoing')}</span>}
            </span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, margin: '0 0 12px' }}>{localizedTitle(work, i18n.language)}</h2>
          <p style={{ color: '#b9b9c8', fontSize: 15, lineHeight: 1.55, maxWidth: 560 }}>{work.overview}</p>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 13, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>{t('detail.myRating')}</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} onClick={() => actions.setRating('w', work.id, n)} style={{ fontSize: 20, cursor: 'pointer', color: n <= rating ? 'var(--color-gold)' : '#4a4a58' }}>{n <= rating ? '★' : '☆'}</span>
                ))}
              </div>
            </div>
            <StatusSelect value={work.status} onChange={(s) => actions.setStatus(work.id, s)} disabled={isUnreleased} />
            {actions.toggleFavorite && (
              <div onClick={() => actions.toggleFavorite(work.id)} style={{ padding: '11px 16px', borderRadius: 13, background: isFav ? 'rgba(255,196,75,.14)' : 'var(--color-chip-bg)', border: `1px solid ${isFav ? 'rgba(255,196,75,.4)' : 'var(--color-border-btn)'}`, color: isFav ? '#ffc24b' : 'var(--color-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{isFav ? t('detail.favorite') : t('detail.notFavorite')}</div>
            )}
            {actions.removeWork && (
              <div onClick={async () => { await actions.removeWork(work.id); navigate('/library') }} style={{ padding: '11px 16px', borderRadius: 13, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)', color: '#ef4444', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{t('detail.removeWork')}</div>
            )}
          </div>
        </div>
      </div>

      {work.category === 'jeux' && (
        <GamePanel workId={work.id} game={games[work.id]} onAddMinutes={actions.addGameMinutes} onToggleTier={actions.toggleGameTier} />
      )}

      <div style={{ marginBottom: 22 }}>
        <ReviewFeed
          workId={work.id}
          currentUser={currentUser}
          myRating={rating}
          onFeedPost={(text) => actions.postComment(work.id, null, null, text)}
        />
      </div>

      {work.seasons && work.seasons.length > 0 && (
        <SeasonList
          work={work}
          watched={watched}
          onToggleEpisode={actions.toggleEpisode}
          onMarkSeason={actions.markSeason}
          onOpenEpisode={onOpenEpisode}
        />
      )}
    </div>
  )
}
