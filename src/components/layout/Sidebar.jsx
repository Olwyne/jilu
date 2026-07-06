import styles from './Sidebar.module.css'

const ITEMS = [
  { key: 'dashboard', label: 'Accueil' },
  { key: 'library', label: 'Bibliothèque' },
  { key: 'calendar', label: 'Calendrier' },
  { key: 'stats', label: 'Statistiques' },
  { key: 'profile', label: 'Profil' },
  { key: 'feed', label: 'Journal' }
]

export default function Sidebar({ view, setView, onOpenSearch, weekWatched = 0, toCatch = 0 }) {
  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <div className={styles.mark}>J</div>
        <div className={styles.name}>Jilu</div>
      </div>
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className={`${styles.navItem} ${view === item.key ? styles.active : ''}`}
          onClick={() => setView(item.key)}
        >
          {item.label}
        </div>
      ))}
      <div className={styles.divider} />
      <div className={styles.search} onClick={onOpenSearch}>Rechercher…</div>
      <div className={styles.statsCard}>
        <div className={styles.statsLabel}>Cette semaine</div>
        <div className={styles.statsRow}>
          <div><div className={styles.statValueAccent}>{weekWatched}</div><div className={styles.statSub}>épisodes vus</div></div>
          <div><div className={styles.statValuePink}>{toCatch}</div><div className={styles.statSub}>à rattraper</div></div>
        </div>
      </div>
    </aside>
  )
}
