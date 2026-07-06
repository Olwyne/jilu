import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import CalendarView from './CalendarView'

describe('CalendarView', () => {
  it('shows the up-to-date message when nothing to catch up on', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'termine', seasons: null } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('Tu es à jour ! 🎉')).toBeInTheDocument()
  })

  it('lists an aired-unwatched episode under "À rattraper"', () => {
    const now = Date.now()
    const works = { w1: { id: 'w1', title: 'From', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Ep', air: now - 86400000 }] }] } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('From')).toBeInTheDocument()
  })
})
