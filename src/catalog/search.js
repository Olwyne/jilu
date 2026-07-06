import { tmdbSearch } from './tmdb'
import { anilistSearch } from './anilist'
import { googleBooksSearch } from './googleBooks'
import { rawgSearch } from './rawg'
import { spotifySearch } from './spotify'

const SOURCE_CATS = [
  { fn: tmdbSearch, cats: ['series', 'films'] },
  { fn: anilistSearch, cats: ['animes'] },
  { fn: googleBooksSearch, cats: ['livres'] },
  { fn: rawgSearch, cats: ['jeux'] },
  { fn: spotifySearch, cats: ['musique'] }
]

export async function searchCatalog(query, cat = null) {
  const sources = cat ? SOURCE_CATS.filter(s => s.cats.includes(cat)).map(s => s.fn) : SOURCE_CATS.map(s => s.fn)
  const settled = await Promise.allSettled(sources.map((fn) => fn(query)))
  const results = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value)
  return cat ? results.filter(r => r.category === cat) : results
}
