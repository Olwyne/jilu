import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
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
  Object.values(works)
    .filter((w) => w.category === cat)
    .forEach((w) => {
      const g = (w.genre || '').split(/[/,]/)[0].trim()
      const id = GENRE_TO_ID[g]
      if (id) count[id] = (count[id] || 0) + 1
    })
  const sorted = Object.entries(count).sort((a, b) => b[1] - a[1]).map(([id]) => Number(id))
  const unique = [...new Set([...sorted, ...FALLBACK_GENRE_IDS])]
  return unique.slice(0, 5)
}

async function fetchRecos(works, cat, minCount = 8) {
  const genreIds = topGenreIds(works, cat)
  const existingIds = new Set(Object.keys(works))
  let results = []
  for (const genreId of genreIds) {
    if (results.length >= minCount) break
    try {
      const res = await tmdbDiscover(genreId, cat)
      for (const r of res) {
        if (!existingIds.has(r.id) && !results.find((x) => x.id === r.id)) {
          results.push(r)
        }
      }
    } catch { /* skip */ }
  }
  return results.slice(0, 12)
}

function RecoSection({ title, works, cat, onOpenWork, onAddWork }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [adding, setAdding] = useState(null)

  useEffect(() => {
    let cancelled = false
    fetchRecos(works, cat).then((res) => {
      if (!cancelled) { setItems(res); setLoading(false) }
    })
    return () => { cancelled = true }
  }, [])

  async function handleClick(r) {
    if (adding) return
    if (works[r.id]) { onOpenWork(r.id); return }
    setAdding(r.id)
    try {
      await onAddWork(r)
      onOpenWork(r.id)
    } catch { /* silently ignore */ }
    setAdding(null)
  }

  if (!loading && items.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 12 }}>{title}</div>
      {loading
        ? <div style={{ fontSize: 13, color: 'var(--color-muted-3)', padding: '8px 0' }}>…</div>
        : (
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8 }}>
            {items.map((r) => {
              const isAdding = adding === r.id
              return (
                <div
                  key={r.id}
                  onClick={() => handleClick(r)}
                  style={{ flexShrink: 0, width: 110, cursor: isAdding ? 'wait' : 'pointer', opacity: isAdding ? 0.6 : 1, transition: 'opacity .15s' }}
                >
                  <PosterBox id={r.id} title={r.title} poster={r.poster} width={110} height={160} radius={12} fontSize={32} />
                  <div style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-muted-3)', marginTop: 2 }}>{r.year}</div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

export default function RecoRow({ works, onAddWork, onOpenWork }) {
  const { t } = useTranslation()

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 18 }}>{t('dashboard.recos')}</div>
      <RecoSection title={t('cat.films')} works={works} cat="films" onOpenWork={onOpenWork} onAddWork={onAddWork} />
      <RecoSection title={t('cat.series')} works={works} cat="series" onOpenWork={onOpenWork} onAddWork={onAddWork} />
    </div>
  )
}
