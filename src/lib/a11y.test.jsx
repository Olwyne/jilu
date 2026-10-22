import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { pressable } from './a11y'

describe('pressable', () => {
  it('is focusable and activates with Enter and Space', async () => {
    const fn = vi.fn()
    render(<div {...pressable(fn, { label: 'go' })} />)
    const el = screen.getByRole('button', { name: 'go' })
    await userEvent.tab()
    expect(el).toHaveFocus()
    await userEvent.keyboard('{Enter}')
    await userEvent.keyboard(' ')
    expect(fn).toHaveBeenCalledTimes(2)
  })

  it('does not let a nested pressable trigger its parent from the keyboard', async () => {
    const outer = vi.fn(); const inner = vi.fn()
    render(<div {...pressable(outer, { label: 'outer' })}><span {...pressable(inner, { label: 'inner' })} /></div>)
    screen.getByRole('button', { name: 'inner' }).focus()
    await userEvent.keyboard('{Enter}')
    expect(inner).toHaveBeenCalledTimes(1)
    expect(outer).not.toHaveBeenCalled()
  })

  it('is inert when disabled', async () => {
    const fn = vi.fn()
    render(<div {...pressable(fn, { label: 'off', disabled: true })} />)
    await userEvent.click(screen.getByRole('button', { name: 'off' }))
    expect(fn).not.toHaveBeenCalled()
  })

  it('supports switch semantics', () => {
    render(<div {...pressable(() => {}, { role: 'switch', checked: true, label: 'dark' })} />)
    expect(screen.getByRole('switch', { name: 'dark' })).toHaveAttribute('aria-checked', 'true')
  })
})
