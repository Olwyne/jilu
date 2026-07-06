import styles from './Header.module.css'

export default function Header({
  title, subtitle, showBack, onBack, onOpenSearch, onOpenAccount, isMobile, avatarInitials
}) {
  return (
    <header className={styles.header}>
      {isMobile && (
        <div className={styles.brand}>
          <div className={styles.mark}>J</div>
          <div className={styles.name}>Jilu</div>
        </div>
      )}
      <div className={styles.titleBlock}>
        {showBack && (
          <div className={styles.back} onClick={onBack}>‹ Retour</div>
        )}
        <h1 className={styles.title}>{title}</h1>
        <div className={styles.subtitle}>{subtitle}</div>
      </div>
      <div className={styles.searchButton} onClick={onOpenSearch}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="7" />
          <path d="M21 21l-4.3-4.3" />
        </svg>
      </div>
    </header>
  )
}
