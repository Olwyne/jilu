import { useTranslation } from 'react-i18next'
import Button from './ui/Button'

export default function Toast({ toast, onClose, onOpenRating, onUndo }) {
  const { t } = useTranslation()
  const header = toast?.header ?? t('toast.seen')
  const handleAction = toast?.action ? toast.action.fn : onOpenRating
  const actionLabel = toast?.action ? toast.action.label : t('toast.rate')
  // The live region stays mounted so screen readers announce the toast when it is filled in.
  return (
    <div role="status" aria-live="polite" className="jilu-toast" style={{ position: 'fixed', zIndex: 9000 }}>
      {toast && (
    <div className="jilu-toast-in" style={{
      background: 'var(--color-surface-toast)', border: '1px solid var(--color-border-glass)',
      borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center',
      gap: 14, boxShadow: `0 8px 32px var(--color-shadow-lg)`,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      minWidth: 260, maxWidth: 380,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12, color: 'var(--color-green)', fontWeight: 700, marginBottom: 3 }}>{header}</div>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{toast.title}</div>
        {toast.label && <div style={{ fontSize: 12, color: 'var(--color-muted)', marginTop: 2 }}>{toast.label}</div>}
      </div>
      {onUndo && toast.sNum != null && (
        <Button variant="secondary" size="sm" style={{ flexShrink: 0 }} onClick={onUndo}>{t('toast.undo')}</Button>
      )}
      <Button variant="primary" size="sm" style={{ flexShrink: 0 }} onClick={handleAction}>
        {actionLabel}
      </Button>
      <button type="button" onClick={onClose} aria-label={t('toast.dismiss')} style={{ minWidth: 32, minHeight: 32, fontSize: 16, color: 'var(--color-muted-2)', cursor: 'pointer', flexShrink: 0, lineHeight: 1, background: 'none', border: 'none' }}><span aria-hidden="true">✕</span></button>
    </div>
      )}
    </div>
  )
}
