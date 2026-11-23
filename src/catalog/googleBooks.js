import { http } from './http.js'

const MANGA_CAT_RE = /manga|manhwa|manhua/i

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

export async function googleBooksDiscover(subject) {
  const q = subject ? `subject:${encodeURIComponent(subject)}` : 'fiction'
  const res = await http(`/api/books?q=${q}&orderBy=relevance&maxResults=20`)
  const json = await res.json()
  return (json.items || [])
    .filter((it) => {
      const cats = (it.volumeInfo?.categories || []).join(' ')
      return !MANGA_CAT_RE.test(cats)
    })
    .map((it) => {
      const v = it.volumeInfo || {}
      return {
        source: 'googlebooks',
        sourceId: it.id,
        id: `googlebooks-${it.id}`,
        title: v.title || 'Sans titre',
        category: 'livres',
        genre: (v.categories || [])[0] || 'Divers',
        year: v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : null,
        overview: v.description || '',
        poster: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
        seasons: null,
        release: null
      }
    })
}

export async function googleBooksSearch(query) {
  const res = await http(`/api/books?q=${encodeURIComponent(query)}&maxResults=10&langRestrict=fr`)
  const json = await res.json()
  return (json.items || [])
    .filter((it) => {
      const cats = (it.volumeInfo?.categories || []).join(' ')
      return !MANGA_CAT_RE.test(cats)
    })
    .map((it) => {
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

// Fiche complète d'un volume Google Books
export async function googleBooksGetWork(volumeId) {
  const res = await http(`/api/books?id=${encodeURIComponent(volumeId)}`)
  if (!res.ok) return null
  const it = await res.json()
  const v = it.volumeInfo || {}
  return {
    source: 'googlebooks',
    sourceId: it.id,
    id: `googlebooks-${it.id}`,
    title: v.title || 'Sans titre',
    category: 'livres',
    genre: (v.categories || [])[0]?.split(' / ')[0] || 'Divers',
    year: v.publishedDate ? Number(v.publishedDate.slice(0, 4)) : null,
    overview: (v.description || '').replace(/<[^>]+>/g, ''),
    poster: v.imageLinks?.thumbnail?.replace('http:', 'https:') || null,
    seasons: null,
    release: null,
  }
}

// Fiche complète d'une œuvre Open Library (livres « tendance »), ex. OL45804W
export async function openLibraryGetWork(workKey) {
  const res = await http(`https://openlibrary.org/works/${workKey}.json`)
  if (!res.ok) return null
  const w = await res.json()
  const description = typeof w.description === 'string' ? w.description : w.description?.value || ''
  const year = Number(String(w.first_publish_date || '').match(/\d{4}/)?.[0]) || null
  return {
    source: 'openlibrary',
    sourceId: workKey,
    id: `openlibrary-${workKey}`,
    title: w.title || 'Sans titre',
    category: 'livres',
    genre: (w.subjects || [])[0] || 'Divers',
    year,
    overview: description,
    poster: w.covers?.[0] > 0 ? `https://covers.openlibrary.org/b/id/${w.covers[0]}-M.jpg` : null,
    seasons: null,
    release: null,
  }
}
