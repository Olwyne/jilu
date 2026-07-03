import { posterGradient } from '../../lib/posterBox'
import { initials, CAT, STATUS, DAY } from '../../lib/domain'

const RUNTIME = { animes: 24, series: 45 }
const CAT_COLORS = { series: 'var(--color-blue)', films: 'var(--color-pink)', animes: 'var(--color-accent)', livres: 'var(--color-green)', jeux: 'var(--color-gold)', musique: '#c46dff' }

export default function StatsView({ works, watched, ratings, onOpenWork }) {
  const now = Date.now()
  let totalEps = 0, minutes = 0, filmsSeen = 0, ratedSum = 0, ratedN = 0
  const catCount = {}, statusCount = { a_voir: 0, en_cours: 0, termine: 0, abandonne: 0 }, genreCount = {}
  const weeks = Array.from({ length: 10 }, () => 0)

  Object.values(works).forEach((w) => {
    catCount[w.category] = (catCount[w.category] || 0) + 1
    statusCount[w.status] = (statusCount[w.status] || 0) + 1
    String(w.genre || '').split(/[/,]/).forEach((g) => { g = g.trim(); if (g) genreCount[g] = (genreCount[g] || 0) + 1 })
    const r = ratings[`w:${w.id}`] || 0; if (r > 0) { ratedSum += r; ratedN++ }
    if (w.seasons) {
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        if (watched[`${w.id}-${s.n}-${e.n}`]) {
          totalEps++; minutes += RUNTIME[w.category] || 42
          const wk = Math.floor((now - e.air) / (7 * DAY))
          if (wk >= 0 && wk < 10) weeks[wk]++
        }
      }))
    }
    if (w.category === 'films' && w.status === 'termine') { filmsSeen++; minutes += 120 }
  })
  const hours = Math.round(minutes / 60)
  const catMax = Math.max(1, ...Object.values(catCount))
  const wkMax = Math.max(1, ...weeks)
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const gMax = Math.max(1, ...topGenres.map((g) => g[1]))
  const topRated = Object.values(works).filter((w) => (ratings[`w:${w.id}`] || 0) > 0)
    .sort((a, b) => (ratings[`w:${b.id}`] || 0) - (ratings[`w:${a.id}`] || 0)).slice(0, 5)

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 30 }}>
        {[
          [hours + ' h', 'de visionnage', 'var(--color-accent)'],
          [String(totalEps), 'épisodes vus', 'var(--color-blue)'],
          [String(filmsSeen), 'films vus', 'var(--color-pink)'],
          [ratedN ? (ratedSum / ratedN).toFixed(1) : '—', 'note moyenne', 'var(--color-gold)']
        ].map(([value, label, color]) => (
          <div key={label} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 32, color }}>{value}</div>
            <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26, marginBottom: 30 }}>
        <div style={{ padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>Par catégorie</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.keys(CAT).filter((k) => catCount[k]).map((k) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{CAT[k]}</span><span style={{ color: 'var(--color-muted)' }}>{catCount[k]}</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, width: `${Math.round(catCount[k] / catMax * 100)}%`, background: CAT_COLORS[k] || 'var(--color-accent)', minWidth: 10 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>Par statut</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[['termine', 'Terminé'], ['en_cours', 'En cours'], ['a_voir', 'À voir'], ['abandonne', 'Abandonné']].map(([k, label]) => (
              <div key={k}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: STATUS[k].color, flexShrink: 0, display: 'inline-block' }} />
                  <span>{label}</span>
                  <span style={{ color: 'var(--color-muted)', marginLeft: 'auto' }}>{statusCount[k] || 0}</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, width: `${Math.round((statusCount[k] || 0) / Math.max(1, Object.values(works).length) * 100)}%`, background: STATUS[k].color, minWidth: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', marginBottom: 30 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 4px' }}>Activité récente</h3>
        <div style={{ fontSize: 12.5, color: 'var(--color-muted-2)', marginBottom: 18 }}>Épisodes & titres cochés, 10 dernières semaines</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
          {weeks.slice().reverse().map((v, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%', gap: 6 }}>
              <div style={{ width: '100%', borderRadius: '6px 6px 0 0', height: `${Math.max(4, Math.round(v / wkMax * 100))}%`, background: i === 9 ? 'var(--color-pink)' : 'linear-gradient(180deg, var(--color-accent), #6b4de0)' }} />
              <span style={{ fontSize: 10, color: 'var(--color-muted-3)' }}>{i === 9 ? 'now' : (i % 3 === 0 ? `S-${9 - i}` : '')}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26 }}>
        <div style={{ padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>Genres favoris</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topGenres.map(([g, n]) => (
              <div key={g}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{g}</span><span style={{ color: 'var(--color-muted)' }}>{n}</span></div>
                <div style={{ height: 8, borderRadius: 8, width: `${Math.round(n / gMax * 100)}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))', minWidth: 8 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={{ padding: 22, borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)' }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>Les mieux notés</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topRated.map((w) => {
              const { from, to } = posterGradient(w.id)
              return (
                <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' }}>
                  <div style={{ width: 44, height: 62, borderRadius: 10, background: `linear-gradient(150deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 15, color: 'rgba(255,255,255,.9)' }}>{initials(w.title)}</span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{w.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--color-muted-2)' }}>{CAT[w.category]} · {w.year}</div>
                  </div>
                  <span style={{ fontSize: 13, color: 'var(--color-gold)', fontWeight: 600, flexShrink: 0 }}>★ {ratings[`w:${w.id}`]}/5</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
