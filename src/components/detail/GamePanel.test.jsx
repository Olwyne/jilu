import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GamePanel from './GamePanel'

describe('GamePanel', () => {
  it('clicking + calls onAddHours(workId, 5)', async () => {
    const onAddHours = vi.fn()
    render(<GamePanel workId="g1" game={{ hours: 10, done: {} }} onAddHours={onAddHours} onToggleTier={() => {}} />)
    await userEvent.click(screen.getByText('+'))
    expect(onAddHours).toHaveBeenCalledWith('g1', 5)
  })

  it('clicking − calls onAddHours(workId, -5)', async () => {
    const onAddHours = vi.fn()
    render(<GamePanel workId="g1" game={{ hours: 10, done: {} }} onAddHours={onAddHours} onToggleTier={() => {}} />)
    await userEvent.click(screen.getByText('−'))
    expect(onAddHours).toHaveBeenCalledWith('g1', -5)
  })

  it('clicking a tier checkbox calls onToggleTier(workId, tierKey)', async () => {
    const onToggleTier = vi.fn()
    render(<GamePanel workId="g1" game={{ hours: 10, done: {} }} onAddHours={() => {}} onToggleTier={onToggleTier} />)
    const label = screen.getByText('Main quest')
    const row = label.parentElement
    const checkbox = row.firstChild
    await userEvent.click(checkbox)
    expect(onToggleTier).toHaveBeenCalledWith('g1', 'main')
  })

  it('shows hours from game prop, defaulting to 0 when no game', () => {
    render(<GamePanel workId="g1" game={null} onAddHours={() => {}} onToggleTier={() => {}} />)
    expect(screen.getByText('0 h played')).toBeInTheDocument()
  })
})
