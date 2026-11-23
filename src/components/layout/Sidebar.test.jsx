import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Sidebar from './Sidebar'

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><Sidebar /></MemoryRouter>)

describe('Sidebar', () => {
  it('renders nav items and highlights the active one', () => {
    renderAt('/library')
    const libraryItem = screen.getByText('Library').closest('a')
    expect(libraryItem.className).toMatch(/active/)
    expect(libraryItem).toHaveAttribute('aria-current', 'page')
  })

  it('navigation items are real links (new tab, copy link)', () => {
    renderAt('/library')
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar')
    screen.getAllByRole('link', { name: 'Home' }).forEach((a) => expect(a).toHaveAttribute('href', '/dashboard'))
  })
})
