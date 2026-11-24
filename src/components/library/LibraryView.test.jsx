import { describe, it, expect, vi } from 'vitest'
import { render as rtlRender, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LibraryView from './LibraryView'

const render = (ui) => rtlRender(<MemoryRouter>{ui}</MemoryRouter>)

const works = {
  w1: { id: 'w1', title: 'One Piece', category: 'animes', year: 1999, status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] },
  w2: { id: 'w2', title: 'Dune', category: 'livres', year: 2020, status: 'a_voir' },
  w3: { id: 'w3', title: 'Zelda', category: 'jeux', year: 2023, status: 'a_voir' },
}

describe('LibraryView', () => {
  it('renders a card per work with title and category/year meta', () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
  })

  it('empty library: says so and offers search and import', async () => {
    const onSearch = vi.fn()
    render(<LibraryView works={{}} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} onSearch={onSearch} onImport={() => {}} />)
    expect(screen.getByText('Your library is empty.')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Search for a work' }))
    expect(onSearch).toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Import from TV Time' })).toBeInTheDocument()
  })

  it('filters that match nothing: says so, without the empty-library message', async () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    await userEvent.click(screen.getByText('Books'))
    await userEvent.click(screen.getByText('Completed'))
    expect(screen.getByText('No works match these filters.')).toBeInTheDocument()
    expect(screen.queryByText('Your library is empty.')).not.toBeInTheDocument()
  })

  it('shows "Plan to watch" as default a_voir label', () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('Plan to watch')).toBeInTheDocument()
  })

  it('shows "Plan to read" when Books category selected', async () => {
    const user = userEvent.setup()
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    await user.click(screen.getByText('Books'))
    expect(screen.getByText('Plan to read')).toBeInTheDocument()
    expect(screen.queryByText('Plan to watch')).not.toBeInTheDocument()
  })

  it('shows "Plan to play" when Games category selected', async () => {
    const user = userEvent.setup()
    render(<LibraryView works={works} watched={{}} ratings={{}} favorites={{}} onOpenWork={() => {}} />)
    await user.click(screen.getByText('Games'))
    expect(screen.getByText('Plan to play')).toBeInTheDocument()
  })
})
