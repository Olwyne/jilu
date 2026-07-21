import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import LibraryView from './LibraryView'

const works = {
  w1: { id: 'w1', title: 'One Piece', category: 'animes', year: 1999, status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: 0 }, { n: 2, air: 0 }] }] }
}

describe('LibraryView', () => {
  it('renders a card per work with title and category/year meta', () => {
    render(<LibraryView works={works} watched={{}} ratings={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('One Piece')).toBeInTheDocument()
    expect(screen.getByText('Anime · 1999')).toBeInTheDocument()
  })

  it('shows the empty state when no work matches', () => {
    render(<LibraryView works={{}} watched={{}} ratings={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('No works match these filters.')).toBeInTheDocument()
  })
})
