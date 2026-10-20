// Utilitaires purs partagés par la migration (navigateur) et la fonction serveur de rafraîchissement.

// Firestore refuse `undefined` ; on retire les clés vides et remplace les trous de tableau par null.
export function clean(v) {
  if (v === undefined) return null
  if (v === null || typeof v !== 'object') return v
  if (Array.isArray(v)) return v.map(clean)
  return Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, clean(x)]))
}

export function totalEpisodes(work) {
  return (work?.seasons || []).reduce((n, s) => n + (s.episodes?.length || 0), 0)
}
