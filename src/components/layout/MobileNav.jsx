import styles from './MobileNav.module.css'

const ITEMS = [
  {
    key: 'dashboard',
    label: 'Accueil',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="7" height="9" rx="1.5" />
        <rect x="14" y="3" width="7" height="5" rx="1.5" />
        <rect x="14" y="12" width="7" height="9" rx="1.5" />
        <rect x="3" y="16" width="7" height="5" rx="1.5" />
      </svg>
    )
  },
  {
    key: 'library',
    label: 'Biblio',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="3" width="7" height="7" rx="1.5" />
        <rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" />
        <rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    )
  },
  {
    key: 'calendar',
    label: 'Calendrier',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9h18M8 2.5v4M16 2.5v4" />
      </svg>
    )
  },
  {
    key: 'feed',
    label: 'Journal',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7A8.5 8.5 0 0 1 21 11.5z" />
      </svg>
    )
  },
  {
    key: 'stats',
    label: 'Stats',
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
        <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
      </svg>
    )
  }
]

export default function MobileNav({ view, setView }) {
  return (
    <nav className={styles.nav}>
      {ITEMS.map((item) => (
        <div
          key={item.key}
          className={`${styles.item} ${view === item.key ? styles.active : ''}`}
          onClick={() => setView(item.key)}
        >
          {item.icon}
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </nav>
  )
}
