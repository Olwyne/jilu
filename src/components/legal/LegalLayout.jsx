import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import BrandMark from '../ui/BrandMark'
import styles from './Legal.module.css'

export default function LegalLayout({ title, date, children }) {
  const { t, i18n } = useTranslation()
  const lang = i18n.language?.startsWith('fr') ? 'fr' : 'en'

  useEffect(() => {
    document.title = `${title} — Jilu`
    document.documentElement.lang = lang
    return () => { document.title = 'Jilu — Your whole culture, tracked in one place' }
  }, [title, lang])

  return (
    <div className={styles.page} data-theme="light">
      <a href="#main" className="skip-link">{t('landing.skip')}</a>
      <header className={styles.nav}>
        <Link to="/" className={styles.logo}>
          <BrandMark size={32} />
          Jilu
        </Link>
        <Link to="/" className={styles.back}>← {t('legal.back')}</Link>
      </header>
      <main id="main" className={styles.content}>
        <h1>{title}</h1>
        <p className={styles.date}>{t('legal.updated', { date })}</p>
        <hr className={styles.divider} />
        {children}
      </main>
      <footer>
        <nav className={styles.footer} aria-label={t('landing.footer.legal')}>
          <Link to="/privacy">{t('landing.footer.privacy')}</Link>
          <Link to="/terms">{t('landing.footer.terms')}</Link>
          <Link to="/legal">{t('landing.footer.legal')}</Link>
        </nav>
      </footer>
    </div>
  )
}
