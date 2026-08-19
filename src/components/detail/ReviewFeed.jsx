import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { useReviews } from '../../hooks/useReviews'

function avgRating(reviews) {
  const rated = reviews.filter((r) => r.rating > 0)
  if (!rated.length) return null
  return (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)
}

const toolbarBtnStyle = (active) => ({
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border-btn)',
  background: active ? 'var(--color-accent)' : 'transparent',
  color: active ? '#fff' : 'var(--color-text)',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4,
})

function RichToolbar({ editor }) {
  if (!editor) return null
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--color-border-btn)', flexWrap: 'wrap' }}>
      <div style={toolbarBtnStyle(editor.isActive('bold'))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBold().run() }}><b>G</b></div>
      <div style={toolbarBtnStyle(editor.isActive('italic'))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleItalic().run() }}><i>I</i></div>
      <div style={toolbarBtnStyle(editor.isActive('bulletList'))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBulletList().run() }}>• Liste</div>
      <div style={toolbarBtnStyle(editor.isActive('blockquote'))} onMouseDown={(e) => { e.preventDefault(); editor.chain().focus().toggleBlockquote().run() }}>" Citation</div>
    </div>
  )
}

export default function ReviewFeed({ workId, sNum = null, eNum = null, currentUser, myRating = 0, onFeedPost }) {
  const { episodeReviews, workReviews, addReview, deleteReview } = useReviews(workId, currentUser)

  const reviews = sNum != null
    ? episodeReviews.filter((r) => r.sNum === sNum && r.eNum === eNum)
    : workReviews

  const ratingsForAvg = [...reviews, ...(myRating > 0 ? [{ rating: myRating }] : [])]
  const avg = avgRating(ratingsForAvg)
  const ratingCount = ratingsForAvg.filter((r) => r.rating > 0).length

  const editor = useEditor({
    extensions: [StarterKit],
    content: '',
    editorProps: {
      attributes: {
        style: 'min-height:90px;padding:10px 12px;outline:none;font-size:14px;line-height:1.6;color:var(--color-text)',
      },
    },
  })

  async function submit() {
    const html = editor?.getHTML() || ''
    const isEmpty = !html || html === '<p></p>'
    if (isEmpty) return
    await addReview({ sNum, eNum, text: html })
    if (onFeedPost) {
      const tmp = document.createElement('div')
      tmp.innerHTML = DOMPurify.sanitize(html)
      const plain = (tmp.textContent || tmp.innerText || '').trim()
      if (plain) onFeedPost(plain)
    }
    editor?.commands.clearContent()
  }

  return (
    <div>
      {/* Note moyenne */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <span style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600 }}>Note moyenne</span>
        {avg ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--color-gold)', fontSize: 18 }}>★</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{avg}</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted-3)' }}>/ 5 · {ratingCount} note{ratingCount > 1 ? 's' : ''}</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>Aucune note encore</span>
        )}
      </div>

      {/* Éditeur */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 8 }}>Mon avis</div>
        <div style={{ border: '1px solid var(--color-border-btn)', borderRadius: 12, background: 'var(--color-chip-bg)', overflow: 'hidden' }}>
          <RichToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <div
            onClick={submit}
            style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
          >
            Partager
          </div>
        </div>
      </div>

      {/* Feed */}
      <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 10 }}>
        Avis de la communauté
        {reviews.length > 0 && <span style={{ fontWeight: 400, color: 'var(--color-muted-3)', marginLeft: 6 }}>{reviews.length}</span>}
      </div>
      {reviews.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>Personne n'a encore partagé d'avis</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => {
            const isOwn = r.userId === currentUser?.uid
            return (
              <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{isOwn ? 'Moi' : (r.handle || 'Anonyme')}</span>
                  {r.rating > 0 && <span style={{ fontSize: 13, color: 'var(--color-gold)' }}>{'★'.repeat(r.rating)}</span>}
                  {isOwn && (
                    <span
                      onClick={() => deleteReview(r.id)}
                      title="Supprimer"
                      style={{ fontSize: 15, cursor: 'pointer', color: 'var(--color-muted-3)', lineHeight: 1, flexShrink: 0 }}
                    >🗑</span>
                  )}
                </div>
                {r.text && (
                  <div
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(r.text) }}
                    style={{ fontSize: 14, lineHeight: 1.6 }}
                    className="review-prose"
                  />
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
