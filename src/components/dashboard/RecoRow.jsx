import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { tmdbDiscover } from '../../catalog/tmdb'
import PosterBox from '../ui/PosterBox'

const GENRE_TO_ID = {
  Action: 28, Drame: 18, Drama: 18, Comédie: 35, Comedy: 35,
  Horreur: 27, Horror: 27, SF: 878, 'Sci-Fi': 878,
  Animation: 16, Mystère: 9648, Mystery: 9648,
  Thriller: 53, Romance: 10749, Aventure: 12, Adventure: 12,
}
const FALLBACK_GENRE_IDS = [18, 28, 35, 878, 27]

function topGenreIds(works, cat) {
  const count = {}
  Object.values(works).filter((w) => w.category === cat).forEach((w) => {
    const g = (w.genre || '').split(/[/,]/)[0].trim()
    const id = GENRE_TO_ID[g]
    if (id) count[id] = (count[id] || 0) + 1
  })
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([id]) => Number(id))
  return [...new Set([...sorted, ...FALLBACK_GENRE_IDS])].slice(0, 5)
}

async function fetchPool(works, cat) {
  const genreIds = topGenreIds(works, cat)
  const pool = []
  for (const genreId of genreIds) {
    try {
      const res = await tmdbDiscover(genreId, cat)
      for (const r of res) {
        if (!pool.find((x) => x.id === r.id)) pool.push(r)
      }
    } catch { /* skip */ }
    if (pool.length >= 40) break
  }
  return pool
}

function RecoCard({ r, works, onAddWork }) {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [adding, setAdding] = useState(false)
  const [hovered, setHovered] = useState(false)

  async function handleClick() {
    if (adding) return
    if (works[r.id]) { navigate('/work/' + r.id); return }
    setAdding(true)
    try {
      await onAddWork(r)
      navigate('/work/' + r.id)
    } catch { /* silently ignore */ } finally {
      setAdding(false)
    }
  }

  return (
    <div
      onClick={handleClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ flexShrink: 0, width: 110, cursor: adding ? 'wait' : 'pointer', opacity: adding ? 0.6 : 1, transition: 'opacity .15s' }}
    >
      <div style={{ position: 'relative', width: 110, height: 160, borderRadius: 12, overflow: 'hidden' }}>
        <PosterBox id={r.id} title={r.title} poster={r.poster} width={110} height={160} radius={12} fontSize={32} />
        {hovered && !adding && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center', paddingBottom: 10 }}>
            <span style={{ background: 'var(--color-accent)', color: '#fff', fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 20 }}>
              {t('search.add')}
            </span>
          </div>
        )}
        {adding && (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontSize: 18 }}>⏳</span>
          </div>
        )}
      </div>
      <div style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
      <div style={{ fontSize: 11.5, color: 'var(--color-muted-3)', marginTop: 2 }}>{r.year}</div>
    </div>
  )
}

function RecoSection({ title, pool, works, onAddWork }) {
  const visible = pool.filter((r) => !works[r.id]).slice(0, 12)
  if (visible.length === 0) return null
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{title}</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
        {visible.map((r) => <RecoCard key={r.id} r={r} works={works} onAddWork={onAddWork} />)}
      </div>
    </div>
  )
}

export default function RecoRow({ works, onAddWork }) {
  const { t } = useTranslation()
  const [filmPool, setFilmPool] = useState([])
  const [seriePool, setSeriePool] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    Promise.all([fetchPool(works, 'films'), fetchPool(works, 'series')]).then(([films, series]) => {
      if (!cancelled) { setFilmPool(films); setSeriePool(series); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  const filmsVisible = filmPool.filter((r) => !works[r.id])
  const seriesVisible = seriePool.filter((r) => !works[r.id])

  if (loading) return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{t('dashboard.recos')}</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>…</div>
    </div>
  )

  if (filmsVisible.length === 0 && seriesVisible.length === 0) return null

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>{t('dashboard.recos')}</div>
      <RecoSection title={t('cat.films')} pool={filmPool} works={works} onAddWork={onAddWork} />
      <RecoSection title={t('cat.series')} pool={seriePool} works={works} onAddWork={onAddWork} />
    </div>
  )
}
