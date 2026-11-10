// Jeux vidéo via IGDB (fonction serveur api/igdb.js). Remplace RAWG, hors service depuis novembre 2026 :
// les jeux déjà ajoutés depuis RAWG gardent leur fiche (rawg-…), les nouveaux sont en igdb-….
import { http } from './http.js'

const call = (params) => http(`/api/igdb?${new URLSearchParams(params)}`).then((r) => (r.ok ? r.json() : []))

export const igdbCover = (imageId) => (imageId ? `https://images.igdb.com/igdb/image/upload/t_cover_big/${imageId}.jpg` : null)

function toWork(g) {
  const release = g.first_release_date ? g.first_release_date * 1000 : null
  return {
    source: 'igdb',
    sourceId: g.id,
    id: `igdb-${g.id}`,
    title: g.name,
    category: 'jeux',
    genre: g.genres?.[0]?.name || g.themes?.[0]?.name || 'Divers',
    year: release ? new Date(release).getUTCFullYear() : null,
    overview: g.summary || '',
    poster: igdbCover(g.cover?.image_id),
    seasons: null,
    release,
  }
}

export const igdbSearch = async (query) => (await call({ op: 'search', q: query })).map(toWork)
export const igdbTrending = async () => (await call({ op: 'trending' })).map(toWork)
export const igdbDiscover = async (genre) => (await call({ op: 'genre', genre })).map(toWork)

// Durées estimées en heures (IGDB les donne en secondes), arrondies ; null si inconnues
export async function igdbTimeToBeat(sourceId) {
  const [t] = await call({ op: 'ttb', id: String(sourceId) })
  if (!t) return null
  const h = (s) => (s ? Math.max(1, Math.round(s / 3600)) : null)
  const out = { main: h(t.hastily), extra: h(t.normally), full: h(t.completely) }
  return out.main || out.extra || out.full ? out : null
}

// Ajout d'une œuvre : la fiche de recherche suffit, on y joint les durées de jeu si IGDB les connaît
export async function igdbGetDetail(work) {
  const timeToBeat = await igdbTimeToBeat(work.sourceId).catch(() => null)
  return timeToBeat ? { ...work, timeToBeat } : work
}
