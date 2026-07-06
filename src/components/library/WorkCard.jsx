import { posterGradient } from '../../lib/posterBox'
import { initials, CAT, term } from '../../lib/domain'

export default function WorkCard({ work, watchedCount, totalCount, rating, isFavorite, onClick }) {
  const { from, to } = posterGradient(work.id)
  const pct = totalCount ? Math.round((watchedCount / totalCount) * 100) : 0
  const showProgress = work.seasons && watchedCount > 0 && watchedCount < totalCount
  return (
    <div onClick={onClick} style={{ cursor: 'pointer' }}>
      <div style={{ position: 'relative', width: '100%', aspectRatio: '2/3', borderRadius: 14, background: `linear-gradient(150deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 38, color: 'rgba(255,255,255,.9)' }}>{initials(work.title)}</span>
        {isFavorite && (
          <div style={{ position: 'absolute', top: 7, right: 7, fontSize: 14, color: '#ffc24b', textShadow: '0 1px 4px rgba(0,0,0,.6)' }}>★</div>
        )}
        {showProgress && (
          <div style={{ position: 'absolute', left: 9, right: 9, bottom: 9 }}>
            <div style={{ height: 4, borderRadius: 4, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${pct}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))', borderRadius: 4 }} />
            </div>
          </div>
        )}
      </div>
      <div style={{ marginTop: 9, fontWeight: 600, fontSize: 14.5 }}>{work.title}</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 3 }}>
        <span style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{CAT[work.category]} · {work.year}</span>
        {rating > 0 && <span style={{ fontSize: 12.5, color: 'var(--color-gold)', fontWeight: 600, marginLeft: 'auto' }}>★ {rating}</span>}
      </div>
    </div>
  )
}
