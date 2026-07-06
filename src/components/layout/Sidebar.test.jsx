import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from './Sidebar'

describe('Sidebar', () => {
  it('renders the six nav items and highlights the active one', () => {
    render(<Sidebar view="library" setView={() => {}} />)
    const libraryItem = screen.getByText('Bibliothèque').closest('div')
    expect(libraryItem.className).toMatch(/active/)
  })

  it('calls setView with the clicked section', async () => {
    const setView = vi.fn()
    render(<Sidebar view="library" setView={setView} />)
    await userEvent.click(screen.getByText('Calendrier'))
    expect(setView).toHaveBeenCalledWith('calendar')
  })
})
