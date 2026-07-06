import styles from './Sidebar.module.css'
import { initials } from '../../lib/domain'

const ITEMS = [
  { key: 'dashboard', label: 'Accueil' },
  { key: 'library', label: 'Bibliothèque' },
  { key: 'calendar', label: 'Calendrier' },
  { key: 'stats', label: 'Statistiques' },
  { key: 'profile', label: 'Profil' }
]

export default function Sidebar({ view, setView, profile = {} }) {
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
      <div style={{ flex: 1 }} />
      <div
        onClick={() => setView('account')}
        className={`${styles.accountChip} ${view === 'account' ? styles.active : ''}`}
      >
        <div className={styles.chipAvatar}>{initials(profile.name || profile.handle || '?')}</div>
        <div className={styles.chipInfo}>
          <div className={styles.chipName}>{profile.name || 'Compte'}</div>
          <div className={styles.chipHandle}>{profile.handle ? '@' + profile.handle : 'Paramètres'}</div>
        </div>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7a7a8a" strokeWidth="1.8" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </div>
    </aside>
  )
}
