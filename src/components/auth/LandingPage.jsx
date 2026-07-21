import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import i18n from '../../i18n/index.js'
import heroScreenshot from '../../assets/hero-screenshot.png'

const css = `
.lp { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f9; color: #1a1a2e; min-height: 100vh; }
.lp *, .lp *::before, .lp *::after { margin: 0; padding: 0; box-sizing: border-box; }

.lp nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: white; border-bottom: 1px solid #e8e6f0; position: sticky; top: 0; z-index: 100; }
.lp .nav-logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 1.1rem; color: #1a1a2e; text-decoration: none; }
.lp .logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
.lp .nav-links { display: flex; gap: 1.5rem; align-items: center; }
.lp .nav-link { font-size: 0.875rem; color: #6b6b8a; text-decoration: none; }
.lp .nav-link:hover { color: #1a1a2e; }
.lp .nav-right { display: flex; align-items: center; gap: 0.75rem; }
.lp .lang-btn { background: none; border: 1.5px solid #e0ddf0; border-radius: 8px; padding: 0.35rem 0.6rem; cursor: pointer; font-size: 1.1rem; line-height: 1; display: flex; align-items: center; gap: 0.3rem; color: #6b6b8a; font-size: 0.78rem; font-weight: 500; transition: border-color 0.15s; }
.lp .lang-btn:hover { border-color: #7c3aed; color: #7c3aed; }
.lp .nav-cta { background: #7c3aed; color: white; padding: 0.5rem 1.25rem; border-radius: 8px; text-decoration: none; font-size: 0.875rem; font-weight: 500; }
.lp .nav-cta:hover { background: #6d28d9; }

.lp .hero { max-width: 900px; margin: 0 auto; padding: 5rem 2rem 3rem; text-align: center; }
.lp .badge { display: inline-flex; align-items: center; gap: 0.4rem; background: #ede9fe; color: #7c3aed; padding: 0.35rem 0.9rem; border-radius: 99px; font-size: 0.8rem; font-weight: 500; margin-bottom: 1.5rem; }
.lp .badge-dot { width: 6px; height: 6px; background: #7c3aed; border-radius: 50%; animation: lp-pulse 2s infinite; }
@keyframes lp-pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
.lp h1 { font-size: clamp(2.2rem, 5vw, 3.4rem); font-weight: 700; line-height: 1.12; color: #1a1a2e; margin-bottom: 1rem; }
.lp h1 span { color: #7c3aed; }
.lp .hero-sub { font-size: 1.1rem; color: #6b6b8a; max-width: 580px; margin: 0 auto 2rem; line-height: 1.65; }
.lp .hero-actions { display: flex; align-items: center; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-bottom: 1rem; }
.lp .btn-primary { background: #7c3aed; color: white; padding: 0.8rem 1.75rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem; display: inline-flex; align-items: center; gap: 0.5rem; }
.lp .btn-primary:hover { background: #6d28d9; }
.lp .btn-secondary { background: white; color: #1a1a2e; padding: 0.8rem 1.75rem; border-radius: 10px; text-decoration: none; font-weight: 500; font-size: 1rem; border: 1.5px solid #e0ddf0; display: inline-flex; align-items: center; gap: 0.5rem; }
.lp .btn-secondary:hover { background: #f9f8fc; }
.lp .hero-note { font-size: 0.8rem; color: #9999b3; }

.lp .mockup-container { max-width: 860px; margin: 3rem auto 0; padding: 0 1.5rem; }
.lp .browser-chrome { background: white; border-radius: 14px; box-shadow: 0 24px 64px rgba(124,58,237,0.13), 0 4px 16px rgba(0,0,0,0.07); overflow: hidden; border: 1px solid #e8e6f0; }
.lp .browser-bar { background: #f5f4f9; padding: 0.6rem 1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid #e8e6f0; }
.lp .browser-dots { display: flex; gap: 5px; }
.lp .dot { width: 10px; height: 10px; border-radius: 50%; }
.lp .dot-red { background: #ff5f57; }
.lp .dot-yellow { background: #febc2e; }
.lp .dot-green { background: #28c840; }
.lp .browser-url { background: white; border-radius: 6px; padding: 0.25rem 0.75rem; font-size: 0.75rem; color: #9999b3; flex: 1; border: 1px solid #e8e6f0; }
.lp .hero-screenshot { width: 100%; display: block; }

.lp .stats-row { max-width: 860px; margin: 3rem auto 0; padding: 0 1.5rem; display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.lp .stat-card { background: white; border-radius: 12px; padding: 1.25rem; border: 1px solid #e8e6f0; text-align: center; }
.lp .stat-number { font-size: 1.8rem; font-weight: 700; color: #7c3aed; margin-bottom: 0.2rem; }
.lp .stat-label { font-size: 0.78rem; color: #9999b3; }

.lp .features { max-width: 860px; margin: 5rem auto 0; padding: 0 1.5rem; }
.lp .section-label { text-align: center; font-size: 0.75rem; font-weight: 600; color: #7c3aed; letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 0.5rem; }
.lp .section-title { text-align: center; font-size: 1.7rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.5rem; line-height: 1.2; white-space: pre-line; }
.lp .section-sub { text-align: center; color: #6b6b8a; font-size: 0.95rem; margin-bottom: 2.5rem; }

.lp .bento { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
.lp .bento-card { background: white; border-radius: 14px; padding: 1.5rem; border: 1px solid #e8e6f0; }
.lp .bento-card.wide { grid-column: span 2; }
.lp .bento-icon { font-size: 1.5rem; margin-bottom: 0.75rem; }
.lp .bento-title { font-weight: 600; font-size: 0.95rem; color: #1a1a2e; margin-bottom: 0.35rem; }
.lp .bento-desc { font-size: 0.82rem; color: #6b6b8a; line-height: 1.55; }
.lp .bento-tags { display: flex; flex-wrap: wrap; gap: 0.35rem; margin-top: 0.75rem; }
.lp .bento-tag { background: #f0edf9; color: #7c3aed; font-size: 0.72rem; padding: 0.2rem 0.55rem; border-radius: 99px; font-weight: 500; }

.lp .ep-list { margin-top: 0.75rem; display: flex; flex-direction: column; gap: 0.4rem; }
.lp .ep-row { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.5rem; border-radius: 6px; background: #f9f8fc; font-size: 0.75rem; }
.lp .ep-check { width: 14px; height: 14px; border-radius: 3px; flex-shrink: 0; }
.lp .ep-check.done { background: #7c3aed; display: flex; align-items: center; justify-content: center; }
.lp .ep-check.done::after { content: '✓'; color: white; font-size: 9px; }
.lp .ep-check.todo { border: 1.5px solid #d0cce0; }
.lp .ep-name { color: #4b4b6b; flex: 1; }
.lp .ep-star { color: #f59e0b; font-size: 0.65rem; }

.lp .import-section { max-width: 860px; margin: 3.5rem auto 0; padding: 0 1.5rem; }
.lp .import-card { background: linear-gradient(135deg, rgba(124,58,237,0.04), rgba(168,85,247,0.06)); border: 1.5px solid #ddd6fe; border-radius: 16px; padding: 2rem; display: flex; align-items: flex-start; gap: 2rem; flex-wrap: wrap; }
.lp .import-icon { font-size: 2.5rem; flex-shrink: 0; }
.lp .import-body { flex: 1; min-width: 240px; }
.lp .import-body h3 { font-size: 1.15rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.4rem; }
.lp .import-body p { color: #6b6b8a; font-size: 0.88rem; line-height: 1.55; }
.lp .import-steps { display: flex; gap: 0.5rem; margin-top: 1rem; align-items: center; flex-wrap: wrap; }
.lp .step { background: white; border: 1px solid #e8e6f0; border-radius: 8px; padding: 0.4rem 0.75rem; font-size: 0.78rem; color: #4b4b6b; }
.lp .step-arrow { color: #c4b5fd; }
.lp .import-detail { margin-top: 0.75rem; font-size: 0.78rem; color: #9999b3; }

.lp .platforms { max-width: 860px; margin: 4rem auto 0; padding: 0 1.5rem; text-align: center; }
.lp .platform-badges { display: flex; justify-content: center; gap: 1rem; flex-wrap: wrap; margin-top: 1.5rem; }
.lp .platform-badge { display: flex; align-items: center; gap: 0.5rem; background: white; border: 1.5px solid #e8e6f0; border-radius: 10px; padding: 0.6rem 1.25rem; font-size: 0.85rem; font-weight: 500; color: #1a1a2e; }

.lp .cta-section { max-width: 860px; margin: 4.5rem auto; padding: 0 1.5rem; }
.lp .cta-card { background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 18px; padding: 3.5rem 2rem; text-align: center; color: white; }
.lp .cta-card h2 { font-size: 2rem; font-weight: 700; margin-bottom: 0.75rem; }
.lp .cta-card p { opacity: 0.85; margin-bottom: 2rem; font-size: 1rem; white-space: pre-line; }
.lp .btn-white { background: white; color: #7c3aed; padding: 0.8rem 2.25rem; border-radius: 10px; text-decoration: none; font-weight: 600; font-size: 1rem; display: inline-block; }
.lp .btn-white:hover { background: #f5f3ff; }

.lp footer { text-align: center; padding: 2rem; color: #9999b3; font-size: 0.8rem; border-top: 1px solid #e8e6f0; background: white; }
.lp footer a { color: #7c3aed; text-decoration: none; }

@media (max-width: 700px) {
  .lp nav { padding: 0.75rem 1rem; }
  .lp .nav-links { display: none; }
  .lp .hero { padding: 3rem 1.25rem 2rem; }
  .lp .bento { grid-template-columns: 1fr 1fr; }
  .lp .bento-card.wide { grid-column: span 2; }
  .lp .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 420px) {
  .lp .bento { grid-template-columns: 1fr; }
  .lp .bento-card.wide { grid-column: span 1; }
  .lp .stats-row { grid-template-columns: repeat(2, 1fr); }
}
`

const FLAGS = { en: '🇬🇧', fr: '🇫🇷' }
const OTHER = { en: 'fr', fr: 'en' }

export default function LandingPage() {
  const { t, i18n: i18nInstance } = useTranslation()
  const lang = i18nInstance.language?.startsWith('fr') ? 'fr' : 'en'
  const other = OTHER[lang]

  useEffect(() => {
    const title = lang === 'fr'
      ? 'Jilu — Toute ta culture, suivie en un seul endroit'
      : 'Jilu — Your whole culture, tracked in one place'
    const desc = lang === 'fr'
      ? 'Séries, films, animés, mangas, livres, jeux vidéo — suivi épisode par épisode, stats, calendrier et profils publics. Gratuit.'
      : 'Series, films, anime, manga, books, video games — episode-by-episode tracking, stats, release calendar, and public profiles. Free TV Time alternative.'
    document.title = title
    document.querySelector('meta[name="description"]')?.setAttribute('content', desc)
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title)
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', desc)
  }, [lang])

  function toggleLang() {
    i18n.changeLanguage(other)
  }

  return (
    <div className="lp">
      <style>{css}</style>

      <nav>
        <Link to="/login" className="nav-logo">
          <div className="logo-icon">J</div>
          Jilu
        </Link>
        <div className="nav-links">
          <a href="#features" className="nav-link">{t('landing.nav.features')}</a>
          <a href="#import" className="nav-link">{t('landing.nav.import')}</a>
        </div>
        <div className="nav-right">
          <button className="lang-btn" onClick={toggleLang} title={other.toUpperCase()}>
            {FLAGS[other]} {other.toUpperCase()}
          </button>
          <Link to="/signup" className="nav-cta">{t('landing.nav.cta')}</Link>
        </div>
      </nav>

      <section className="hero">
        <div className="badge">
          <span className="badge-dot"></span>
          {t('landing.badge')}
        </div>
        <h1>{t('landing.h1a')}<br /><span>{t('landing.h1b')}</span></h1>
        <p className="hero-sub">{t('landing.sub')}</p>
        <div className="hero-actions">
          <Link to="/signup" className="btn-primary">{t('landing.cta.primary')}</Link>
          <a href="#import" className="btn-secondary">{t('landing.cta.secondary')}</a>
        </div>
        <p className="hero-note">{t('landing.note')}</p>
      </section>

      <div className="mockup-container">
        <div className="browser-chrome">
          <div className="browser-bar">
            <div className="browser-dots">
              <div className="dot dot-red"></div>
              <div className="dot dot-yellow"></div>
              <div className="dot dot-green"></div>
            </div>
            <div className="browser-url">jilu-app.vercel.app/library</div>
          </div>
          <img src={heroScreenshot} alt="Jilu app screenshot" className="hero-screenshot" />
        </div>
      </div>

      <div className="stats-row">
        <div className="stat-card">
          <div className="stat-number">{t('landing.stat1.n')}</div>
          <div className="stat-label">{t('landing.stat1.label')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{t('landing.stat2.n')}</div>
          <div className="stat-label">{t('landing.stat2.label')}</div>
        </div>
        <div className="stat-card">
          <div className="stat-number">{t('landing.stat3.n')}</div>
          <div className="stat-label">{t('landing.stat3.label')}</div>
        </div>
      </div>

      <section className="features" id="features">
        <p className="section-label">{t('landing.features.label')}</p>
        <h2 className="section-title">{t('landing.features.title')}</h2>
        <p className="section-sub">{t('landing.features.sub')}</p>

        <div className="bento">
          <div className="bento-card wide">
            <div className="bento-icon">📺</div>
            <div className="bento-title">{t('landing.f1.title')}</div>
            <div className="bento-desc">{t('landing.f1.desc')}</div>
            <div className="ep-list">
              <div className="ep-row"><div className="ep-check done"></div><span className="ep-name">S1 · E1 — Pilot</span><span className="ep-star">★★★★★</span></div>
              <div className="ep-row"><div className="ep-check done"></div><span className="ep-name">S1 · E2 — The Train</span><span className="ep-star">★★★★☆</span></div>
              <div className="ep-row"><div className="ep-check todo"></div><span className="ep-name">S1 · E3 — Night Falls</span></div>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">📅</div>
            <div className="bento-title">{t('landing.f2.title')}</div>
            <div className="bento-desc">{t('landing.f2.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">📊</div>
            <div className="bento-title">{t('landing.f3.title')}</div>
            <div className="bento-desc">{t('landing.f3.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">🔍</div>
            <div className="bento-title">{t('landing.f4.title')}</div>
            <div className="bento-desc">{t('landing.f4.desc')}</div>
            <div className="bento-tags">
              <span className="bento-tag">TMDB</span>
              <span className="bento-tag">AniList</span>
              <span className="bento-tag">RAWG</span>
              <span className="bento-tag">Google Books</span>
              <span className="bento-tag">Spotify</span>
            </div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">👤</div>
            <div className="bento-title">{t('landing.f5.title')}</div>
            <div className="bento-desc">{t('landing.f5.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">🌙</div>
            <div className="bento-title">{t('landing.f6.title')}</div>
            <div className="bento-desc">{t('landing.f6.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">🎮</div>
            <div className="bento-title">{t('landing.f7.title')}</div>
            <div className="bento-desc">{t('landing.f7.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">💬</div>
            <div className="bento-title">{t('landing.f8.title')}</div>
            <div className="bento-desc">{t('landing.f8.desc')}</div>
          </div>

          <div className="bento-card">
            <div className="bento-icon">⚡</div>
            <div className="bento-title">{t('landing.f9.title')}</div>
            <div className="bento-desc">{t('landing.f9.desc')}</div>
          </div>
        </div>
      </section>

      <div className="import-section" id="import">
        <div className="import-card">
          <div className="import-icon">📦</div>
          <div className="import-body">
            <h3>{t('landing.import.h3')}</h3>
            <p>{t('landing.import.p')}</p>
            <div className="import-steps">
              <span className="step">{t('landing.import.step1')}</span>
              <span className="step-arrow">→</span>
              <span className="step">{t('landing.import.step2')}</span>
              <span className="step-arrow">→</span>
              <span className="step">{t('landing.import.step3')}</span>
            </div>
            <p className="import-detail">{t('landing.import.detail')}</p>
          </div>
        </div>
      </div>

      <section className="platforms">
        <p className="section-label">{t('landing.platforms.label')}</p>
        <h2 className="section-title">{t('landing.platforms.title')}</h2>
        <p className="section-sub">{t('landing.platforms.sub')}</p>
        <div className="platform-badges">
          <div className="platform-badge">💻 Web app</div>
          <div className="platform-badge">📱 iOS — Add to home screen</div>
          <div className="platform-badge">🤖 Android — Add to home screen</div>
        </div>
      </section>

      <div className="cta-section">
        <div className="cta-card">
          <h2>{t('landing.cta2.h2')}</h2>
          <p>{t('landing.cta2.p')}</p>
          <Link to="/signup" className="btn-white">{t('landing.cta2.btn')}</Link>
        </div>
      </div>

      <footer>
        {t('landing.footer')} &nbsp;·&nbsp;
        <Link to="/login">{t('landing.footer.signin')}</Link>
        <br />
        <span style={{ fontSize: '0.78rem', marginTop: '0.5rem', display: 'inline-block' }}>
          <Link to="/privacy">{t('landing.footer.privacy')}</Link>
          &nbsp;·&nbsp;
          <Link to="/terms">{t('landing.footer.terms')}</Link>
          &nbsp;·&nbsp;
          <Link to="/legal">{t('landing.footer.legal')}</Link>
        </span>
      </footer>
    </div>
  )
}
