import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { localizedTitle } from '../../lib/domain'
import { tmdbFetchEpisode } from '../../catalog/tmdb'
import ReviewFeed from '../detail/ReviewFeed'

function fmtDate(ts) {
  if (!ts || ts === Infinity) return null
  const d = new Date(ts)
  return String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + d.getFullYear()
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

        {/* Avis + feed — avec spoiler gate */}
        <div style={{ position: 'relative' }}>
          <div
            style={{ padding: '16px 26px 26px', filter: spoilerVisible ? 'none' : 'blur(7px)', pointerEvents: spoilerVisible ? 'auto' : 'none', userSelect: spoilerVisible ? 'auto' : 'none', transition: 'filter .3s' }}
          >
            <ReviewFeed
              workId={work.id}
              sNum={sNum}
              eNum={eNum}
              currentUser={currentUser}
              myRating={myRating}
            />
          </div>

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
