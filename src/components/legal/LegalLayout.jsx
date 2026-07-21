import { Link } from 'react-router-dom'

const css = `
.legal-page { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f4f9; color: #1a1a2e; min-height: 100vh; }
.legal-page *, .legal-page *::before, .legal-page *::after { box-sizing: border-box; }
.legal-nav { display: flex; align-items: center; justify-content: space-between; padding: 1rem 2rem; background: white; border-bottom: 1px solid #e8e6f0; position: sticky; top: 0; z-index: 100; }
.legal-nav-logo { display: flex; align-items: center; gap: 0.5rem; font-weight: 600; font-size: 1.1rem; color: #1a1a2e; text-decoration: none; }
.legal-logo-icon { width: 32px; height: 32px; background: linear-gradient(135deg, #7c3aed, #a855f7); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 14px; }
.legal-back { font-size: 0.875rem; color: #7c3aed; text-decoration: none; }
.legal-back:hover { text-decoration: underline; }
.legal-content { max-width: 760px; margin: 0 auto; padding: 3rem 2rem 5rem; }
.legal-content h1 { font-size: 2rem; font-weight: 700; color: #1a1a2e; margin-bottom: 0.5rem; }
.legal-content .legal-date { font-size: 0.85rem; color: #9999b3; margin-bottom: 2.5rem; }
.legal-content h2 { font-size: 1.15rem; font-weight: 600; color: #1a1a2e; margin: 2rem 0 0.75rem; }
.legal-content p { font-size: 0.95rem; line-height: 1.7; color: #3a3a5c; margin-bottom: 0.75rem; }
.legal-content ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
.legal-content ul li { font-size: 0.95rem; line-height: 1.7; color: #3a3a5c; margin-bottom: 0.25rem; }
.legal-content a { color: #7c3aed; text-decoration: none; }
.legal-content a:hover { text-decoration: underline; }
.legal-divider { border: none; border-top: 1px solid #e8e6f0; margin: 2rem 0; }
.legal-footer { text-align: center; padding: 2rem; color: #9999b3; font-size: 0.85rem; border-top: 1px solid #e8e6f0; background: white; }
.legal-footer a { color: #7c3aed; text-decoration: none; margin: 0 0.5rem; }
`

export default function LegalLayout({ title, date, children }) {
  return (
    <div className="legal-page">
      <style>{css}</style>
      <nav className="legal-nav">
        <Link to="/" className="legal-nav-logo">
          <div className="legal-logo-icon">J</div>
          Jilu
        </Link>
        <Link to="/" className="legal-back">← Retour</Link>
      </nav>
      <div className="legal-content">
        <h1>{title}</h1>
        <p className="legal-date">Dernière mise à jour : {date}</p>
        <hr className="legal-divider" />
        {children}
      </div>
      <footer className="legal-footer">
        <Link to="/privacy">Politique de confidentialité</Link>·
        <Link to="/terms">Conditions d'utilisation</Link>·
        <Link to="/legal">Mentions légales</Link>
      </footer>
    </div>
  )
}
