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

async function batchFetchDates(idToKey) {
  const ids = Object.keys(idToKey)
  const result = {}
  for (let i = 0; i < ids.length; i += 100) {
    try {
      const batch = ids.slice(i, i + 100)
      const res = await fetch(apiUrl('/chapter', { 'ids[]': batch, limit: 100 }))
      const json = await res.json()
      for (const ch of json.data || []) {
        if (ch.attributes?.publishAt) result[idToKey[ch.id]] = new Date(ch.attributes.publishAt).getTime()
      }
    } catch { /* dates optional */ }
  }
  return result
}

// Returns { map: Map<chapterNum, volumeNum|null>, lastChapter: number,
//           volumeDates: Map<volumeNum, timestamp>, chapterDates: Map<chapterNum, timestamp> }
export async function mangadexGetChapterMap(mangaTitle) {
  const empty = { map: new Map(), lastChapter: 0, volumeDates: new Map(), chapterDates: new Map() }
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
    // id → volumeNum (for first chapter of each volume)
    const volIdToVolNum = {}
    // id → chapterNum (for scan/none chapters)
    const scanIdToChNum = {}

    for (const [volKey, volData] of Object.entries(aggJson.volumes || {})) {
      const volumeNum = volKey === 'none' ? null : parseInt(volKey, 10)
      const chapters = Object.entries(volData.chapters || {})

      if (volumeNum !== null && chapters.length > 0) {
        const [, firstChData] = chapters.reduce(([mk, mv], [k, v]) =>
          parseFloat(k) < parseFloat(mk) ? [k, v] : [mk, mv]
        )
        volIdToVolNum[firstChData.id] = volumeNum
      }

      for (const [chKey, chData] of chapters) {
        const n = Math.round(parseFloat(chKey))
        if (!isNaN(n)) {
          const existing = map.get(n)
          // real volume always wins over null/"none"
          if (existing === undefined || (existing === null && volumeNum !== null)) {
            map.set(n, volumeNum)
          }
          if (volumeNum === null && map.get(n) === null) scanIdToChNum[chData.id] = n
        }
      }
    }

    const [volDatesRaw, scanDatesRaw] = await Promise.all([
      batchFetchDates(volIdToVolNum),
      batchFetchDates(scanIdToChNum),
    ])

    const volumeDates = new Map(Object.entries(volDatesRaw).map(([k, v]) => [Number(k), v]))
    const chapterDates = new Map(Object.entries(scanDatesRaw).map(([k, v]) => [Number(k), v]))

    return { map, lastChapter: Math.max(lastChapter, map.size > 0 ? Math.max(...map.keys()) : 0), volumeDates, chapterDates }
  } catch {
    return empty
  }
}
