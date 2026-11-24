import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/instrument-sans'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './i18n/index.js'
import './styles/tokens.css'
import './styles/global.css'
import App from './App.jsx'

// Après un déploiement, un onglet resté sur l'ancienne version cherche des fichiers qui n'existent plus : on recharge une fois (pas de boucle si le stockage manque).
const RELOADED = 'jilu-preload-reload'
window.addEventListener('vite:preloadError', (e) => {
  e.preventDefault()
  try {
    if (sessionStorage.getItem(RELOADED)) return
    sessionStorage.setItem(RELOADED, '1')
    location.reload()
  } catch { /* stockage indisponible : pas de rechargement automatique */ }
})
window.addEventListener('load', () => setTimeout(() => { try { sessionStorage.removeItem(RELOADED) } catch { /* ignoré */ } }, 10_000))

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
