import { useEffect } from 'react'

// Titre de l'onglet et nom de la page pour les lecteurs d'écran : un titre par page, pas le titre du site partout.
export function usePageTitle(page) {
  useEffect(() => {
    document.title = page ? `${page} · Jilu` : 'Jilu'
  }, [page])
}
