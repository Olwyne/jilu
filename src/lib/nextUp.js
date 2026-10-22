// The next aired, unwatched episode of a work, in season then episode order.
export function nextAiredUnwatched(work, watched, now = Date.now()) {
  let first = null
  let remaining = 0
  for (const s of work.seasons || []) {
    for (const e of s.episodes || []) {
      if (!(e.air > 0 && e.air <= now)) continue
      if (watched[`${work.id}-${s.n}-${e.n}`]) continue
      remaining++
      if (!first) first = { s, e }
    }
  }
  return first ? { ...first, remaining } : null
}

const lastWatchedAt = (id, watched) => {
  const prefix = `${id}-`
  let last = 0
  for (const k of Object.keys(watched)) if (k.startsWith(prefix) && watched[k] > last) last = watched[k]
  return last
}

// Titles in progress that have something to watch now, most recently watched first.
export function nextUpList(works, watched, now = Date.now(), limit = 3) {
  return Object.values(works)
    .filter((w) => w.status === 'en_cours' && w.seasons?.length)
    .map((w) => ({ w, next: nextAiredUnwatched(w, watched, now), last: lastWatchedAt(w.id, watched) }))
    .filter((x) => x.next)
    .sort((a, b) => b.last - a.last)
    .slice(0, limit)
    .map(({ w, next }) => ({ w, s: next.s, e: next.e, remaining: next.remaining }))
}
