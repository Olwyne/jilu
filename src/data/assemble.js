// Reconstitue, à partir du modèle v2 (bibliothèque + catalogue), les mêmes données que l'ancien modèle :
// { works, watched, ratings, favorites, games, reviews } — les écrans n'ont donc pas à changer.
// Fonction pure : aucun accès réseau.

const CATALOG_ONLY_FIELDS = ['updatedAt', 'refreshedAt', 'leaseUntil']
const SUMMARY_FIELDS = ['title', 'titles', 'poster', 'posters', 'category', 'genre', 'year', 'originalTitle']

function workFrom(lib, catalogDoc) {
  const base = {}
  if (catalogDoc) {
    for (const [k, v] of Object.entries(catalogDoc)) if (!CATALOG_ONLY_FIELDS.includes(k)) base[k] = v
  } else {
    // catalogue pas encore chargé : le résumé de la bibliothèque suffit pour afficher la liste (sans épisodes)
    for (const k of SUMMARY_FIELDS) if (lib[k] !== undefined) base[k] = lib[k]
  }
  const work = { ...base, id: lib.id }
  for (const k of ['status', 'added', 'finishedAt']) if (lib[k] !== undefined && lib[k] !== null) work[k] = lib[k]
  return work
}

// library : { workId: libraryDoc } (sans les suppressions douces) · catalog : { catalogId: catalogDoc }
export function assembleData({ library = {}, catalog = {} }) {
  const works = {}
  const watched = {}
  const ratings = {}
  const favorites = {}
  const games = {}
  const reviews = []

  for (const [id, lib] of Object.entries(library)) {
    if (!lib || lib.deleted) continue

    for (const [key, ts] of Object.entries(lib.eps || {})) watched[`${id}-${key}`] = ts

    for (const [k, v] of Object.entries(lib.ratings || {})) {
      const sep = k.indexOf(':')
      ratings[sep === -1 ? `${k}:${id}` : `${k.slice(0, sep)}:${id}-${k.slice(sep + 1)}`] = v
    }

    if (lib.orphanProgress) continue // progression conservée, mais pas d'œuvre à afficher

    works[id] = workFrom(lib, lib.catalogId ? catalog[lib.catalogId] : undefined)
    if (lib.favorite) favorites[id] = true
    if (lib.game !== undefined && lib.game !== null) games[id] = lib.game
    if (lib.personalReview) reviews.push(lib.personalReview)
  }

  reviews.sort((a, b) => (b.ts || 0) - (a.ts || 0))
  return { works, watched, ratings, favorites, games, reviews }
}

// Œuvres dont l'interface a besoin des épisodes dès l'ouverture (badge « à rattraper », calendrier)
export function catalogIdsNeededAtStartup(library = {}) {
  return Object.values(library)
    .filter((l) => l && !l.deleted && !l.orphanProgress && l.catalogId && (l.status === 'en_cours' || l.status === 'a_voir'))
    .map((l) => l.catalogId)
}
