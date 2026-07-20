export const DAY = 86400000

export const CAT = {
  series: 'Séries', films: 'Films', animes: 'Animés',
  livres: 'Livres', jeux: 'Jeux vidéo', musique: 'Musique'
}

export const STATUS = {
  a_voir: { label: 'À voir', color: '#8b6dff' },
  en_cours: { label: 'En cours', color: '#38bdf8' },
  termine: { label: 'Terminé', color: '#4ade80' },
  abandonne: { label: 'Abandonné', color: '#9797a8' }
}

const TERM = {
  series: { season: 'Saison', ep: 'Épisode', unit: 'épisodes', verb: 'Diffusé' },
  animes: { season: 'Saison', ep: 'Épisode', unit: 'épisodes', verb: 'Diffusé' },
  musique: { season: 'Album', ep: 'Titre', unit: 'titres', verb: 'Sorti' },
  livres: { season: 'Tome', ep: 'Chapitre', unit: 'chapitres', verb: 'Publié' }
}

export function term(cat) { return TERM[cat] || TERM.series }

export function hash(s) {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function initials(t) {
  const clean = t.replace(/[:\-–].*$/, '').trim().split(/\s+/)
  if (clean.length === 1) return clean[0].slice(0, 2).toUpperCase()
  return (clean[0][0] + clean[1][0]).toUpperCase()
}

export function monthsFR() {
  return ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
}

export function fmtDate(ts) {
  const d = new Date(ts)
  return d.getDate() + ' ' + monthsFR()[d.getMonth()]
}

export function relText(ts, now) {
  const diff = Math.round((ts - now) / DAY)
  if (diff === 0) return "aujourd'hui"
  if (diff === 1) return 'demain'
  if (diff > 0 && diff < 7) return 'dans ' + diff + ' j'
  if (diff < 0 && diff > -7) return 'il y a ' + (-diff) + ' j'
  if (diff < 0) return 'il y a ' + Math.round(-diff / 7) + ' sem'
  return fmtDate(ts)
}

export function epTotals(work, watched) {
  if (!work.seasons) return { total: 0, watchedCount: 0 }
  let total = 0, watchedCount = 0
  work.seasons.forEach((s) => s.episodes.forEach((e) => {
    total++
    if (watched[`${work.id}-${s.n}-${e.n}`]) watchedCount++
  }))
  return { total, watchedCount }
}
