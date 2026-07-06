import { posterGradient } from '../../lib/posterBox'
import { initials } from '../../lib/domain'

export default function PosterBox({ id, title, poster, width, height, radius = 12, aspectRatio, fontSize, children, style = {} }) {
  const { from, to } = posterGradient(id)
  const autoSize = fontSize || Math.round(Math.min(typeof width === 'number' ? width : 60, typeof height === 'number' ? height : 90) * 0.28)
  return (
    <div style={{ position: 'relative', width, height, borderRadius: radius, overflow: 'hidden', flexShrink: 0, aspectRatio, ...style }}>
      <div style={{ position: 'absolute', inset: 0, background: `linear-gradient(150deg, ${from}, ${to})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: autoSize, color: 'rgba(255,255,255,.9)' }}>{initials(title)}</span>
      </div>
      {poster && <img src={poster} alt={title} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} onError={(e) => { e.target.style.display = 'none' }} />}
      {children}
    </div>
  )
}
