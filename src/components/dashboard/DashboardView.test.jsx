import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DashboardView from './DashboardView'

describe('DashboardView', () => {
  it('shows the works-tracked count', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'en_cours', seasons: null } }
    render(<DashboardView works={works} watched={{}} reviews={[]} ratings={{}} onOpenWork={() => {}} onWatchNext={() => {}} />)
    expect(screen.getAllByText('1')[0]).toBeInTheDocument()
    expect(screen.getByText('Works tracked')).toBeInTheDocument()
  })
})
