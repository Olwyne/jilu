import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import MobileNav from './MobileNav'

describe('MobileNav', () => {
  it('renders the five nav items and highlights the active one', () => {
    render(<MobileNav view="library" setView={() => {}} />)
    const libraryItem = screen.getByText('Biblio').closest('div')
    expect(libraryItem.className).toMatch(/active/)
  })

  it('calls setView with the clicked section', async () => {
    const setView = vi.fn()
    render(<MobileNav view="library" setView={setView} />)
    await userEvent.click(screen.getByText('Calendrier'))
    expect(setView).toHaveBeenCalledWith('calendar')
  })
})
