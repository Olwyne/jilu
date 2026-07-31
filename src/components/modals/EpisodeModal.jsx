import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useReviews } from '../../hooks/useReviews'
import { localizedTitle } from '../../lib/domain'
import { tmdbFetchEpisode } from '../../catalog/tmdb'

function fmtDate(ts) {
  if (!ts || ts === Infinity) return null
  const d = new Date(ts)
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
}

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

export default function EpisodeModal({ work, sNum, eNum, ratings, feed, actions, watched, currentUser, onClose }) {
  const { t, i18n } = useTranslation()
  const season = work.seasons.find((s) => s.n === sNum)
  const ep = season.episodes.find((e) => e.n === eNum)
  const key = `${work.id}-${sNum}-${eNum}`
  const myRating = ratings[`e:${key}`] || 0
  const isWatched = !!(watched && watched[key])
  const epWord = t('term.' + work.category + '.ep')
  const label = `S${sNum} · ${epWord} ${eNum}${ep.title && !/^Épisode /.test(ep.title) ? ' · ' + ep.title : ''}`

  const [overview, setOverview] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const { episodeReviews, addReview, deleteReview } = useReviews(work.id, currentUser)
  const epReviews = episodeReviews.filter((r) => r.sNum === sNum && r.eNum === eNum)

  const ratingsForAvg = [...epReviews, ...(myRating > 0 ? [{ rating: myRating }] : [])]
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

  useEffect(() => {
    if (!work.sourceId || work.source !== 'tmdb' || work.category === 'films') return
    tmdbFetchEpisode(work.sourceId, sNum, eNum, i18n.language?.startsWith('fr') ? 'fr-FR' : 'en-US')
      .then((d) => { if (d.overview) setOverview(d.overview) })
      .catch(() => {})
  }, [work.sourceId, work.source, work.category, sNum, eNum])

  const spoilerVisible = isWatched || revealed

  function handleStarClick(n) {
    actions.setRating('e', key, n)
  }

  async function submitReview() {
    const html = editor?.getHTML() || ''
    const isEmpty = !html || html === '<p></p>'
    if (isEmpty) return
    await addReview({ sNum, eNum, text: html })
    editor?.commands.clearContent()
  }

  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.68)', zIndex: 70, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '5vh 20px 20px', overflowY: 'auto' }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: '100%', maxWidth: 680, background: 'var(--color-modal-bg)', border: '1px solid var(--color-border-btn)', borderRadius: 22, overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 15, padding: '20px 26px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)' }}>{localizedTitle(work, i18n.language)}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, marginTop: 2 }}>{label}</div>
            {ep.air && ep.air !== Infinity && (
              <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 5 }}>{fmtDate(ep.air)}</div>
            )}
          </div>
          <div
            onClick={onClose}
            style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid var(--color-border-btn)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, flexShrink: 0 }}
          >✕</div>
        </div>

        {/* Overview */}
        {overview && (
          <div style={{ padding: '14px 26px', borderBottom: '1px solid var(--color-border)', fontSize: 14, lineHeight: 1.6, color: 'var(--color-muted)' }}>
            {overview}
          </div>
        )}

        {/* Ma note */}
        <div style={{ padding: '16px 26px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid var(--color-border)' }}>
          <span style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600 }}>Ma note</span>
          <div style={{ display: 'flex', gap: 3 }}>
            {[1, 2, 3, 4, 5].map((n) => (
              <span
                key={n}
                onClick={() => handleStarClick(n)}
                style={{ fontSize: 26, cursor: 'pointer', color: n <= myRating ? 'var(--color-gold)' : 'var(--color-check-border)' }}
              >
                {n <= myRating ? '★' : '☆'}
              </span>
            ))}
          </div>
        </div>

        {/* Éditeur — toujours visible, se vide après soumission */}
        <div style={{ padding: '16px 26px', borderBottom: '1px solid var(--color-border)' }}>
          <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 10 }}>Mon avis</div>
          <div style={{ border: '1px solid var(--color-border-btn)', borderRadius: 12, background: 'var(--color-chip-bg)', overflow: 'hidden' }}>
            <RichToolbar editor={editor} />
            <EditorContent editor={editor} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 8 }}>
            <div
              onClick={submitReview}
              style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 14, cursor: 'pointer' }}
            >
              Partager
            </div>
          </div>
        </div>

        {/* Spoiler gate: note moyenne + avis de la communauté */}
        <div style={{ position: 'relative' }}>
          <div
            style={{ padding: '16px 26px 26px', filter: spoilerVisible ? 'none' : 'blur(7px)', pointerEvents: spoilerVisible ? 'auto' : 'none', userSelect: spoilerVisible ? 'auto' : 'none', transition: 'filter .3s' }}
          >
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

            {/* Feed communauté */}
            <div style={{ fontSize: 13, color: 'var(--color-muted-2)', fontWeight: 600, marginBottom: 10 }}>
              Avis de la communauté
              {epReviews.length > 0 && <span style={{ fontWeight: 400, color: 'var(--color-muted-3)', marginLeft: 6 }}>{epReviews.length}</span>}
            </div>
            {epReviews.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>Personne n'a encore partagé d'avis</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {epReviews.map((r) => {
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
                          dangerouslySetInnerHTML={{ __html: r.text }}
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

          {/* Overlay quand pas vu */}
          {!spoilerVisible && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--color-text)', textAlign: 'center' }}>Épisode pas encore vu</div>
              <div
                onClick={() => setRevealed(true)}
                style={{ padding: '9px 20px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontWeight: 600, fontSize: 13.5, cursor: 'pointer' }}
              >
                {t('episode.reveal')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
