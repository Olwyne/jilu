import { useTranslation } from 'react-i18next'
import styles from './Header.module.css'
import { pressable } from '../../lib/a11y'
import BrandMark from '../ui/BrandMark'
import IconButton from '../ui/IconButton'

export default function Header({
  title, subtitle, showBack, onBack, onOpenSearch, onOpenAccount, isMobile, avatarInitials
}) {
  const { t } = useTranslation()
  return (
    <header className={styles.header}>
      {isMobile && (
        <div className={styles.brand}>
          <BrandMark size={30} />
          <span className="sr-only">Jilu</span>
        </div>
      )}
      <div className={styles.titleBlock}>
        {showBack && (
          <div className={styles.back} {...pressable(onBack)}>{t('header.back')}</div>
        )}
        {title && <h1 className={styles.title}>{title}</h1>}
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      <IconButton label={t('header.search')} onClick={onOpenSearch} className={styles.searchButton}>
        <svg aria-hidden="true" width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </IconButton>
      {avatarInitials && (
        <IconButton round brand label={t('header.account')} onClick={onOpenAccount}>{avatarInitials}</IconButton>
      )}
    </header>
  )
}
