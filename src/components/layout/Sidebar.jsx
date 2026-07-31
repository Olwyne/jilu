import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './Sidebar.module.css'
import { initials } from '../../lib/domain'

export default function Sidebar({ profile = {}, toCatch = 0 }) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const ITEMS = [
    { path: '/dashboard', label: t('nav.home') },
    { path: '/library', label: t('nav.library') },
    { path: '/calendar', label: t('nav.calendar') },
    { path: '/stats', label: t('nav.stats') },
    { path: '/profile', label: t('nav.profile') },
  ]

  return (
    <aside className={styles.aside}>
      <button className={styles.brand} onClick={() => navigate('/dashboard')} aria-label={t('nav.home')}>
        <div className={styles.mark}>J</div>
        <div className={styles.name}>Jilu</div>
      </button>
      {ITEMS.map((item) => (
        <button
          key={item.path}
          className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
          onClick={() => navigate(item.path)}
          aria-current={pathname === item.path ? 'page' : undefined}
        >
          {item.label}
          {item.path === '/calendar' && toCatch > 0 && (
            <span style={{ marginLeft: 'auto', minWidth: 20, height: 20, padding: '0 6px', borderRadius: 20, background: 'var(--color-pink)', color: '#fff', fontSize: 11, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{toCatch}</span>
          )}
        </button>
      ))}
      <div style={{ flex: 1 }} />
      <button
        onClick={() => navigate('/account')}
        className={`${styles.accountChip} ${pathname === '/account' ? styles.active : ''}`}
        aria-current={pathname === '/account' ? 'page' : undefined}
      >
        <div className={styles.chipAvatar}>{initials(profile.handle || '?')}</div>
        <div className={styles.chipInfo}>
          <div className={styles.chipName}>{profile.handle || t('nav.account')}</div>
          <div className={styles.chipHandle}>{profile.email || t('settings.appearance')}</div>
        </div>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#7a7a8a" strokeWidth="1.8" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>
    </aside>
  )
}
