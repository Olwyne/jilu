import { useState, useEffect, useRef } from 'react'
import { STATUS } from '../../lib/domain'

export default function StatusSelect({ value, onChange }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  const current = STATUS[value]

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '11px 16px',
          borderRadius: 13,
          background: `${current.color}18`,
          border: `1px solid ${current.color}55`,
          color: current.color,
          fontWeight: 600, fontSize: 14,
          cursor: 'pointer',
          transition: 'border-color .18s, background .18s',
          whiteSpace: 'nowrap',
        }}
      >
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: current.color, flexShrink: 0 }} />
        {current.label}
        <span style={{ fontSize: 10, opacity: .7, marginLeft: 2 }}>▾</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 100,
          background: 'var(--color-dropdown-bg)',
          border: '1px solid var(--color-border-btn)',
          borderRadius: 13,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,.45)',
          minWidth: '100%',
        }}>
          {Object.entries(STATUS).map(([key, { label, color }]) => (
            <div
              key={key}
              onClick={() => { onChange(key); setOpen(false) }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '11px 16px',
                cursor: 'pointer',
                color: key === value ? color : 'var(--color-muted)',
                fontWeight: key === value ? 700 : 500,
                fontSize: 14,
                background: key === value ? `${color}14` : 'transparent',
                transition: 'background .12s',
              }}
              onMouseEnter={(e) => { if (key !== value) e.currentTarget.style.background = 'var(--color-chip-bg)' }}
              onMouseLeave={(e) => { e.currentTarget.style.background = key === value ? `${color}14` : 'transparent' }}
            >
              <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
              {label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
