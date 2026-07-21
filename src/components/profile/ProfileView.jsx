import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { initials, relText } from '../../lib/domain'

const RUNTIME = { animes: 24, series: 45, films: 120 }

function formatWatchTime(totalMins) {
  let m = totalMins
  const y = Math.floor(m / 525600); m %= 525600
  const mo = Math.floor(m / 43200); m %= 43200
  const d = Math.floor(m / 1440); m %= 1440
  const h = Math.floor(m / 60)
  const mn = m % 60
  const parts = []
  if (y) parts.push(`${y}a`)
  if (mo) parts.push(`${mo}m`)
  if (d) parts.push(`${d}j`)
  if (h) parts.push(`${h}h`)
  if (mn || !parts.length) parts.push(`${mn}min`)
  return parts.join(' ')
}

export default function ProfileView({ data, onOpenWork, onToggleLike, onDelete, onShare, readOnly }) {
  const { t, i18n } = useTranslation()
  const { works, watched, ratings, favorites, feed, profile, settings } = data
  const navigate = useNavigate()
  const { handle: handleParam } = useParams()

  function getContext(f, works) {
    const w = works[f.workId]
    if (!w) return t('profile.onWork')
    if (f.sNum && f.eNum) {
      const cat = w.category
      return `${t('term.' + cat + '.season')} ${f.sNum} · ${t('term.' + cat + '.ep')} ${f.eNum}`
    }
    if (f.sNum) return `${t('term.' + (w.category) + '.season')} ${f.sNum}`
    return t('profile.onWork')
  }

  useEffect(() => {
    const h = profile.handle
    if (h && !handleParam) navigate(`/profile/${h}`, { replace: true })
  }, [profile.handle, handleParam, navigate])
  const worksArr = Object.values(works)
  const worksCount = worksArr.length
  const episodesCount = Object.keys(watched).length
  const ratingsCount = Object.keys(ratings).length
  const isPublic = !!settings.publicProfile
  const pseudo = profile.handle || profile.name || '?'

  let totalMinutes = 0
  worksArr.forEach(w => {
    if (w.category === 'films' && w.status === 'termine') totalMinutes += 120
    if (w.seasons) w.seasons.forEach(s => s.episodes.forEach(e => {
      if (watched[`${w.id}-${s.n}-${e.n}`]) totalMinutes += RUNTIME[w.category] || 42
    }))
  })
  const watchTimeStr = formatWatchTime(totalMinutes)

  const favWorks = worksArr.filter(w => favorites && favorites[w.id])
  const recentFeed = [...(feed || [])].sort((a, b) => b.ts - a.ts).slice(0, 20)
  const recentWatched = Object.entries(watched || {})
    .map(([key, ts]) => {
      const parts = key.split('-')
      const eNum = parts[parts.length - 1]
      const sNum = parts[parts.length - 2]
      const workId = parts.slice(0, -2).join('-')
      return { workId, sNum, eNum, ts }
    })
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 10)

  function handleShare() {
    if (!isPublic) return
    const url = `${window.location.origin}/u/${pseudo}`
    try { navigator.clipboard.writeText(url) } catch (e) {}
  }

  return (
    <div style={{ maxWidth: 700, display: 'flex', flexDirection: 'column', gap: 28 }}>

      {/* Hero */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 20, padding: 24, borderRadius: 22, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
        <div style={{ width: 72, height: 72, flexShrink: 0, borderRadius: '50%', background: 'linear-gradient(135deg, var(--color-accent), var(--color-pink))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color: '#fff' }}>
          {initials(pseudo)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26 }}>{pseudo}</div>
          <div style={{ color: 'var(--color-muted-3)', fontSize: 13, marginTop: 2 }}>{t('profile.memberSince', { date: profile.memberSince })}</div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{worksCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>œuvres</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{episodesCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>vus</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{ratingsCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>avis</div></div>
          </div>
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>{watchTimeStr}</span>
            <span style={{ fontSize: 12, color: 'var(--color-muted)' }}>de visionnage</span>
          </div>
        </div>
        {!readOnly && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
            <div onClick={handleShare} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isPublic ? 'pointer' : 'default', background: isPublic ? 'rgba(139,109,255,.2)' : 'var(--color-chip-bg)', color: isPublic ? '#b9a6ff' : 'var(--color-muted-3)', border: `1px solid ${isPublic ? 'rgba(139,109,255,.35)' : 'var(--color-border)'}` }}>
              {isPublic ? t('profile.copyLink') : t('profile.private')}
            </div>
            <div style={{ fontSize: 12, color: isPublic ? '#4ade80' : 'var(--color-muted)' }}>{isPublic ? t('profile.public') : t('profile.privLocked')}</div>
          </div>
        )}
      </div>

      {/* Favoris */}
      {favWorks.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{t('profile.favorites')}</div>
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {favWorks.map(w => (
              <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ flexShrink: 0, width: 90, cursor: 'pointer' }}>
                <PosterBox id={w.id} title={w.title} poster={w.poster} width={90} height={130} radius={12} />
                <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
                <div style={{ fontSize: 11, color: 'var(--color-muted-3)' }}>{w.category} · {w.year}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Activité récente */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{t('profile.recentActivity')}</div>
        {recentWatched.length === 0
          ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>{t('profile.noRecent')}</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentWatched.map(({ workId, sNum, eNum, ts }) => {
                const w = works[workId]
                const cat = w?.category || 'default'
                const label = `${t('term.' + cat + '.season')} ${sNum} · ${t('term.' + cat + '.ep')} ${eNum}`
                return (
                  <div key={`${workId}-${sNum}-${eNum}`} onClick={() => w && onOpenWork(workId)} style={{ display: 'flex', gap: 14, alignItems: 'center', padding: '12px 16px', borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)', cursor: w ? 'pointer' : 'default' }}>
                    <PosterBox id={workId} title={w?.title || workId} poster={w?.poster} width={40} height={58} radius={8} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w?.title || workId}</div>
                      <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{label}</div>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-3)', flexShrink: 0 }}>{relText(ts, Date.now(), i18n.language)}</div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

      {/* Avis & commentaires */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>{t('profile.activity')}</div>
        {recentFeed.length === 0
          ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>{t('profile.noActivity')}</div>
          : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentFeed.map(f => {
                const w = works[f.workId]
                const context = getContext(f, works)
                return (
                  <div key={f.id} style={{ border: '1px solid var(--color-border)', borderRadius: 18, background: 'var(--color-surface)', padding: 18 }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 12 }}>
                      <div onClick={() => w && onOpenWork(w.id)} style={{ flexShrink: 0, cursor: 'pointer' }}>
                        <PosterBox id={f.workId} title={w ? w.title : f.workId} poster={w?.poster} width={46} height={66} radius={10} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 600, fontSize: 14 }}>{pseudo}</span>
                          <span style={{ fontSize: 12.5, color: 'var(--color-muted-3)' }}>· {relText(f.ts, Date.now(), i18n.language)}</span>
                        </div>
                        <div onClick={() => w && onOpenWork(w.id)} style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 5, cursor: 'pointer' }}>
                          <span style={{ color: 'var(--color-accent)', fontWeight: 600 }}>{w ? w.title : f.workId}</span> · {context}
                        </div>
                      </div>
                    </div>
                    <div style={{ fontSize: 15, lineHeight: 1.5 }}>{f.text}</div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 14 }}>
                      <span onClick={() => onToggleLike(f.id)} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, cursor: 'pointer', color: f.liked ? 'var(--color-pink)' : 'var(--color-muted-2)' }}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={f.liked ? 'var(--color-pink)' : 'none'} stroke={f.liked ? 'var(--color-pink)' : 'currentColor'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>
                        {f.likes || ''}
                      </span>
                      <span onClick={() => onDelete(f.id)} style={{ fontSize: 13, color: 'var(--color-muted-3)', cursor: 'pointer' }}>{t('profile.delete')}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        }
      </div>

    </div>
  )
}
