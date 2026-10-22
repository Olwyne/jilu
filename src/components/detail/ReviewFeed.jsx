import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import DOMPurify from 'dompurify'
import { useReviews } from '../../hooks/useReviews'
import { useTranslation } from 'react-i18next'
import { pressable } from '../../lib/a11y'
import Button from '../ui/Button'

// Les liens des avis ouvrent toujours un nouvel onglet, sans transmettre window.opener ni le referrer
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A') {
    node.setAttribute('target', '_blank')
    node.setAttribute('rel', 'noopener noreferrer')
  }
})

function avgRating(reviews) {
  const rated = reviews.filter((r) => r.rating > 0)
  if (!rated.length) return null
  return (rated.reduce((s, r) => s + r.rating, 0) / rated.length).toFixed(1)
}

const toolbarBtnStyle = (active) => ({
  padding: '3px 8px',
  borderRadius: 6,
  border: '1px solid var(--color-border-btn)',
  background: active ? 'var(--color-accent-fill)' : 'transparent',
  color: active ? 'var(--color-on-accent)' : 'var(--color-text)',
  fontFamily: 'inherit',
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  lineHeight: 1.4,
})

function RichToolbar({ editor }) {
  const { t } = useTranslation()
  if (!editor) return null
  const tool = (name, label, run, content) => (
    <button
      type="button"
      aria-label={label}
      aria-pressed={editor.isActive(name)}
      style={toolbarBtnStyle(editor.isActive(name))}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => run(editor.chain().focus()).run()}
    >{content}</button>
  )
  return (
    <div style={{ display: 'flex', gap: 4, padding: '6px 10px', borderBottom: '1px solid var(--color-border-btn)', flexWrap: 'wrap' }}>
      {tool('bold', t('review.boldLabel'), (c) => c.toggleBold(), <b>{t('review.bold')}</b>)}
      {tool('italic', t('review.italicLabel'), (c) => c.toggleItalic(), <i>{t('review.italic')}</i>)}
      {tool('bulletList', t('review.bullets'), (c) => c.toggleBulletList(), t('review.bullets'))}
      {tool('blockquote', t('review.quote'), (c) => c.toggleBlockquote(), t('review.quote'))}
    </div>
  )
}

export default function ReviewFeed({ workId, sNum = null, eNum = null, currentUser, myRating = 0, onFeedPost }) {
  const { t } = useTranslation()
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
        role: 'textbox',
        'aria-multiline': 'true',
        'aria-label': t('review.mine'),
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
        <span style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600 }}>{t('review.avg')}</span>
        {avg ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ color: 'var(--color-gold)', fontSize: 18 }}>★</span>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17 }}>{avg}</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted-3)' }}>/ 5 · {t('review.ratingCount', { count: ratingCount })}</span>
          </div>
        ) : (
          <span style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('review.noRatings')}</span>
        )}
      </div>

      {/* Éditeur */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 8 }}>{t('review.mine')}</div>
        <div style={{ border: '1px solid var(--color-border-btn)', borderRadius: 12, background: 'var(--color-chip-bg)', overflow: 'hidden' }}>
          <RichToolbar editor={editor} />
          <EditorContent editor={editor} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
          <Button variant="primary" size="sm" onClick={submit}>
            {t('review.share')}
          </Button>
        </div>
      </div>

      {/* Feed */}
      <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 10 }}>
        {t('review.community')}
        {reviews.length > 0 && <span style={{ fontWeight: 400, color: 'var(--color-muted-3)', marginLeft: 6 }}>{reviews.length}</span>}
      </div>
      {reviews.length === 0 ? (
        <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('review.empty')}</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {reviews.map((r) => {
            const isOwn = r.userId === currentUser?.uid
            return (
              <div key={r.id} style={{ borderTop: '1px solid var(--color-border)', paddingTop: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13.5, flex: 1 }}>{isOwn ? t('social.me') : (r.handle || t('review.anonymous'))}</span>
                  {r.rating > 0 && <span style={{ fontSize: 13, color: 'var(--color-gold)' }}>{'★'.repeat(r.rating)}</span>}
                  {isOwn && (
                    <span
                      {...pressable(() => deleteReview(r.id), { label: t('journal.delete') })}
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
