import { useState, useMemo } from 'react'
import WorkCard from './WorkCard'
import { epTotals } from '../../lib/domain'
import styles from './LibraryView.module.css'

const CATS = [['all', 'Tout'], ['series', 'Séries'], ['films', 'Films'], ['animes', 'Animés'], ['livres', 'Livres'], ['jeux', 'Jeux'], ['musique', 'Musique']]
const STATUSES = [['all', 'Tous'], ['en_cours', 'En cours'], ['a_voir', 'À voir'], ['termine', 'Terminé'], ['abandonne', 'Abandonné']]
const SORTS = [['recent', 'Récent'], ['note', 'Note'], ['titre', 'A-Z']]

export default function LibraryView({ works, watched, ratings, favorites, onOpenWork }) {
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [sortDir, setSortDir] = useState('desc')

  const lastWatchedByWork = useMemo(() => {
    const cache = {}
    for (const [k, v] of Object.entries(watched)) {
      if (typeof v !== 'number') continue
      const parts = k.split('-')
      parts.pop(); parts.pop()
      const workId = parts.join('-')
      if (!cache[workId] || v > cache[workId]) cache[workId] = v
    }
    return cache
  }, [watched])

  function handleSort(key) {
    if (key === sort) setSortDir(d => d === 'desc' ? 'asc' : 'desc')
    else { setSort(key); setSortDir('desc') }
  }

  const list = Object.values(works)
    .filter((w) => (category === 'all' || w.category === category) && (status === 'all' || w.status === status))
    .sort((a, b) => {
      let cmp
      if (sort === 'titre') cmp = a.title.localeCompare(b.title)
      else if (sort === 'note') cmp = (ratings[`w:${a.id}`] || 0) - (ratings[`w:${b.id}`] || 0)
      else {
        const ta = lastWatchedByWork[a.id] || (a.added || 0)
        const tb = lastWatchedByWork[b.id] || (b.added || 0)
        cmp = ta - tb
      }
      return sortDir === 'desc' ? -cmp : cmp
    })

  return (
    <div>
      <div className={styles.chipsRow}>
        {CATS.map(([key, label]) => {
          const disabled = key === 'musique'
          return (
            <div
              key={key}
              className={`${styles.chip} ${!disabled && category === key ? styles.chipActive : ''} ${disabled ? styles.chipDisabled : ''}`}
              onClick={() => { if (!disabled) setCategory(key) }}
              style={disabled ? { cursor: 'not-allowed', opacity: 0.45, position: 'relative' } : { position: 'relative' }}
            >
              {label} <span className={styles.chipCount}>{key === 'all' ? Object.keys(works).length : Object.values(works).filter((w) => w.category === key).length}</span>
              {disabled && (
                <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: '#fff', fontSize: 9, fontWeight: 700, borderRadius: 10, padding: '1px 5px', lineHeight: 1.4, whiteSpace: 'nowrap' }}>
                  À venir
                </span>
              )}
            </div>
          )
        })}
      </div>
      <div className={styles.filtersRow}>
        <div className={styles.smallChips}>
          {STATUSES.map(([key, label]) => (
            <div key={key} className={`${styles.smallChip} ${status === key ? styles.smallChipActive : ''}`} onClick={() => setStatus(key)}>{label}</div>
          ))}
        </div>
        <div className={styles.sortChips}>
          <span className={styles.sortLabel}>Trier</span>
          {SORTS.map(([key, label]) => (
            <div key={key} className={`${styles.smallChip} ${sort === key ? styles.smallChipActive : ''}`} onClick={() => handleSort(key)}>
              {label}{sort === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </div>
          ))}
        </div>
      </div>
      {list.length === 0 && <div className={styles.empty}>Aucune œuvre ne correspond à ces filtres.</div>}
      <div className={styles.grid}>
        {list.map((w) => {
          const { total, watchedCount } = epTotals(w, watched)
          return (
            <WorkCard
              key={w.id}
              work={w}
              totalCount={total}
              watchedCount={watchedCount}
              rating={ratings[`w:${w.id}`] || 0}
              isFavorite={!!(favorites && favorites[w.id])}
              onClick={() => onOpenWork(w.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
