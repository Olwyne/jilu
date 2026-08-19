function apiUrl(path, params = {}) {
  if (import.meta.env.DEV) {
    const qs = Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : ''
    return `/mangadex-proxy${path}${qs}`
  }
  return '/api/mangadex?' + new URLSearchParams({ path, ...params }).toString()
}

function bestMatch(results, title) {
  const norm = (s) => s.toLowerCase().trim()
  const target = norm(title)
  return results.find((r) => {
    const titles = Object.values(r.attributes?.title || {})
    return titles.some((t) => norm(t) === target)
  }) || results[0]
}

// Returns { map: Map<chapterNum, volumeNum|null>, lastChapter: number }
export async function mangadexGetChapterMap(mangaTitle) {
  const empty = { map: new Map(), lastChapter: 0 }
  try {
    const searchRes = await fetch(apiUrl('/manga', { title: mangaTitle, limit: 10 }))
    const searchJson = await searchRes.json()
    const manga = bestMatch(searchJson.data || [], mangaTitle)
    if (!manga) return empty

    const lastChapter = Math.round(parseFloat(manga.attributes?.lastChapter || '0')) || 0

    let aggJson = { volumes: {} }
    try {
      const aggRes = await fetch(apiUrl(`/manga/${manga.id}/aggregate`))
      aggJson = await aggRes.json()
    } catch { /* aggregate failed — still have lastChapter */ }

    const map = new Map()
    for (const [volKey, volData] of Object.entries(aggJson.volumes || {})) {
      const volumeNum = volKey === 'none' ? null : parseInt(volKey, 10)
      for (const chKey of Object.keys(volData.chapters || {})) {
        const n = Math.round(parseFloat(chKey))
        if (!isNaN(n)) map.set(n, volumeNum)
      }
    }
    return { map, lastChapter: Math.max(lastChapter, map.size > 0 ? Math.max(...map.keys()) : 0) }
  } catch {
    return empty
  }
}
