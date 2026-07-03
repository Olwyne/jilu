import { useState } from 'react'
import WorkCard from './WorkCard'
import { CAT } from '../../lib/domain'
import styles from './LibraryView.module.css'

const CATS = [['all', 'Tout'], ['series', 'Séries'], ['films', 'Films'], ['animes', 'Animés'], ['livres', 'Livres'], ['jeux', 'Jeux'], ['musique', 'Musique']]
const STATUSES = [['all', 'Tous'], ['en_cours', 'En cours'], ['a_voir', 'À voir'], ['termine', 'Terminé'], ['abandonne', 'Abandonné']]
const SORTS = [['recent', 'Récent'], ['note', 'Note'], ['titre', 'A-Z']]

function epTotals(work, watched) {
  if (!work.seasons) return { total: 0, watchedCount: 0 }
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  return { total, watchedCount }
}

export default function LibraryView({ works, watched, ratings, onOpenWork }) {
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')

  const list = Object.values(works)
    .filter((w) => (category === 'all' || w.category === category) && (status === 'all' || w.status === status))
    .sort((a, b) => {
      if (sort === 'titre') return a.title.localeCompare(b.title)
      if (sort === 'note') return (ratings[`w:${b.id}`] || 0) - (ratings[`w:${a.id}`] || 0)
      return (b.added || 0) - (a.added || 0)
    })

  return (
    <div>
      <div className={styles.chipsRow}>
        {CATS.map(([key, label]) => (
          <div key={key} className={`${styles.chip} ${category === key ? styles.chipActive : ''}`} onClick={() => setCategory(key)}>
            {label} <span className={styles.chipCount}>{key === 'all' ? Object.keys(works).length : Object.values(works).filter((w) => w.category === key).length}</span>
          </div>
        ))}
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
            <div key={key} className={`${styles.smallChip} ${sort === key ? styles.smallChipActive : ''}`} onClick={() => setSort(key)}>{label}</div>
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
              onClick={() => onOpenWork(w.id)}
            />
          )
        })}
      </div>
    </div>
  )
}
