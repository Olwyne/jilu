import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import CalendarView from './CalendarView'

const now = Date.now()
const DAY = 86400000

describe('CalendarView', () => {
  it('shows the up-to-date message when nothing to catch up on', () => {
    const works = { w1: { id: 'w1', title: 'X', status: 'termine', seasons: null } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText("You're all caught up! 🎉")).toBeInTheDocument()
  })

  it('lists an aired-unwatched episode under À rattraper', () => {
    const works = { w1: { id: 'w1', title: 'From', category: 'series', status: 'en_cours', seasons: [{ n: 1, episodes: [{ n: 1, title: 'Ep', air: now - DAY }] }] } }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('From')).toBeInTheDocument()
  })

  it('shows released a_voir film in À rattraper', () => {
    const works = {
      w1: { id: 'w1', title: 'Dune', category: 'films', status: 'a_voir', release: now - DAY, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('Dune')).toBeInTheDocument()
  })

  it('shows unreleased a_voir film in À venir', async () => {
    const user = userEvent.setup()
    const works = {
      w1: { id: 'w1', title: 'Avatar 3', category: 'films', status: 'a_voir', release: now + 7 * DAY, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    await user.click(screen.getByText(/Upcoming/))
    expect(screen.getByText('Avatar 3')).toBeInTheDocument()
  })

  it('shows a_voir livre with future year in À venir', async () => {
    const user = userEvent.setup()
    const currentYear = new Date().getFullYear()
    const works = {
      w1: { id: 'w1', title: 'Future Book', category: 'livres', status: 'a_voir', year: currentYear + 1, release: null, seasons: null },
    }
    render(<CalendarView works={works} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    await user.click(screen.getByText(/Upcoming/))
    expect(screen.getByText('Future Book')).toBeInTheDocument()
  })

  it('shows category chips row', () => {
    render(<CalendarView works={{}} watched={{}} onOpenWork={() => {}} onMarkWatched={() => {}} />)
    expect(screen.getByText('All')).toBeInTheDocument()
    expect(screen.getByText('Films')).toBeInTheDocument()
    expect(screen.getByText('Books')).toBeInTheDocument()
  })
})
