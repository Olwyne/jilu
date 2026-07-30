import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import GoalsSection from './GoalsSection'

const THIS_YEAR = new Date().getFullYear()
const JAN_THIS_YEAR = new Date(THIS_YEAR, 0, 15).getTime()
const LAST_YEAR_TS = new Date(THIS_YEAR - 1, 6, 1).getTime()

const BASE_WORKS = {
  f1: { id: 'f1', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
  f2: { id: 'f2', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
  f3: { id: 'f3', category: 'films', status: 'termine', finishedAt: LAST_YEAR_TS },
  s1: { id: 's1', category: 'series', status: 'termine', finishedAt: JAN_THIS_YEAR },
}
const SETTINGS = { goals: { films: 5, series: 10 } }

describe('GoalsSection', () => {
  it('renders a card for each of the 6 categories', () => {
    render(<GoalsSection works={{}} settings={{ goals: {} }} onSaveSettings={() => {}} />)
    expect(screen.getByText('Films')).toBeInTheDocument()
    expect(screen.getByText('Series')).toBeInTheDocument()
    expect(screen.getByText('Anime')).toBeInTheDocument()
  })

  it('counts only works finished in current year', () => {
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={() => {}} />)
    // films: f1 + f2 = 2 this year (f3 is last year)
    // Goal is 5, so we see "2" as the done count next to the goal "5"
    const filmsDone = screen.getAllByText('2')
    expect(filmsDone.length).toBeGreaterThanOrEqual(1)
  })

  it('shows Set goal when goal is 0', () => {
    render(<GoalsSection works={{}} settings={{ goals: {} }} onSaveSettings={() => {}} />)
    const setGoalButtons = screen.getAllByText('Set goal')
    expect(setGoalButtons.length).toBe(6)
  })

  it('clicking goal number shows input', () => {
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={() => {}} />)
    fireEvent.click(screen.getByText('5')) // films goal = 5
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  it('blur on input calls onSaveSettings with new value', () => {
    const onSave = vi.fn()
    render(<GoalsSection works={BASE_WORKS} settings={SETTINGS} onSaveSettings={onSave} />)
    fireEvent.click(screen.getByText('5'))
    const input = screen.getByRole('spinbutton')
    fireEvent.change(input, { target: { value: '8' } })
    fireEvent.blur(input)
    expect(onSave).toHaveBeenCalledWith({ goals: expect.objectContaining({ films: 8 }) })
  })

  it('shows checkmark when done >= goal', () => {
    const works = {
      f1: { id: 'f1', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
      f2: { id: 'f2', category: 'films', status: 'termine', finishedAt: JAN_THIS_YEAR },
    }
    render(<GoalsSection works={works} settings={{ goals: { films: 2 } }} onSaveSettings={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
