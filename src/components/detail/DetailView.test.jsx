import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DetailView from './DetailView'

const work = {
  id: 'w1', title: 'Severance', category: 'series', genre: 'Thriller', year: 2022, status: 'en_cours',
  overview: 'desc', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Good News', air: 0 }] }]
}

describe('DetailView', () => {
  it('shows title, overview, and status label', () => {
    render(<DetailView work={work} watched={{}} ratings={{}} games={{}} feed={[]} actions={{}} />)
    expect(screen.getByText('Severance')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
    expect(screen.getAllByText('En cours').length).toBeGreaterThan(0)
  })

  it('clicking a status option calls actions.setStatus with the work id and new value', async () => {
    const setStatus = vi.fn()
    render(<DetailView work={work} watched={{}} ratings={{}} games={{}} feed={[]} actions={{ setStatus }} />)
    await userEvent.click(screen.getByRole('button', { name: /cours/i }))
    await userEvent.click(screen.getByText('Terminé'))
    expect(setStatus).toHaveBeenCalledWith('w1', 'termine')
  })
})
