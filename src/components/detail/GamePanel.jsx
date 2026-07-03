const TIERS = [['main', 'Quête principale'], ['extra', 'Extras & secondaires'], ['full', 'Complétion 100 %']]

export default function GamePanel({ workId, game, onAddHours, onToggleTier }) {
  const g = game || { hours: 0, done: {} }
  return (
    <div style={{ border: '1px solid rgba(255,255,255,.08)', borderRadius: 18, background: 'rgba(255,255,255,.02)', padding: 22, marginBottom: 22 }}>
      <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, margin: '0 0 18px' }}>Mon temps de jeu</h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 22 }}>
        <div onClick={() => onAddHours(workId, -5)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20 }}>−</div>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, minWidth: 74, textAlign: 'center' }}>{g.hours || 0} h de jeu</span>
        <div onClick={() => onAddHours(workId, 5)} style={{ width: 34, height: 34, borderRadius: 10, border: '1px solid rgba(255,255,255,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 20 }}>+</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {TIERS.map(([key, label]) => {
          const on = !!(g.done && g.done[key])
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderTop: '1px solid rgba(255,255,255,.05)' }}>
              <div onClick={() => onToggleTier(workId, key)} style={{ width: 24, height: 24, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, cursor: 'pointer', color: '#fff', background: on ? 'var(--color-green)' : 'transparent', border: `2px solid ${on ? 'var(--color-green)' : '#4a4a58'}` }}>{on ? '✓' : ''}</div>
              <span style={{ fontWeight: 600, fontSize: 14.5, flex: 1, textDecoration: on ? 'line-through' : 'none', color: on ? 'var(--color-muted)' : 'inherit' }}>{label}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
