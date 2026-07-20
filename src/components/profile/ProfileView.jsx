import { useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import PosterBox from '../ui/PosterBox'
import { initials, relText, term } from '../../lib/domain'

const STATUS_LABEL = { en_cours: 'En cours', termine: 'Terminé', a_voir: 'À voir', abandonne: 'Abandonné' }

function getContext(f, works) {
  const w = works[f.workId]
  if (!w) return "Sur l'œuvre"
  if (f.sNum && f.eNum) { const t = term(w.category); return `${t.season} ${f.sNum} · ${t.ep} ${f.eNum}` }
  if (f.sNum) return `Saison ${f.sNum}`
  return "Sur l'œuvre"
}

export default function ProfileView({ data, onOpenWork, onToggleLike, onDelete, onShare }) {
  const { works, watched, ratings, favorites, feed, profile, settings } = data
  const navigate = useNavigate()
  const { handle: handleParam } = useParams()

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

  const favWorks = worksArr.filter(w => favorites && favorites[w.id])
  const libWorks = [...worksArr].sort((a, b) => (b.added || 0) - (a.added || 0)).slice(0, 9)
  const recentFeed = [...(feed || [])].sort((a, b) => b.ts - a.ts).slice(0, 20)

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
          <div style={{ color: 'var(--color-muted-3)', fontSize: 13, marginTop: 2 }}>Membre depuis {profile.memberSince}</div>
          <div style={{ display: 'flex', gap: 20, marginTop: 12, flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{worksCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>œuvres</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{episodesCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>vus</div></div>
            <div style={{ textAlign: 'center' }}><div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>{ratingsCount}</div><div style={{ fontSize: 12, color: 'var(--color-muted)' }}>avis</div></div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
          <div onClick={handleShare} style={{ padding: '8px 14px', borderRadius: 10, fontSize: 13, fontWeight: 600, cursor: isPublic ? 'pointer' : 'default', background: isPublic ? 'rgba(139,109,255,.2)' : 'var(--color-chip-bg)', color: isPublic ? '#b9a6ff' : 'var(--color-muted-3)', border: `1px solid ${isPublic ? 'rgba(139,109,255,.35)' : 'var(--color-border)'}` }}>
            {isPublic ? 'Copier le lien' : 'Profil privé'}
          </div>
          <div style={{ fontSize: 12, color: isPublic ? '#4ade80' : 'var(--color-muted)' }}>{isPublic ? '🌐 Public' : '🔒 Privé'}</div>
        </div>
      </div>

      {/* Favoris */}
      {favWorks.length > 0 && (
        <div>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>★ Favoris</div>
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

      {/* Avis & commentaires */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Avis & commentaires</div>
        {recentFeed.length === 0
          ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>Aucune réaction pour l'instant. Commente un épisode pour démarrer.</div>
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
                        <svg width="16" height="16" viewBox="0 0 24 24" fill={f.liked ? 'var(--color-pink)' : 'none'} stroke={f.liked ? 'var(--color-pink)' : 'currentColor'} strokeWidth="2"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8z" /></svg>
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
      </div>

      {/* Bibliothèque */}
      <div>
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 14 }}>Bibliothèque</div>
        {libWorks.length === 0
          ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>Bibliothèque vide — ajoute des œuvres pour les voir ici.</div>
          : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 14 }}>
                {libWorks.map(w => (
                  <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ cursor: 'pointer' }}>
                    <PosterBox id={w.id} title={w.title} poster={w.poster} width="100%" height={140} radius={12} />
                    <div style={{ fontSize: 12, fontWeight: 600, marginTop: 7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--color-muted-3)' }}>{STATUS_LABEL[w.status] || w.status}</div>
                  </div>
                ))}
              </div>
              {worksArr.length > 9 && (
                <div onClick={() => onOpenWork && onOpenWork('__library')} style={{ marginTop: 16, textAlign: 'center', fontSize: 13.5, color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 600 }}>
                  Voir toute la bibliothèque →
                </div>
              )}
            </>
          )
        }
      </div>

    </div>
  )
}
