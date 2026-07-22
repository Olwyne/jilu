import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import styles from './MobileNav.module.css'

export default function MobileNav() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { t } = useTranslation()

  const ITEMS = [
    {
      path: '/dashboard',
      label: t('nav.home'),
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
      path: '/library',
      label: t('nav.biblio'),
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
      path: '/calendar',
      label: t('nav.calendar'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
          <path d="M3 9h18M8 2.5v4M16 2.5v4" />
        </svg>
      )
    },
    {
      path: '/profile',
      label: t('nav.profile'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
        </svg>
      )
    },
    {
      path: '/stats',
      label: t('nav.stats'),
      icon: (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9">
          <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
        </svg>
      )
    },
  ]

  return (
    <nav className={styles.nav}>
      {ITEMS.map((item) => (
        <div
          key={item.path}
          className={`${styles.item} ${pathname === item.path ? styles.active : ''}`}
          onClick={() => navigate(item.path)}
        >
          {item.icon}
          <span className={styles.label}>{item.label}</span>
        </div>
      ))}
    </nav>
  )
}
