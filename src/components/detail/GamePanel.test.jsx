import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import GamePanel from './GamePanel'

describe('GamePanel', () => {
  it('shows formatted duration from minutes', () => {
    render(<GamePanel workId="g1" game={{ minutes: 125, done: {} }} onAddMinutes={() => {}} onToggleTier={() => {}} />)
    expect(screen.getByText('2 h 5 min')).toBeInTheDocument()
  })

  it('shows formatted duration from legacy hours field', () => {
    render(<GamePanel workId="g1" game={{ hours: 3, done: {} }} onAddMinutes={() => {}} onToggleTier={() => {}} />)
    expect(screen.getByText('3 h')).toBeInTheDocument()
  })

  it('shows 0 min when no game', () => {
    render(<GamePanel workId="g1" game={null} onAddMinutes={() => {}} onToggleTier={() => {}} />)
    expect(screen.getByText('0 min')).toBeInTheDocument()
  })

  it('add button calls onAddMinutes with h*60+min', async () => {
    const onAddMinutes = vi.fn()
    render(<GamePanel workId="g1" game={{ minutes: 0, done: {} }} onAddMinutes={onAddMinutes} onToggleTier={() => {}} />)
    const [hInput, mInput] = screen.getAllByRole('spinbutton')
    await userEvent.clear(hInput)
    await userEvent.type(hInput, '1')
    await userEvent.clear(mInput)
    await userEvent.type(mInput, '30')
    await userEvent.click(screen.getByText(/Add/i))
    expect(onAddMinutes).toHaveBeenCalledWith('g1', 90)
  })

  it('subtract button calls onAddMinutes with negative delta', async () => {
    const onAddMinutes = vi.fn()
    render(<GamePanel workId="g1" game={{ minutes: 120, done: {} }} onAddMinutes={onAddMinutes} onToggleTier={() => {}} />)
    const [hInput, mInput] = screen.getAllByRole('spinbutton')
    await userEvent.clear(hInput)
    await userEvent.type(hInput, '0')
    await userEvent.clear(mInput)
    await userEvent.type(mInput, '45')
    await userEvent.click(screen.getByText(/Subtract/i))
    expect(onAddMinutes).toHaveBeenCalledWith('g1', -45)
  })

  it('clicking a tier checkbox calls onToggleTier(workId, tierKey)', async () => {
    const onToggleTier = vi.fn()
    render(<GamePanel workId="g1" game={{ minutes: 0, done: {} }} onAddMinutes={() => {}} onToggleTier={onToggleTier} />)
    const label = screen.getByText('Main quest')
    const row = label.parentElement
    const checkbox = row.firstChild
    await userEvent.click(checkbox)
    expect(onToggleTier).toHaveBeenCalledWith('g1', 'main')
  })
})
