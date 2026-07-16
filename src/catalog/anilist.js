const ENDPOINT = 'https://graphql.anilist.co'
const DAY = 86400000

async function gql(query, variables) {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  })
  return res.json()
}

export async function anilistSearch(query) {
  const q = `query ($search: String) {
    Page(perPage: 10) {
      media(search: $search, type: ANIME) {
        id title { romaji } genres startDate { year } description episodes status coverImage { large }
      }
    }
  }`
  const json = await gql(q, { search: query })
  return (json.data?.Page?.media || []).map((m) => ({
    source: 'anilist',
    sourceId: m.id,
    id: `anilist-${m.id}`,
    title: m.title.romaji,
    category: 'animes',
    genre: (m.genres || [])[0] || 'Divers',
    year: m.startDate?.year || null,
    overview: (m.description || '').replace(/<[^>]+>/g, ''),
    poster: m.coverImage?.large || null,
    seasons: null,
    release: null
  }))
}

export async function anilistFindId(originalTitle, year) {
  const q = `query ($search: String) {
    Page(perPage: 5) {
      media(search: $search, type: ANIME) { id startDate { year } }
    }
  }`
  const json = await gql(q, { search: originalTitle })
  const results = json.data?.Page?.media || []
  if (!results.length) return null
  if (!year) return results[0].id
  const match = results.find((r) => r.startDate?.year && Math.abs(r.startDate.year - year) <= 1)
  return match?.id || null
}

async function fetchEntry(id) {
  const q = `query ($id: Int) {
    Media(id: $id, type: ANIME) {
      episodes status startDate { year month day }
      relations { edges { relationType node { id } } }
    }
  }`
  const json = await gql(q, { id })
  return json.data?.Media || null
}

export async function anilistGetDetail(anilistId) {
  const visited = new Set()
  const seasons = []
  let currentId = anilistId
  let ended = false

  while (currentId && !visited.has(currentId)) {
    visited.add(currentId)
    const m = await fetchEntry(currentId)
    if (!m) break

    const start = m.startDate?.year
      ? new Date(m.startDate.year, (m.startDate.month || 1) - 1, m.startDate.day || 1).getTime()
      : Date.now()
    const count = m.episodes || 1
    const episodes = Array.from({ length: count }, (_, i) => ({
      n: i + 1,
      title: 'Épisode ' + (i + 1),
      air: start + i * 7 * DAY
    }))
    seasons.push({ n: seasons.length + 1, name: null, episodes })
    ended = m.status === 'FINISHED' || m.status === 'CANCELLED'

    const sequel = (m.relations?.edges || []).find((e) => e.relationType === 'SEQUEL')
    currentId = sequel?.node?.id || null
  }

  return { seasons, ended }
}
