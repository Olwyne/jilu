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

export async function anilistGetDetail(work) {
  const q = `query ($id: Int) {
    Media(id: $id, type: ANIME) { episodes startDate { year month day } }
  }`
  const json = await gql(q, { id: work.sourceId })
  const m = json.data?.Media
  const start = m?.startDate?.year
    ? new Date(m.startDate.year, (m.startDate.month || 1) - 1, m.startDate.day || 1).getTime()
    : Date.now()
  const count = m?.episodes || 1
  const episodes = Array.from({ length: count }, (_, i) => ({
    n: i + 1,
    title: 'Épisode ' + (i + 1),
    air: start + i * 7 * DAY
  }))
  return { ...work, seasons: [{ n: 1, name: null, episodes }] }
}
