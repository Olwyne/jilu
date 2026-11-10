import { useState, useMemo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import WorkCard from './WorkCard'
import { epTotals } from '../../lib/domain'
import styles from './LibraryView.module.css'
import Chip from '../ui/Chip'
import Select from '../ui/Select'

export default function LibraryView({ works, watched, ratings, favorites, onOpenWork }) {
  const { t } = useTranslation()
  const [category, setCategory] = useState('all')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('recent')
  const [sortDir, setSortDir] = useState('desc')
  const PAGE = 48
  const [visibleCount, setVisibleCount] = useState(PAGE)
  const sentinelRef = useRef(null)
  const observerRef = useRef(null)

  useEffect(() => { setVisibleCount(PAGE) }, [category, status, sort, sortDir])

  const CATS = [
    ['all', t('cat.all')],
    ['series', t('cat.series')],
    ['films', t('cat.films')],
    ['animes', t('cat.animes')],
    ['mangas', t('cat.mangas')],
    ['livres', t('cat.livres')],
    ['jeux', t('cat.jeux')],
    ['musique', t('cat.musique')],
  ]
  const aVoirLabel = category === 'livres'
    ? t('status.a_voir_livres')
    : category === 'jeux'
    ? t('status.a_voir_jeux')
    : t('status.a_voir')

  const STATUSES = [
    ['all', t('cat.all')],
    ['en_cours', t('status.en_cours')],
    ['a_voir', aVoirLabel],
    ['termine', t('status.termine')],
    ['abandonne', t('status.abandonne')],
  ]
  const SORTS = [
    ['recent', t('library.sort.recent')],
    ['note', t('library.sort.note')],
    ['titre', t('library.sort.titre')],
  ]

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

  const setSentinel = (el) => {
    if (observerRef.current) { observerRef.current.disconnect(); observerRef.current = null }
    sentinelRef.current = el
    if (!el) return
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount((n) => n + PAGE)
    }, { rootMargin: '200px' })
    observer.observe(el)
    observerRef.current = observer
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
            <Chip key={key} active={!disabled && category === key} disabled={disabled} title={disabled ? t('settings.comingSoon') : undefined} count={key === 'all' ? Object.keys(works).length : Object.values(works).filter((w) => w.category === key).length} onClick={() => { if (!disabled) setCategory(key) }}>
              {label}
            </Chip>
          )
        })}
      </div>
      <div className={styles.mobileFilters}>
        <Select label={t('status.label')} value={status} onChange={setStatus} options={STATUSES.map(([value, label]) => ({ value, label }))} />
        <Select label={t('library.sort')} value={sort} onChange={handleSort} options={SORTS.map(([value, label]) => ({ value, label: label + (sort === value ? (sortDir === 'desc' ? ' ↓' : ' ↑') : '') }))} />
      </div>
      <div className={styles.filtersRow}>
        <div className={styles.smallChips}>
          {STATUSES.map(([key, label]) => (
            <Chip key={key} size="xs" active={status === key} onClick={() => setStatus(key)}>{label}</Chip>
          ))}
        </div>
        <div className={styles.sortChips}>
          <span className={styles.sortLabel}>{t('library.sort')}</span>
          {SORTS.map(([key, label]) => (
            <Chip key={key} size="xs" active={sort === key} onClick={() => handleSort(key)}>
              {label}{sort === key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
            </Chip>
          ))}
        </div>
      </div>
      {list.length === 0 && <div className={styles.empty}>{t('library.noResults')}</div>}
      <div className={styles.grid}>
        {list.slice(0, visibleCount).map((w) => {
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
      {visibleCount < list.length && <div ref={setSentinel} style={{ height: 1 }} />}
    </div>
  )
}
