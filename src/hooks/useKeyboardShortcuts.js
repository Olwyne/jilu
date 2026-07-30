import { useEffect, useRef } from 'react'

const ROUTES = {
  h: '/dashboard',
  l: '/library',
  c: '/calendar',
  s: '/stats',
  p: '/profile',
  a: '/account',
}

function isTyping() {
  const el = document.activeElement
  if (!el) return false
  const tag = el.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable
}

export function useKeyboardShortcuts({ navigate, onToggleHelp, onBack }) {
  const pending = useRef(null)
  const timer = useRef(null)

  useEffect(() => {
    function onKeyDown(e) {
      if (isTyping()) return

      const key = e.key

      if (key === 'Escape') {
        if (pending.current) {
          clearTimeout(timer.current)
          pending.current = null
        } else {
          onBack?.()
        }
        return
      }

      if (key === '?') {
        e.preventDefault()
        onToggleHelp?.()
        return
      }

      if (key === 'g') {
        e.preventDefault()
        clearTimeout(timer.current)
        pending.current = 'g'
        timer.current = setTimeout(() => { pending.current = null }, 1000)
        return
      }

      if (pending.current === 'g') {
        clearTimeout(timer.current)
        pending.current = null
        const route = ROUTES[key]
        if (route) { e.preventDefault(); navigate(route) }
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [navigate, onToggleHelp, onBack])
}
