function apiUrl(path, params = {}) {
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((val) => qs.append(k, val))
    else qs.set(k, v)
  }
  const qsStr = qs.toString()
  if (import.meta.env.DEV) {
    return `/mangadex-proxy${path}${qsStr ? '?' + qsStr : ''}`
  }
  qs.set('path', path)
  return '/api/mangadex?' + qs.toString()
}

function bestMatch(results, title) {
  const norm = (s) => s.toLowerCase().trim()
  const target = norm(title)
  return results.find((r) => {
    const titles = Object.values(r.attributes?.title || {})
    return titles.some((t) => norm(t) === target)
  }) || results[0]
}

// Returns { map: Map<chapterNum, volumeNum|null>, lastChapter: number, volumeDates: Map<volumeNum, timestamp> }
export async function mangadexGetChapterMap(mangaTitle) {
  const empty = { map: new Map(), lastChapter: 0, volumeDates: new Map() }
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
    // first chapter ID per volume (to fetch publication dates)
    const volumeFirstChapterId = {}

    for (const [volKey, volData] of Object.entries(aggJson.volumes || {})) {
      const volumeNum = volKey === 'none' ? null : parseInt(volKey, 10)
      const chapters = Object.entries(volData.chapters || {})
      if (volumeNum !== null && chapters.length > 0) {
        const [, firstChData] = chapters.reduce(([minKey, minVal], [k, v]) =>
          parseFloat(k) < parseFloat(minKey) ? [k, v] : [minKey, minVal]
        )
        volumeFirstChapterId[volumeNum] = firstChData.id
      }
      for (const chKey of Object.keys(volData.chapters || {})) {
        const n = Math.round(parseFloat(chKey))
        if (!isNaN(n)) map.set(n, volumeNum)
      }
    }

    // Batch fetch chapter dates
    const volumeDates = new Map()
    const ids = Object.values(volumeFirstChapterId)
    if (ids.length > 0) {
      try {
        const chapRes = await fetch(apiUrl('/chapter', { 'ids[]': ids.slice(0, 100), limit: 100 }))
        const chapJson = await chapRes.json()
        const idToDate = {}
        for (const ch of chapJson.data || []) {
          idToDate[ch.id] = ch.attributes?.publishAt ? new Date(ch.attributes.publishAt).getTime() : null
        }
        for (const [volNum, id] of Object.entries(volumeFirstChapterId)) {
          if (idToDate[id]) volumeDates.set(Number(volNum), idToDate[id])
        }
      } catch { /* dates optional */ }
    }

    return { map, lastChapter: Math.max(lastChapter, map.size > 0 ? Math.max(...map.keys()) : 0), volumeDates }
  } catch {
    return empty
  }
}
