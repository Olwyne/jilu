const BASE = import.meta.env.DEV ? '/mangadex-proxy' : 'https://api.mangadex.org'

function bestMatch(results, title) {
  const norm = (s) => s.toLowerCase().trim()
  const target = norm(title)
  return results.find((r) => {
    const titles = Object.values(r.attributes?.title || {})
    return titles.some((t) => norm(t) === target)
  }) || results[0]
}

export async function mangadexGetChapterMap(mangaTitle) {
  try {
    const searchRes = await fetch(
      `${BASE}/manga?title=${encodeURIComponent(mangaTitle)}&limit=10`
    )
    const searchJson = await searchRes.json()
    const manga = bestMatch(searchJson.data || [], mangaTitle)
    if (!manga) return new Map()

    const aggRes = await fetch(
      `${BASE}/manga/${manga.id}/aggregate`
    )
    const aggJson = await aggRes.json()

    const map = new Map()
    for (const [volKey, volData] of Object.entries(aggJson.volumes || {})) {
      const volumeNum = volKey === 'none' ? null : parseInt(volKey, 10)
      for (const chKey of Object.keys(volData.chapters || {})) {
        const n = Math.round(parseFloat(chKey))
        if (!isNaN(n)) map.set(n, volumeNum)
      }
    }
    return map
  } catch {
    return new Map()
  }
}
