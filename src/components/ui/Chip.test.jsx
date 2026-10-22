import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Chip from './Chip'
import IconButton from './IconButton'
import Badge from './Badge'

describe('Chip', () => {
  it('exposes its active state and count, and is keyboard operable', async () => {
    const onClick = vi.fn()
    render(<Chip active count={3} onClick={onClick}>Series</Chip>)
    const chip = screen.getByRole('button', { name: /Series/ })
    expect(chip).toHaveAttribute('aria-pressed', 'true')
    expect(chip).toHaveTextContent('3')
    await userEvent.tab()
    await userEvent.keyboard('{Enter}')
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('does not fire when disabled', async () => {
    const onClick = vi.fn()
    render(<Chip disabled onClick={onClick}>Music<Badge floating>soon</Badge></Chip>)
    await userEvent.click(screen.getByRole('button', { name: /Music/ }))
    expect(onClick).not.toHaveBeenCalled()
  })
})

describe('IconButton', () => {
  it('uses its label as the accessible name', async () => {
    const onClick = vi.fn()
    render(<IconButton label="Search" onClick={onClick}><svg aria-hidden="true" /></IconButton>)
    await userEvent.click(screen.getByRole('button', { name: 'Search' }))
    expect(onClick).toHaveBeenCalled()
  })
})
