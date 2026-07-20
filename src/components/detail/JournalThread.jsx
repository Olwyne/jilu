import { useState } from 'react'
import { relText } from '../../lib/domain'

export default function JournalThread({ commentsKey, feed, onPost, onToggleLike, onDelete }) {
  const [draft, setDraft] = useState('')
  const comments = feed.filter((f) => f.key === commentsKey).sort((a, b) => b.ts - a.ts)

  function submit() {
    if (!draft.trim()) return
    onPost(draft)
    setDraft('')
  }

  return (
    <div style={{ border: '1px solid var(--color-border-btn)', borderRadius: 16, background: 'var(--color-surface)', padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16 }}>Mon journal</span>
        <span style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{comments.length}</span>
      </div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Partage ta réaction…"
          style={{ flex: 1, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)', borderRadius: 10, padding: '11px 14px', color: 'var(--color-text)', fontSize: 14 }}
        />
        <div onClick={submit} style={{ padding: '11px 18px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}>Publier</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {comments.map((c) => (
          <div key={c.id} style={{ display: 'flex', gap: 11 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontWeight: 600, fontSize: 13.5 }}>Toi</span>
                <span style={{ fontSize: 12, color: 'var(--color-muted-3)' }}>· {relText(c.ts, Date.now())}</span>
              </div>
              <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 3 }}>{c.text}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginTop: 6 }}>
                <span onClick={() => onToggleLike(c.id)} style={{ fontSize: 12.5, cursor: 'pointer', color: c.liked ? 'var(--color-pink)' : 'var(--color-muted-2)' }}>♥ {c.likes || ''}</span>
                <span onClick={() => onDelete(c.id)} style={{ fontSize: 12, color: 'var(--color-muted-3)', cursor: 'pointer' }}>Supprimer</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
