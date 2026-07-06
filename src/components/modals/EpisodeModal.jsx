import { term } from '../../lib/domain'
import JournalThread from '../detail/JournalThread'

export default function EpisodeModal({ work, sNum, eNum, ratings, feed, actions, onClose }) {
  const season = work.seasons.find((s) => s.n === sNum)
  const ep = season.episodes.find((e) => e.n === eNum)
  const key = `${work.id}-${sNum}-${eNum}`
  const myRating = ratings[`e:${key}`] || 0
  const label = `S${sNum} · ${term(work.category).ep} ${eNum}${ep.title && !/^Épisode /.test(ep.title) ? ' · ' + ep.title : ''}`

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.68)', zIndex: 70, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '7vh 20px 20px', overflowY: 'auto' }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 540, background: '#15151d', border: '1px solid rgba(255,255,255,.1)', borderRadius: 22 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '20px 22px', borderBottom: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{work.title}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, marginTop: 2 }}>{label}</div>
          </div>
          <div onClick={onClose} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18 }}>✕</div>
        </div>
        <div style={{ padding: '20px 22px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <div style={{ fontSize: 12.5, color: '#b9a6ff', fontWeight: 600 }}>Ma note</div>
          <div style={{ display: 'flex', gap: 4 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span key={n} onClick={() => actions.setRating('e', key, n)} style={{ fontSize: 30, cursor: 'pointer', color: n <= myRating ? 'var(--color-gold)' : '#4a4a58' }}>{n <= myRating ? '★' : '☆'}</span>
            ))}
          </div>
        </div>
        <div style={{ padding: '0 22px 22px' }}>
          <JournalThread
            commentsKey={key}
            feed={feed}
            onPost={(text) => actions.postComment(work.id, sNum, eNum, text)}
            onToggleLike={actions.toggleLike}
            onDelete={actions.deleteComment}
          />
        </div>
      </div>
    </div>
  )
}
