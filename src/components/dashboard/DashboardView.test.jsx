import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardView from './DashboardView'

describe('DashboardView', () => {
  it('renders activity section with empty state', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'en_cours', seasons: null } }
    render(<DashboardView works={works} watched={{}} reviews={[]} feed={[]} onOpenWork={() => {}} />)
    expect(screen.getByText('Latest ratings & comments')).toBeInTheDocument()
    expect(screen.getByText('No rating or comment on watched episodes.')).toBeInTheDocument()
  })

  it('shows next-up episodes with a mark-watched action', async () => {
    const onWatchNext = vi.fn()
    const works = { w1: { id: 'w1', title: 'Severance', category: 'series', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 1000 }, { n: 2, air: 2000 }] }] } }
    render(<DashboardView works={works} watched={{ 'w1-1-1': 5 }} reviews={[]} feed={[]} onOpenWork={() => {}} onWatchNext={onWatchNext} />)
    expect(screen.getByRole('heading', { name: 'Next up' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Mark watched' }))
    expect(onWatchNext).toHaveBeenCalledWith('w1', 1, 2)
  })
})
