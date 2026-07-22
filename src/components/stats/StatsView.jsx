import { useTranslation } from 'react-i18next'
import PosterBox from '../ui/PosterBox'
import { STATUS, DAY } from '../../lib/domain'

const RUNTIME = { animes: 24, series: 45 }
const CAT_COLORS = { series: 'var(--color-blue)', films: 'var(--color-pink)', animes: 'var(--color-accent)', livres: 'var(--color-green)', jeux: 'var(--color-gold)', musique: '#c46dff' }
const HEAT = ['var(--color-border)', 'var(--heat-1)', 'var(--heat-2)', 'var(--heat-3)', 'var(--heat-4)']
const MONTHS_FR = ['jan', 'fév', 'mar', 'avr', 'mai', 'jun', 'jul', 'aoû', 'sep', 'oct', 'nov', 'déc']
const HEATMAP_WEEKS = 52

function heatLevel(n) {
  if (!n) return 0
  if (n === 1) return 1
  if (n <= 3) return 2
  if (n <= 6) return 3
  return 4
}

const CARD = { padding: 22, borderRadius: 18, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }

export default function StatsView({ works, watched, ratings, onOpenWork, isMobile }) {
  const { t } = useTranslation()
  const now = Date.now()

  let totalEps = 0, minutes = 0, seriesVues = 0, filmsSeen = 0, animesVus = 0, livresLus = 0, jeuxFinis = 0
  let ratedSum = 0, ratedN = 0
  const catCount = {}, statusCount = { a_voir: 0, en_cours: 0, termine: 0, abandonne: 0 }, genreCount = {}
  const ratingDist = [0, 0, 0, 0, 0]
  const decadeCount = {}
  const dayMap = {}
  const totalWorks = Object.values(works).length

  Object.values(works).forEach((w) => {
    catCount[w.category] = (catCount[w.category] || 0) + 1
    statusCount[w.status] = (statusCount[w.status] || 0) + 1
    String(w.genre || '').split(/[/,]/).forEach((g) => { g = g.trim(); if (g) genreCount[g] = (genreCount[g] || 0) + 1 })
    const r = ratings[`w:${w.id}`] || 0
    if (r > 0) {
      ratedSum += r; ratedN++
      const idx = Math.round(r) - 1
      if (idx >= 0 && idx < 5) ratingDist[idx]++
    }
    if (w.category === 'series' && w.status === 'termine') seriesVues++
    if (w.category === 'films' && w.status === 'termine') { filmsSeen++; minutes += 120 }
    if (w.category === 'animes' && w.status === 'termine') animesVus++
    if (w.category === 'livres' && w.status === 'termine') livresLus++
    if (w.category === 'jeux' && w.status === 'termine') jeuxFinis++
    if (w.year) {
      const decade = Math.floor(Number(w.year) / 10) * 10
      decadeCount[decade] = (decadeCount[decade] || 0) + 1
    }
    if (w.seasons) {
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        const watchedVal = watched[`${w.id}-${s.n}-${e.n}`]
        if (watchedVal) {
          totalEps++; minutes += RUNTIME[w.category] || 42
          const watchTs = typeof watchedVal === 'number' ? watchedVal : null
          if (watchTs) {
            const d = new Date(watchTs)
            const dk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            dayMap[dk] = (dayMap[dk] || 0) + 1
          }
        }
      }))
    }
  })

  const hours = Math.round(minutes / 60)
  const completionRate = totalWorks ? Math.round((statusCount.termine / totalWorks) * 100) : 0
  const catMax = Math.max(1, ...Object.values(catCount))
  const topGenres = Object.entries(genreCount).sort((a, b) => b[1] - a[1]).slice(0, 6)
  const gMax = Math.max(1, ...topGenres.map((g) => g[1]))
  const topRated = Object.values(works).filter((w) => (ratings[`w:${w.id}`] || 0) > 0)
    .sort((a, b) => (ratings[`w:${b.id}`] || 0) - (ratings[`w:${a.id}`] || 0)).slice(0, 10)
  const rdMax = Math.max(1, ...ratingDist)
  const sortedDecades = Object.keys(decadeCount).map(Number).sort((a, b) => a - b)
  const decMax = Math.max(1, ...sortedDecades.map((d) => decadeCount[d]))


  // Heatmap grid (26 weeks, Mon-Sun columns)
  const todayDate = new Date(); todayDate.setHours(0, 0, 0, 0)
  const todayDow = (todayDate.getDay() + 6) % 7
  const heatStart = new Date(todayDate)
  heatStart.setDate(heatStart.getDate() - todayDow - (HEATMAP_WEEKS - 1) * 7)
  const heatCols = []
  const cur = new Date(heatStart)
  for (let w = 0; w < HEATMAP_WEEKS; w++) {
    const days = []
    for (let dow = 0; dow < 7; dow++) {
      const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}-${String(cur.getDate()).padStart(2, '0')}`
      days.push({ count: dayMap[key] || 0, month: cur.getMonth(), day: cur.getDate() })
      cur.setDate(cur.getDate() + 1)
    }
    heatCols.push({ days, month: days[0].month })
  }
  const monthLabels = heatCols.map((col, i) =>
    (i === 0 || col.month !== heatCols[i - 1].month) ? MONTHS_FR[col.month] : null
  )

  return (
    <div>
      {/* Top KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 14 }}>
        {[
          [hours + ' h', t('stats.watchTime'), 'var(--color-accent)'],
          [String(totalEps), t('stats.episodesSeen'), 'var(--color-blue)'],
          [String(totalWorks), t('stats.totalLibrary'), 'var(--color-muted)'],
          [completionRate + ' %', t('stats.completionRate'), 'var(--color-green)'],
          [ratedN ? (ratedSum / ratedN).toFixed(1) : '—', t('stats.avgRating'), 'var(--color-gold)'],
        ].map(([value, label, color]) => (
          <div key={label} style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 5, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Category "Viewed/Finished" KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14, marginBottom: 30 }}>
        {[
          [String(seriesVues), t('stats.seriesWatched'), CAT_COLORS.series],
          [String(filmsSeen), t('stats.filmsSeen'), CAT_COLORS.films],
          [String(animesVus), t('stats.animesWatched'), CAT_COLORS.animes],
          [String(livresLus), t('stats.livresRead'), CAT_COLORS.livres],
          [String(jeuxFinis), t('stats.gamesFinished'), CAT_COLORS.jeux],
        ].map(([value, label, color]) => (
          <div key={label} style={{ padding: '18px 20px', borderRadius: 16, background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 28, color, lineHeight: 1.1 }}>{value}</div>
            <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 5, lineHeight: 1.3 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Heatmap + Streak */}
      <div style={{ ...CARD, marginBottom: 30 }}>
        <div style={{ marginBottom: 18 }}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 3px' }}>{t('stats.recentActivity')}</h3>
          <div style={{ fontSize: 12, color: 'var(--color-muted-2)' }}>{t('stats.activityNote')}</div>
        </div>
        {isMobile ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {heatCols.slice(-13).flatMap((col) => col.days).map((day, i) => (
              <div
                key={i}
                title={day.count ? `${day.day}/${day.month + 1}: ${day.count} ép.` : ''}
                style={{ width: '100%', aspectRatio: '1', borderRadius: 3, background: HEAT[heatLevel(day.count)] }}
              />
            ))}
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 3, width: '100%' }}>
            {heatCols.map((col, ci) => (
              <div key={ci} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ height: 14, fontSize: 10, color: 'var(--color-muted-3)', overflow: 'hidden' }}>
                  {monthLabels[ci] || ''}
                </div>
                {col.days.map((day, di) => (
                  <div
                    key={di}
                    title={day.count ? `${day.day}/${day.month + 1}: ${day.count} ép.` : ''}
                    style={{ width: '100%', aspectRatio: '1', borderRadius: 2, background: HEAT[heatLevel(day.count)] }}
                  />
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Category + Status */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26, marginBottom: 30 }}>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.byCategory')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {Object.keys(catCount).filter((k) => catCount[k]).map((k) => (
              <div key={k}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <span>{t('cat.' + k)}</span><span style={{ color: 'var(--color-muted)' }}>{catCount[k]}</span>
                </div>
                <div style={{ height: 10, borderRadius: 10, width: `${Math.round(catCount[k] / catMax * 100)}%`, background: CAT_COLORS[k] || 'var(--color-accent)', minWidth: 10 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.byStatus')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {['termine', 'en_cours', 'a_voir', 'abandonne'].map((k) => (
              <div key={k}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, marginBottom: 6 }}>
                  <span style={{ width: 11, height: 11, borderRadius: '50%', background: STATUS[k].color, flexShrink: 0, display: 'inline-block' }} />
                  <span>{t('status.' + k)}</span>
                  <span style={{ color: 'var(--color-muted)', marginLeft: 'auto' }}>{statusCount[k] || 0}</span>
                </div>
                <div style={{ height: 8, borderRadius: 8, width: `${Math.round((statusCount[k] || 0) / Math.max(1, totalWorks) * 100)}%`, background: STATUS[k].color, minWidth: 6 }} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Ratings Dist + Decade */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26, marginBottom: 30 }}>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.ratingsDist')}</h3>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 110 }}>
            {ratingDist.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{n || ''}</span>
                <div style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${Math.round(n / rdMax * 70)}%`, background: 'var(--color-gold)', minHeight: n ? 4 : 0 }} />
                <span style={{ fontSize: 11, color: 'var(--color-gold)', letterSpacing: -1 }}>{'★'.repeat(i + 1)}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.byDecade')}</h3>
          {sortedDecades.length === 0
            ? <div style={{ fontSize: 13, color: 'var(--color-muted-2)' }}>—</div>
            : (
              <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 110, minWidth: sortedDecades.length * 44 }}>
                {sortedDecades.map((decade) => (
                  <div key={decade} style={{ flex: 1, minWidth: 38, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, height: '100%', justifyContent: 'flex-end' }}>
                    <span style={{ fontSize: 11, color: 'var(--color-muted)' }}>{decadeCount[decade]}</span>
                    <div style={{ width: '100%', borderRadius: '4px 4px 0 0', height: `${Math.round(decadeCount[decade] / decMax * 70)}%`, background: 'linear-gradient(180deg, var(--color-blue), #1a5a8a)', minHeight: 4 }} />
                    <span style={{ fontSize: 10, color: 'var(--color-muted-2)', whiteSpace: 'nowrap' }}>{decade}s</span>
                  </div>
                ))}
              </div>
              </div>
            )}
        </div>
      </div>

      {/* Top Genres + Top Rated */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 26 }}>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.topGenres')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {topGenres.map(([g, n]) => (
              <div key={g}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}><span>{g}</span><span style={{ color: 'var(--color-muted)' }}>{n}</span></div>
                <div style={{ height: 8, borderRadius: 8, width: `${Math.round(n / gMax * 100)}%`, background: 'linear-gradient(90deg, var(--color-accent), var(--color-pink))', minWidth: 8 }} />
              </div>
            ))}
          </div>
        </div>
        <div style={CARD}>
          <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>{t('stats.topRated')}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {topRated.map((w) => (
              <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 13, cursor: 'pointer' }}>
                <PosterBox id={w.id} title={w.title} poster={w.poster} width={44} height={62} radius={10} fontSize={15} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{w.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--color-muted-2)' }}>{t('cat.' + w.category)} · {w.year}</div>
                </div>
                <span style={{ fontSize: 13, color: 'var(--color-gold)', fontWeight: 600, flexShrink: 0 }}>★ {ratings[`w:${w.id}`]}/5</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
