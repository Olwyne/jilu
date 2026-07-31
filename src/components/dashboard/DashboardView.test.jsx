import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardView from './DashboardView'

describe('DashboardView', () => {
  it('renders activity section with empty state', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'en_cours', seasons: null } }
    render(<DashboardView works={works} watched={{}} reviews={[]} feed={[]} onOpenWork={() => {}} />)
    expect(screen.getByText('Latest ratings & comments')).toBeInTheDocument()
    expect(screen.getByText('No rating or comment on watched episodes.')).toBeInTheDocument()
  })
})
