import PosterBox from '../ui/PosterBox'
import { relText } from '../../lib/domain'

function nextEpisode(work, watched) {
  if (!work.seasons) return null
  const now = Date.now()
  for (const s of work.seasons) {
    for (const e of s.episodes) {
      if (!watched[`${work.id}-${s.n}-${e.n}`] && e.air <= now) return { s, e }
    }
  }
  return null
}

export default function DashboardView({ works, watched, reviews, ratings, feed, onOpenWork, onWatchNext }) {
  const list = Object.values(works)
  const enCours = list.filter((w) => w.status === 'en_cours')
  let totalEps = 0, toCatch = 0
  list.forEach((w) => {
    if (!w.seasons) return
    w.seasons.forEach((s) => s.episodes.forEach((e) => {
      const key = `${w.id}-${s.n}-${e.n}`
      if (watched[key]) totalEps++
      else if (e.air <= Date.now() && w.status === 'en_cours') toCatch++
    }))
  })
  const upNext = enCours.map((w) => ({ w, nx: nextEpisode(w, watched) })).filter((x) => x.nx).slice(0, 4)

  // Feed entries on watched episodes + work-level feed on en_cours/termine
  const activeStatuses = new Set(['en_cours', 'termine'])
  const feedItems = (feed || []).filter((f) => {
    const w = works[f.workId]
    if (!w || !activeStatuses.has(w.status)) return false
    if (f.sNum) {
      const key = `${f.workId}-${f.sNum}-${f.eNum}`
      return !!watched[key]
    }
    return true
  })

  // Reviews on en_cours/termine works
  const reviewItems = (reviews || []).filter((r) => {
    const w = works[r.id]
    return w && activeStatuses.has(w.status)
  })

  // Merge + sort by ts desc
  const allActivity = [
    ...feedItems.map((f) => ({ ...f, _type: 'comment' })),
    ...reviewItems.map((r) => ({ ...r, _type: 'review' })),
  ].sort((a, b) => b.ts - a.ts)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 14, marginBottom: 32 }}>
        {[
          [String(list.length), 'Œuvres suivies'],
          [String(enCours.length), 'En cours'],
          [String(totalEps), 'Épisodes vus'],
          [String(toCatch), 'À rattraper']
        ].map(([value, label]) => (
          <div key={label} style={{ padding: 18, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 30 }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Prochain épisode à regarder</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14, marginBottom: 34 }}>
        {upNext.map(({ w, nx }) => (
          <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 12, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
            <PosterBox id={w.id} title={w.title} poster={w.poster} width={54} height={78} radius={11} fontSize={22} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
              <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 3 }}>S{nx.s.n} · Épisode {nx.e.n}</div>
            </div>
            <div onClick={(ev) => { ev.stopPropagation(); onWatchNext(w.id, nx.s.n, nx.e.n) }} style={{ alignSelf: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✓</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, marginBottom: 14 }}>Dernières notes & commentaires</h3>
      {allActivity.length === 0
        ? <div style={{ color: 'var(--color-muted-3)', fontSize: 14, padding: '16px 0' }}>Aucune note ou commentaire sur des épisodes vus.</div>
        : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {allActivity.map((item) => {
              const w = works[item._type === 'review' ? item.id : item.workId]
              const subtitle = item._type === 'comment' && item.sNum
                ? `S${item.sNum} · Ep. ${item.eNum}`
                : item._type === 'review' ? 'Avis global' : null
              return (
                <div key={item.id || item._type + item.ts} onClick={() => w && onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 14, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
                  <PosterBox id={w?.id || item.workId || item.id} title={w?.title || ''} poster={w?.poster} width={46} height={66} radius={10} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 600, fontSize: 14 }}>{w?.title || item.id}</span>
                      {subtitle && <span style={{ fontSize: 12, color: 'var(--color-accent)', fontWeight: 600 }}>{subtitle}</span>}
                    </div>
                    <div style={{ fontSize: 14, lineHeight: 1.5 }}>{item.text || item.note}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-3)', marginTop: 6 }}>{relText(item.ts, Date.now())}</div>
                  </div>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}
