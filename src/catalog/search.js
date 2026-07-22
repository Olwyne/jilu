import { tmdbSearch, tmdbTrending } from './tmdb'
import { anilistSearch, anilistTrending, anilistSearchManga, anilistTrendingManga } from './anilist'
import { googleBooksSearch, googleBooksTrending } from './googleBooks'
import { rawgSearch, rawgTrending } from './rawg'
import { spotifySearch } from './spotify'

const SOURCE_CATS = [
  { fn: tmdbSearch, cats: ['series', 'films', 'animes'] },
  { fn: anilistSearch, cats: ['animes'] },
  { fn: anilistSearchManga, cats: ['mangas'] },
  { fn: googleBooksSearch, cats: ['livres'] },
  { fn: rawgSearch, cats: ['jeux'] },
  { fn: spotifySearch, cats: ['musique'] }
]

const TRENDING_FN = {
  series: () => tmdbTrending('series'),
  films: () => tmdbTrending('films'),
  animes: anilistTrending,
  mangas: anilistTrendingManga,
  livres: googleBooksTrending,
  jeux: rawgTrending,
}

export async function fetchTrending(cat) {
  const fn = TRENDING_FN[cat]
  if (!fn) return []
  try {
    const results = await fn()
    return results.slice(0, 5)
  } catch {
    return []
  }
}

export async function searchCatalog(query, cat = null) {
  const sources = cat ? SOURCE_CATS.filter(s => s.cats.includes(cat)).map(s => s.fn) : SOURCE_CATS.map(s => s.fn)
  const settled = await Promise.allSettled(sources.map((fn) => fn(query)))
  const results = settled.filter((r) => r.status === 'fulfilled').flatMap((r) => r.value)
  return cat ? results.filter(r => r.category === cat) : results
}
