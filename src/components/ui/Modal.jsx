import { useEffect, useRef } from 'react'

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Accessible dialog shell: role/aria-modal, labelled, Escape to close, Tab trapped inside,
// focus moved in on open and restored to the opener on close.
export default function Modal({ onClose, label, labelledBy, backdropStyle, panelStyle, children, dismissable = true }) {
  const panelRef = useRef(null)
  const closeRef = useRef(onClose)
  const dismissRef = useRef(dismissable)
  closeRef.current = onClose
  dismissRef.current = dismissable

  useEffect(() => {
    const opener = document.activeElement
    const panel = panelRef.current
    if (panel && !panel.contains(document.activeElement)) {
      const first = panel.querySelector('[autofocus], input, textarea') || panel.querySelector(FOCUSABLE)
      ;(first || panel).focus()
    }

    function onKeyDown(e) {
      if (!panelRef.current) return
      if (e.key === 'Escape') {
        e.stopPropagation()
        if (dismissRef.current) closeRef.current?.()
        return
      }
      if (e.key !== 'Tab') return
      const items = [...panelRef.current.querySelectorAll(FOCUSABLE)]
      if (!items.length) { e.preventDefault(); panelRef.current.focus(); return }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (e.shiftKey && (active === first || active === panelRef.current)) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && active === last) { e.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus()
    }
  }, [])

  return (
    <div
      role="presentation"
      className="jilu-backdrop-in"
      onMouseDown={(e) => { if (e.target === e.currentTarget && dismissable) onClose?.() }}
      style={backdropStyle}
    >
      <div
        ref={panelRef}
        role="dialog"
        className="jilu-panel-in"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={label ? undefined : labelledBy}
        tabIndex={-1}
        style={{ outline: 'none', ...panelStyle }}
      >
        {children}
      </div>
    </div>
  )
}
