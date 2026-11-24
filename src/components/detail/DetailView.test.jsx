import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import DetailView from './DetailView'

const wrap = (ui) => render(<MemoryRouter>{ui}</MemoryRouter>)

const work = {
  id: 'w1', title: 'Severance', category: 'series', genre: 'Thriller', year: 2022, status: 'en_cours',
  overview: 'desc', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Good News', air: 0 }] }]
}

describe('DetailView', () => {
  it('shows title, overview, and status label', () => {
    wrap(<DetailView work={work} watched={{}} ratings={{}} games={{}} feed={[]} actions={{}} />)
    expect(screen.getByText('Severance')).toBeInTheDocument()
    expect(screen.getByText('desc')).toBeInTheDocument()
    expect(screen.getAllByText('Watching').length).toBeGreaterThan(0)
  })

  it('clicking a status option calls actions.setStatus with the work id and new value', async () => {
    const setStatus = vi.fn()
    wrap(<DetailView work={work} watched={{}} ratings={{}} games={{}} feed={[]} actions={{ setStatus }} />)
    await userEvent.click(screen.getByRole('button', { name: /watching/i }))
    await userEvent.click(screen.getByText('Completed'))
    expect(setStatus).toHaveBeenCalledWith('w1', 'termine')
  })

  it('le menu d\'actions a un nom et un état, s\'ouvre au clavier et Échap le ferme en rendant le focus', async () => {
    wrap(<DetailView work={work} watched={{}} ratings={{}} games={{}} feed={[]} actions={{ removeWork: vi.fn() }} />)
    const trigger = screen.getByRole('button', { name: 'More actions' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    trigger.focus()
    await userEvent.keyboard('{Enter}')
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Remove from library')).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Remove from library')).not.toBeInTheDocument()
    expect(trigger).toHaveFocus()
  })
})
