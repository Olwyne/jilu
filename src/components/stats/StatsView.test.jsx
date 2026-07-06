import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatsView from './StatsView'

describe('StatsView', () => {
  it('shows de visionnage label and per-category bars', () => {
    const now = Date.now()
    const works = {
      w1: { id: 'w1', title: 'Film X', category: 'films', status: 'termine', seasons: null, genre: 'Action', year: 2023 },
      w2: { id: 'w2', title: 'Série Y', category: 'series', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, air: now - 86400000 }] }], genre: 'Drama', year: 2022 }
    }
    const watched = { 'w2-1-1': true }
    render(<StatsView works={works} watched={watched} ratings={{}} onOpenWork={() => {}} />)
    expect(screen.getByText('de visionnage')).toBeInTheDocument()
    expect(screen.getByText('Séries')).toBeInTheDocument()
    expect(screen.getByText('Films')).toBeInTheDocument()
  })
})
