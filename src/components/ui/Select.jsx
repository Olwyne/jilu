import { useEffect, useId, useRef, useState } from 'react'
import styles from './Select.module.css'

// Single-choice dropdown exposed as a listbox: the trigger announces haspopup/expanded, options are
// reachable with arrow keys, Home/End and typing Enter/Space, Escape closes and returns focus.
// options: [{ value, label, color? }] where color is any CSS colour (a theme variable, ideally).
export default function Select({ value, options, onChange, disabled, label }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const triggerRef = useRef(null)
  const listRef = useRef(null)
  const id = useId()
  const selected = options.find((o) => o.value === value) || options[0]

  useEffect(() => {
    if (!open) return
    function onPointerDown(e) { if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onPointerDown)
    return () => document.removeEventListener('mousedown', onPointerDown)
  }, [open])

  useEffect(() => {
    if (!open) return
    const items = listRef.current?.querySelectorAll('[role="option"]')
    const idx = Math.max(0, options.findIndex((o) => o.value === value))
    items?.[idx]?.focus()
  }, [open, options, value])

  function close(returnFocus = true) {
    setOpen(false)
    if (returnFocus) triggerRef.current?.focus()
  }

  function choose(v) {
    onChange(v)
    close()
  }

  function onTriggerKeyDown(e) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); setOpen(true) }
  }

  function onListKeyDown(e) {
    const items = [...listRef.current.querySelectorAll('[role="option"]')]
    const i = items.indexOf(document.activeElement)
    const move = (n) => { e.preventDefault(); items[(n + items.length) % items.length]?.focus() }
    if (e.key === 'ArrowDown') move(i + 1)
    else if (e.key === 'ArrowUp') move(i - 1)
    else if (e.key === 'Home') move(0)
    else if (e.key === 'End') move(items.length - 1)
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close() }
    else if (e.key === 'Tab') close(false)
  }

  return (
    <div ref={rootRef} className={styles.root}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        style={selected?.color ? { '--select-color': selected.color, '--dot-color': selected.color } : undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        aria-label={label ? `${label}: ${selected?.label}` : undefined}
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onTriggerKeyDown}
      >
        {selected?.color && <span className={styles.dot} />}
        {selected?.label}
        {!disabled && <span className={styles.caret} aria-hidden="true">▾</span>}
      </button>
      {open && !disabled && (
        <ul ref={listRef} id={id} role="listbox" aria-label={label} className={styles.list} onKeyDown={onListKeyDown}>
          {options.map((o) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              tabIndex={-1}
              className={styles.option}
              style={o.color ? { '--option-color': o.color, '--dot-color': o.color } : undefined}
              onClick={() => choose(o.value)}
              onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); choose(o.value) } }}
            >
              {o.color && <span className={styles.dot} />}
              {o.label}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
