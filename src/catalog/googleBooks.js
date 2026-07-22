const BASE = 'https://www.googleapis.com/books/v1/volumes'

export async function googleBooksTrending() {
  const res = await fetch('https://openlibrary.org/trending/daily.json?limit=5')
  const json = await res.json()
  return (json.works || []).map((w) => ({
    source: 'googlebooks',
    sourceId: w.key,
    id: `openlibrary-${w.key.replace('/works/', '')}`,
    title: w.title || 'Sans titre',
    category: 'livres',
    genre: 'Divers',
    year: w.first_publish_year || null,
    overview: '',
    poster: w.cover_i ? `https://covers.openlibrary.org/b/id/${w.cover_i}-M.jpg` : null,
    seasons: null,
    release: null
  }))
}

export async function googleBooksSearch(query) {
  const key = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY
  const keyParam = key ? `&key=${key}` : ''
  const res = await fetch(`${BASE}?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=fr${keyParam}`)
  const json = await res.json()
  return (json.items || []).map((it) => {
    const v = it.volumeInfo || {}
    const year = v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : null
    return {
      source: 'googlebooks',
      sourceId: it.id,
      id: `googlebooks-${it.id}`,
      title: v.title || 'Sans titre',
      category: 'livres',
      genre: (v.categories || [])[0] || 'Divers',
      year,
      overview: v.description || '',
      poster: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
      seasons: null,
      release: null
    }
  })
}
