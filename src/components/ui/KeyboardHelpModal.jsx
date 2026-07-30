import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'

const SHORTCUTS = [
  { keys: ['g', 'h'], action: 'route.home.title' },
  { keys: ['g', 'l'], action: 'route.library.title' },
  { keys: ['g', 'c'], action: 'route.calendar.title' },
  { keys: ['g', 's'], action: 'route.stats.title' },
  { keys: ['g', 'p'], action: 'route.profile.title' },
  { keys: ['g', 'a'], action: 'route.account.title' },
  { keys: ['Esc'], action: 'shortcuts.back' },
  { keys: ['?'], action: 'shortcuts.help' },
]

const FOCUSABLE = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'

export default function KeyboardHelpModal({ onClose }) {
  const { t } = useTranslation()
  const dialogRef = useRef(null)
  const closeRef = useRef(null)
  const titleId = 'keyboard-help-title'

  useEffect(() => {
    const prev = document.activeElement
    closeRef.current?.focus()

    function trapFocus(e) {
      if (!dialogRef.current) return
      const focusable = [...dialogRef.current.querySelectorAll(FOCUSABLE)]
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.key === 'Tab') {
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      }
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', trapFocus)
    return () => {
      document.removeEventListener('keydown', trapFocus)
      prev?.focus()
    }
  }, [onClose])

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(e) => e.stopPropagation()}
        style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 20, padding: '28px 32px', width: 340, maxWidth: '90vw' }}
      >
        <h2 id={titleId} style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, marginBottom: 20, margin: '0 0 20px' }}>
          {t('shortcuts.title')}
        </h2>
        <dl style={{ display: 'flex', flexDirection: 'column', gap: 10, margin: 0 }}>
          {SHORTCUTS.map(({ keys, action }) => (
            <div key={keys.join('+')} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <dt style={{ fontSize: 14, color: 'var(--color-muted)', fontWeight: 'normal' }}>{t(action)}</dt>
              <dd style={{ margin: 0, display: 'flex', gap: 4 }}>
                {keys.map((k) => (
                  <kbd key={k} style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 700, padding: '3px 8px', borderRadius: 7, background: 'var(--color-chip-bg)', border: '1px solid var(--color-border-btn)', color: 'var(--color-muted-2)' }}>
                    {k}
                  </kbd>
                ))}
              </dd>
            </div>
          ))}
        </dl>
        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t('shortcuts.close')}
          style={{ marginTop: 22, width: '100%', padding: '10px 0', borderRadius: 12, border: '1px solid var(--color-border-btn)', background: 'transparent', color: 'var(--color-muted)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
        >
          {t('shortcuts.close')}
        </button>
      </div>
    </div>
  )
}
