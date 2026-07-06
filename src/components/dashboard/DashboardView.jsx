import { posterGradient } from '../../lib/posterBox'
import { initials, relText } from '../../lib/domain'

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

export default function DashboardView({ works, watched, reviews, ratings, onOpenWork, onWatchNext }) {
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
        {upNext.map(({ w, nx }) => {
          const { from, to } = posterGradient(w.id)
          return (
            <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', gap: 14, padding: 12, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
              <div style={{ width: 54, height: 78, borderRadius: 11, background: `linear-gradient(150deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 22, color: 'rgba(255,255,255,.9)' }}>{initials(w.title)}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
                <div style={{ fontSize: 13, color: 'var(--color-accent)', fontWeight: 600, marginTop: 3 }}>S{nx.s.n} · Épisode {nx.e.n}</div>
              </div>
              <div onClick={(ev) => { ev.stopPropagation(); onWatchNext(w.id, nx.s.n, nx.e.n) }} style={{ alignSelf: 'center', width: 38, height: 38, borderRadius: '50%', background: 'var(--color-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>✓</div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26 }}>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>En cours</h3>
          {enCours.map((w) => (
            <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', gap: 13, alignItems: 'center', cursor: 'pointer', marginBottom: 12 }}>
              <div style={{ fontWeight: 600, fontSize: 14.5 }}>{w.title}</div>
            </div>
          ))}
        </div>
        <div>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>Dernières notes</h3>
          {reviews.slice(0, 4).map((r) => {
            const w = works[r.id]
            return (
              <div key={r.id} onClick={() => w && onOpenWork(w.id)} style={{ display: 'flex', gap: 13, padding: 13, borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', marginBottom: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w ? w.title : r.id}</div>
                  <div style={{ fontSize: 12.5, color: 'var(--color-muted)', marginTop: 4 }}>{r.note}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--color-muted-3)', marginTop: 5 }}>{relText(r.ts, Date.now())}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
