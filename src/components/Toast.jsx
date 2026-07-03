// src/components/Toast.jsx
export default function Toast({ toast, onClose, onOpenRating }) {
  if (!toast) return null
  return (
    <div style={{
      position: 'fixed', bottom: 28, right: 28, zIndex: 9000,
      background: 'rgba(18,18,28,.96)', border: '1px solid rgba(255,255,255,.1)',
      borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center',
      gap: 14, boxShadow: '0 8px 32px rgba(0,0,0,.5)', backdropFilter: 'blur(12px)',
      minWidth: 260, maxWidth: 380,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--color-green)', fontWeight: 700, marginBottom: 3 }}>Marqué comme vu</div>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.title}</div>
        {toast.label && <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{toast.label}</div>}
      </div>
      <div
        onClick={onOpenRating}
        style={{ padding: '7px 13px', borderRadius: 10, background: 'var(--color-accent)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
      >
        Noter
      </div>
      <span onClick={onClose} style={{ fontSize: 16, color: 'var(--color-muted-2)', cursor: 'pointer', flexShrink: 0, lineHeight: 1 }}>✕</span>
    </div>
  )
}
