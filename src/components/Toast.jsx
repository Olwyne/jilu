import { useTranslation } from 'react-i18next'
import Button from './ui/Button'

export default function Toast({ toast, onClose, onOpenRating, onUndo, onHold }) {
  const { t } = useTranslation()
  const header = toast?.header ?? t('toast.seen')
  const handleAction = toast?.action ? toast.action.fn : onOpenRating
  const actionLabel = toast?.action ? toast.action.label : t('toast.rate')
  // The live region stays mounted so screen readers announce the toast when it is filled in.
  return (
    <div role="status" aria-live="polite" className="jilu-toast" style={{ position: 'fixed', zIndex: 9000 }}
      onMouseEnter={() => onHold?.(true)} onMouseLeave={() => onHold?.(false)} onFocus={() => onHold?.(true)} onBlur={() => onHold?.(false)}>
      {toast && (
    <div className="jilu-toast-in jilu-toast-box" style={{
      background: 'var(--color-surface-toast)', border: '1px solid var(--color-border-glass)',
      borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center',
      gap: 14, boxShadow: `0 8px 32px var(--color-shadow-lg)`,
      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
      minWidth: 260, maxWidth: 380,
    }}>
      <div className="jilu-toast-text">
        <div style={{ fontSize: 12, color: toast.tone === 'error' ? 'var(--color-danger-text)' : 'var(--color-green)', fontWeight: 700, marginBottom: 2 }}>{header}</div>
        <div style={{ fontWeight: 600, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {toast.title}{toast.label && <span style={{ fontWeight: 400, color: 'var(--color-muted)' }}> · {toast.label}</span>}
        </div>
      </div>
      <div className="jilu-toast-actions" style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
        {onUndo && toast.sNum != null && (
          <Button variant="ghost" size="sm" onClick={onUndo}>{t('toast.undo')}</Button>
        )}
        <Button variant="primary" size="sm" onClick={handleAction}>{actionLabel}</Button>
      </div>
      <button type="button" className="jilu-toast-close" onClick={onClose} aria-label={t('toast.dismiss')} style={{ minWidth: 32, minHeight: 32, fontSize: 16, color: 'var(--color-muted-2)', cursor: 'pointer', flexShrink: 0, lineHeight: 1, background: 'none', border: 'none' }}><span aria-hidden="true">✕</span></button>
    </div>
      )}
    </div>
  )
}
