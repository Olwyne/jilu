import PosterBox from '../ui/PosterBox'
import { relText, DAY } from '../../lib/domain'

export default function CalendarView({ works, watched, onOpenWork, onMarkWatched }) {
  const now = Date.now()
  const catchGroups = []
  const upcoming = []

  Object.values(works).forEach((w) => {
    if (w.seasons) {
      let first = null, remaining = 0
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        const key = `${w.id}-${s.n}-${e.n}`
        if (!watched[key] && e.air <= now && w.status === 'en_cours') {
          if (!first) first = { s, e }
          remaining++
        }
      }))
      if (first) catchGroups.push({ w, ...first, remaining })

      let nextUp = null
      w.seasons.forEach((s) => s.episodes.forEach((e) => {
        if (e.air > now && (w.status === 'en_cours' || w.status === 'a_voir') && !nextUp) nextUp = { s, e }
      }))
      if (nextUp) upcoming.push({ w, ...nextUp })
    }
  })
  catchGroups.sort((a, b) => b.e.air - a.e.air)
  upcoming.sort((a, b) => a.e.air - b.e.air)

  return (
    <div>
      <div style={{ marginBottom: 34 }}>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>À rattraper</h3>
        {catchGroups.length === 0 && <div style={{ color: 'var(--color-muted-3)', fontSize: 14 }}>Tu es à jour ! 🎉</div>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {catchGroups.map(({ w, s, e, remaining }) => {
            return (
              <div key={w.id} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer' }}>
                <PosterBox id={w.id} title={w.title} poster={w.poster} width={48} height={68} radius={10} fontSize={20} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)', marginTop: 3 }}>
                    S{s.n} · Épisode {e.n}{remaining > 1 ? ` · +${remaining - 1} en attente` : ''}
                  </div>
                </div>
                <div onClick={(ev) => { ev.stopPropagation(); onMarkWatched(w.id, s.n, e.n) }} style={{ flexShrink: 0, padding: '9px 14px', borderRadius: 10, background: 'var(--color-accent)', color: '#fff', fontSize: 13, fontWeight: 600 }}>Marquer vu</div>
              </div>
            )
          })}
        </div>
      </div>
      <div>
        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20 }}>À venir</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {upcoming.slice(0, 14).map(({ w, s, e }) => {
            const d = new Date(e.air)
            return (
              <div key={`${w.id}-${s.n}-${e.n}`} onClick={() => onOpenWork(w.id)} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '13px 8px', borderBottom: '1px solid rgba(255,255,255,.05)', cursor: 'pointer' }}>
                <div style={{ width: 52, flexShrink: 0, textAlign: 'center' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 19, color: 'var(--color-accent)' }}>{d.getDate()}</div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15 }}>{w.title}</div>
                  <div style={{ fontSize: 13, color: 'var(--color-muted)' }}>S{s.n} · Épisode {e.n}</div>
                </div>
                <div style={{ flexShrink: 0, padding: '5px 11px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, background: e.air < now + 7 * DAY ? 'var(--color-accent)' : 'rgba(255,255,255,.06)', color: e.air < now + 7 * DAY ? '#fff' : 'var(--color-muted)' }}>{relText(e.air, now)}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
