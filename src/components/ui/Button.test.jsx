import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Button from './Button'

describe('Button', () => {
  it('is a real button that does not submit by default and fires onClick from the keyboard', async () => {
    const onClick = vi.fn()
    render(<Button variant="primary" onClick={onClick}>Save</Button>)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn).toHaveAttribute('type', 'button')
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<Button onClick={onClick} disabled>Nope</Button>)
    await userEvent.click(screen.getByRole('button', { name: 'Nope' }))
    expect(onClick).not.toHaveBeenCalled()
  })

  it('marks busy state for assistive tech', () => {
    render(<Button busy>Loading</Button>)
    expect(screen.getByRole('button', { name: 'Loading' })).toHaveAttribute('aria-busy', 'true')
  })
})
