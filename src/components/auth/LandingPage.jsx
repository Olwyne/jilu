import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/index.js'
import BrandMark from '../ui/BrandMark'
import library1200 from '../../assets/library-1200.webp'
import library2350 from '../../assets/library-2350.webp'
import cropFilters from '../../assets/crop-filters.webp'
import cropProgress from '../../assets/crop-progress.webp'
import styles from './Landing.module.css'

const OTHER = { en: 'fr', fr: 'en' }
const ALSO = ['f5', 'f7', 'f8']
// Real crops of the app. A differentiator with no honest screenshot stays type-only.
const REASONS = [
  { n: 1, img: cropFilters, w: 1000, h: 111 },
  { n: 2, img: cropProgress, w: 900, h: 225 },
  { n: 3 },
]
const FAQ = [1, 2, 3, 4, 5]

// Follows the visitor's OS scheme, using the app's own token sets (dark is the default world).
function usePrefersLight() {
  const query = '(prefers-color-scheme: light)'
  const [light, setLight] = useState(() => (typeof window !== 'undefined' && window.matchMedia ? window.matchMedia(query).matches : false))
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const m = window.matchMedia(query)
    const onChange = (e) => setLight(e.matches)
    m.addEventListener('change', onChange)
    return () => m.removeEventListener('change', onChange)
  }, [])
  return light
}

export default function LandingPage() {
  const { t, i18n: i18nInstance } = useTranslation()
  const lang = i18nInstance.language?.startsWith('fr') ? 'fr' : 'en'
  const other = OTHER[lang]
  const light = usePrefersLight()
  const menuRef = useRef(null)

  const closeMenu = (returnFocus) => {
    const menu = menuRef.current
    if (!menu?.open) return
    menu.open = false
    if (returnFocus) menu.querySelector('summary')?.focus()
  }

  useEffect(() => {
    const title = lang === 'fr'
      ? 'Jilu — Toute ta culture, suivie en un seul endroit'
      : 'Jilu — Your whole culture, tracked in one place'
    const desc = lang === 'fr'
      ? 'Séries, films, animés, mangas, livres, jeux vidéo — suivi épisode par épisode, stats, calendrier des sorties et profils publics. Gratuit, sans pub.'
      : 'Series, films, anime, manga, books, video games — episode-by-episode tracking, stats, release calendar, and public profiles. Free, no ads.'
    document.title = title
    document.documentElement.lang = lang
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)
    document.querySelector('meta[property="og:locale"]')?.setAttribute('content', lang === 'fr' ? 'fr_FR' : 'en_US')
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title)
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', desc)
  }, [lang])

  const toggleLang = () => i18n.changeLanguage(other)

  const navLinks = (
    <>
      <a href="#why">{t('landing.nav.features')}</a>
      <a href="#import">{t('landing.nav.import')}</a>
    </>
  )

  return (
    <div className={styles.page} data-theme={light ? 'light' : 'dark'}>
      <a href="#main" className="skip-link">{t('landing.skip')}</a>

      <header className={styles.nav}>
        <div className={`${styles.wrap} ${styles.navInner}`}>
          <Link to="/login" className={styles.logo}>
            <BrandMark size={32} />
            Jilu
          </Link>
          <nav className={styles.links} aria-label="Jilu">
            <a className={styles.link} href="#why">{t('landing.nav.features')}</a>
            <a className={styles.link} href="#import">{t('landing.nav.import')}</a>
          </nav>
          <div className={styles.right}>
            <button type="button" className={styles.lang} onClick={toggleLang} lang={other} aria-label={lang === 'fr' ? 'Switch to English' : 'Passer en français'}>
              {other.toUpperCase()}
            </button>
            <Link to="/login" className={styles.signin}>{t('landing.footer.signin')}</Link>
            <Link to="/signup" className={styles.cta}>
              <span className={styles.ctaLong}>{t('landing.nav.cta')}</span>
              <span className={styles.ctaShort}>{t('landing.nav.ctaShort')}</span>
            </Link>
            <details
              ref={menuRef}
              className={styles.menu}
              onKeyDown={(e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(true) } }}
              onBlur={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) closeMenu(false) }}
            >
              <summary aria-label={t('landing.menu')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
              </summary>
              <div className={styles.menuList} onClick={() => closeMenu(false)}>
                {navLinks}
                <Link to="/login">{t('landing.footer.signin')}</Link>
              </div>
            </details>
          </div>
        </div>
      </header>

      <main id="main">
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.wrap}>
            <p className={styles.badge}>{t('landing.badge')}</p>
            <h1 id="hero-title" className={styles.h1}>{t('landing.h1a')}<em>{t('landing.h1b')}</em></h1>
            <p className={styles.sub}>{t('landing.sub')}</p>
            <div className={styles.actions}>
              <Link to="/signup" className={styles.btnPrimary}>{t('landing.cta.primary')}</Link>
              <a href="#import" className={styles.btnSecondary}>{t('landing.cta.secondary')}</a>
            </div>
            <p className={styles.note}>{t('landing.note')}</p>

            <div className={styles.proof}>
              <img
                src={library2350}
                srcSet={`${library1200} 1200w, ${library2350} 2350w`}
                sizes="(min-width: 1160px) 1120px, 100vw"
                alt={t('landing.proof.alt')}
                width="2350"
                height="1500"
                decoding="async"
                fetchPriority="high"
              />
            </div>
          </div>
        </section>

        <section className={styles.import} id="import" aria-labelledby="import-title">
          <div className={styles.wrap}>
            <div className={styles.importCard}>
              <div>
                <h2 id="import-title">{t('landing.import.h3')}</h2>
                <p>{t('landing.import.p')}</p>
                <p className={styles.detail}>{t('landing.import.detail')}</p>
                <p className={styles.after}>{t('landing.import.after')}</p>
              </div>
              <ol className={styles.steps}>
                <li>{t('landing.import.step1')}</li>
                <li>{t('landing.import.step2')}</li>
                <li>{t('landing.import.step3')}</li>
              </ol>
            </div>
          </div>
        </section>

        <section className={styles.reasons} id="why" aria-labelledby="why-title">
          <div className={styles.wrap}>
            <h2 id="why-title" className={styles.reasonsTitle}>{t('landing.features.title')}</h2>
            <p className={styles.reasonsSub}>{t('landing.features.sub')}</p>
            <ul className={styles.reasonList}>
              {REASONS.map(({ n, img, w, h }) => (
                <li key={n} className={styles.reason}>
                  <div className={styles.reasonText}>
                    <h3>{t(`landing.d${n}.title`)}</h3>
                    <p>{t(`landing.d${n}.desc`)}</p>
                  </div>
                  {img && (
                    <img className={styles.reasonImg} src={img} alt={t(`landing.d${n}.alt`)} width={w} height={h} loading="lazy" decoding="async" />
                  )}
                </li>
              ))}
            </ul>
            <div className={styles.also}>
              <h3>{t('landing.also.title')}</h3>
              <ul className={styles.alsoList}>
                {ALSO.map((k) => (
                  <li key={k}>
                    <strong>{t(`landing.${k}.title`)}</strong>
                    <span>{t(`landing.${k}.desc`)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        <section className={styles.faq} aria-labelledby="faq-title">
          <div className={styles.wrap}>
            <h2 id="faq-title">{t('landing.faq.title')}</h2>
            <div className={styles.faqList}>
              {FAQ.map((n) => (
                <details key={n} className={styles.faqItem}>
                  <summary>{t(`landing.faq.q${n}`)}</summary>
                  <p>{t(`landing.faq.a${n}`)}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className={styles.close} aria-labelledby="close-title">
          <div className={styles.wrap}>
            <div className={styles.closeCard}>
              <div>
                <h2 id="close-title">{t('landing.cta2.h2')}</h2>
                <p>{t('landing.cta2.p')}</p>
              </div>
              <Link to="/signup" className={styles.btnOnAccent}>{t('landing.cta2.btn')}</Link>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={`${styles.wrap} ${styles.footerInner}`}>
          <p>{t('landing.footer')}</p>
          <nav className={styles.footerLinks} aria-label={t('landing.footer.nav')}>
            <Link to="/login">{t('landing.footer.signin')}</Link>
            <Link to="/privacy">{t('landing.footer.privacy')}</Link>
            <Link to="/terms">{t('landing.footer.terms')}</Link>
            <Link to="/legal">{t('landing.footer.legal')}</Link>
          </nav>
        </div>
      </footer>
    </div>
  )
}
