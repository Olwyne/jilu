import PosterBox from '../ui/PosterBox'
import { CAT, STATUS, term } from '../../lib/domain'
import SeasonList from './SeasonList'
import GamePanel from './GamePanel'
import JournalThread from './JournalThread'

function epTotals(work, watched) {
  if (!work.seasons) return { total: 0, watchedCount: 0 }
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  return { total, watchedCount }
}

export default function DetailView({ work, watched, ratings, games, feed, actions, onOpenEpisode, favorites }) {
  const { total, watchedCount } = epTotals(work, watched)
  const rating = ratings[`w:${work.id}`] || 0
  const isFav = !!(favorites && favorites[work.id])

  return (
    <div>
      <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap', marginBottom: 28 }}>
        <PosterBox id={work.id} title={work.title} poster={work.poster} width={150} height={220} radius={18} fontSize={52} />
        <div style={{ flex: 1, minWidth: 260 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <span style={{ padding: '5px 11px', borderRadius: 8, fontSize: 12.5, fontWeight: 600, color: STATUS[work.status].color, background: `${STATUS[work.status].color}22` }}>{STATUS[work.status].label}</span>
            <span style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>{CAT[work.category]} · {work.genre} · {work.year}</span>
          </div>
          <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, margin: '0 0 12px' }}>{work.title}</h2>
          <p style={{ color: '#b9b9c8', fontSize: 15, lineHeight: 1.55, maxWidth: 560 }}>{work.overview}</p>
          {work.seasons && (
            <div style={{ maxWidth: 420, marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 7 }}>
                <span style={{ color: 'var(--color-muted)' }}>Progression</span>
                <span style={{ fontWeight: 600 }}>{watchedCount} / {total} {term(work.category).unit}</span>
              </div>
              <div style={{ height: 8, borderRadius: 8, background: 'rgba(255,255,255,.09)', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${total ? Math.round((watchedCount / total) * 100) : 0}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))' }} />
              </div>
            </div>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderRadius: 13, background: 'rgba(255,255,255,.045)', border: '1px solid rgba(255,255,255,.08)' }}>
              <span style={{ fontSize: 13, color: 'var(--color-muted)' }}>Ma note</span>
              <div style={{ display: 'flex', gap: 3 }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <span key={n} onClick={() => actions.setRating('w', work.id, n)} style={{ fontSize: 20, cursor: 'pointer', color: n <= rating ? 'var(--color-gold)' : '#4a4a58' }}>{n <= rating ? '★' : '☆'}</span>
                ))}
              </div>
            </div>
            <div onClick={() => actions.cycleStatus(work.id)} style={{ padding: '11px 16px', borderRadius: 13, background: 'rgba(139,109,255,.14)', border: '1px solid rgba(139,109,255,.3)', color: '#b9a6ff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Changer le statut ›</div>
            {actions.toggleFavorite && (
              <div onClick={() => actions.toggleFavorite(work.id)} style={{ padding: '11px 16px', borderRadius: 13, background: isFav ? 'rgba(255,196,75,.14)' : 'rgba(255,255,255,.045)', border: `1px solid ${isFav ? 'rgba(255,196,75,.4)' : 'rgba(255,255,255,.08)'}`, color: isFav ? '#ffc24b' : 'var(--color-muted)', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>{isFav ? '★ Favori' : '☆ Favori'}</div>
            )}
          </div>
        </div>
      </div>

      {work.category === 'jeux' && (
        <GamePanel workId={work.id} game={games[work.id]} onAddHours={actions.addGameHours} onToggleTier={actions.toggleGameTier} />
      )}

      <div style={{ marginBottom: 22 }}>
        <JournalThread
          commentsKey={`w:${work.id}`}
          feed={feed}
          onPost={(text) => actions.postComment(work.id, null, null, text)}
          onToggleLike={actions.toggleLike}
          onDelete={actions.deleteComment}
        />
      </div>

      {work.seasons && (
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
