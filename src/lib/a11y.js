// Props that make a non-<button> element operable from the keyboard.
// Spread onto the element: <div {...pressable(onOpen, { label })} />
export function pressable(handler, { role = 'button', label, pressed, checked, expanded, disabled } = {}) {
  const props = {
    'data-pressable': '',
    role,
    tabIndex: disabled ? -1 : 0,
    onClick: disabled ? undefined : handler,
    onKeyDown: (e) => {
      // A nested pressable must not trigger its ancestor, and typing in a child field is not activation.
      if (e.target !== e.currentTarget || disabled) return
      if (e.key === 'Enter' || (e.key === ' ' && role !== 'link')) {
        e.preventDefault()
        handler?.(e)
      }
    },
  }
  if (label) props['aria-label'] = label
  if (pressed !== undefined) props['aria-pressed'] = pressed
  if (checked !== undefined) props['aria-checked'] = checked
  if (expanded !== undefined) props['aria-expanded'] = expanded
  if (disabled) props['aria-disabled'] = true
  return props
}
