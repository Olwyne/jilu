import { tmdbSearch } from './tmdb'
import { anilistSearch } from './anilist'
import { googleBooksSearch } from './googleBooks'
import { rawgSearch } from './rawg'
import { spotifySearch } from './spotify'

const SOURCES = [tmdbSearch, anilistSearch, googleBooksSearch, rawgSearch, spotifySearch]

export async function searchCatalog(query) {
  const settled = await Promise.allSettled(SOURCES.map((fn) => fn(query)))
  return settled
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
}
