import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { tmdbDiscover } from '../../catalog/tmdb'
import PosterBox from '../ui/PosterBox'

const GENRE_TO_ID = {
  Action: 28, Drame: 18, Drama: 18, Comédie: 35, Comedy: 35,
  Horreur: 27, Horror: 27, SF: 878, 'Sci-Fi': 878,
  Animation: 16, Mystère: 9648, Mystery: 9648,
}

function topGenresFromWorks(works) {
  const count = {}
  Object.values(works).forEach((w) => {
    if (!w.genre) return
    const g = w.genre.split(/[/,]/)[0].trim()
    count[g] = (count[g] || 0) + 1
  })
  return Object.entries(count).sort((a, b) => b[1] - a[1]).map(([g]) => g)
}

function topCatFromWorks(works) {
  const count = { films: 0, series: 0 }
  Object.values(works).forEach((w) => {
    if (w.category === 'films') count.films++
    else if (w.category === 'series') count.series++
  })
  return count.films >= count.series ? 'films' : 'series'
}

export default function RecoRow({ works, onAdd }) {
  const { t } = useTranslation()
  const [recos, setRecos] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const genres = topGenresFromWorks(works)
      const cat = topCatFromWorks(works)
      let results = []
      for (const genre of genres.slice(0, 3)) {
        const genreId = GENRE_TO_ID[genre]
        if (!genreId) continue
        try {
          const res = await tmdbDiscover(genreId, cat)
          results = [...results, ...res]
          if (results.length >= 10) break
        } catch { /* skip */ }
      }
      if (!cancelled) {
        const existingIds = new Set(Object.keys(works))
        const unique = results.filter((r) => !existingIds.has(r.id)).slice(0, 8)
        setRecos(unique)
        setLoading(false)
      }
    }
    if (Object.keys(works).length > 0) load()
    else setLoading(false)
    return () => { cancelled = true }
  }, [])

  if (loading) return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{t('dashboard.recos')}</div>
      <div style={{ fontSize: 13, color: 'var(--color-muted-3)' }}>{t('dashboard.recoLoading')}</div>
    </div>
  )

  if (recos.length === 0) return null

  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>{t('dashboard.recos')}</div>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 6 }}>
        {recos.map((r) => (
          <div key={r.id} style={{ flexShrink: 0, width: 110, cursor: 'pointer' }} onClick={() => onAdd(r)}>
            <PosterBox id={r.id} title={r.title} poster={r.poster} width={110} height={160} radius={12} fontSize={32} />
            <div style={{ marginTop: 7, fontSize: 12.5, fontWeight: 600, lineHeight: 1.3, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{r.title}</div>
            <div style={{ fontSize: 11.5, color: 'var(--color-muted-3)', marginTop: 2 }}>{r.year}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
