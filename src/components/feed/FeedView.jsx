import { posterGradient } from '../../lib/posterBox'
import { initials, relText, term } from '../../lib/domain'

function getContext(f, works) {
  const w = works[f.workId]
  if (!w) return "Sur l'œuvre"
  if (f.sNum && f.eNum) {
    const t = term(w.category)
    return `${t.season} ${f.sNum} · ${t.ep} ${f.eNum}`
  }
  if (f.sNum) return `Saison ${f.sNum}`
  return "Sur l'œuvre"
}

export default function FeedView({ feed, works, onOpenWork, onToggleLike, onDelete }) {
  const sorted = [...feed].sort((a, b) => b.ts - a.ts)

  if (sorted.length === 0) {
    return (
      <div style={{ padding: '60px 20px', textAlign: 'center', color: 'var(--color-muted-3)' }}>
        Aucune réaction pour l'instant. Commente un épisode pour démarrer ton journal.
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 680, display: 'flex', flexDirection: 'column', gap: 14 }}>
      {sorted.map((f) => {
        const w = works[f.workId]
        const { from, to } = posterGradient(f.workId)
        const context = getContext(f, works)
        return (
          <div key={f.id} style={{ border: '1px solid rgba(255,255,255,.07)', borderRadius: 18, background: 'rgba(255,255,255,.025)', padding: 18 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
              <div onClick={() => w && onOpenWork(w.id)} style={{ width: 46, height: 66, borderRadius: 10, background: `linear-gradient(150deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'rgba(255,255,255,.9)' }}>{initials(w ? w.title : f.workId)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontWeight: 600, fontSize: 14 }}>Toi</span>
                  <span style={{ fontSize: 12.5, color: 'var(--color-muted-3)' }}>· {relText(f.ts, Date.now())}</span>
                </div>
                <div onClick={() => w && onOpenWork(w.id)} style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 5, cursor: 'pointer' }}>
                  <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{w ? w.title : f.workId}</span> · {context}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 15, lineHeight: 1.5 }}>{f.text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
              <span onClick={() => onToggleLike(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: f.liked ? 'var(--color-pink)' : 'var(--color-muted-2)' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill={f.liked ? 'var(--color-pink)' : 'none'} stroke={f.liked ? 'var(--color-pink)' : 'currentColor'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z"/></svg>
                {f.likes || ''}
              </span>
              <span onClick={() => onDelete(f.id)} style={{ fontSize: 13, color: 'var(--color-muted-3)', cursor: 'pointer' }}>Supprimer</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
