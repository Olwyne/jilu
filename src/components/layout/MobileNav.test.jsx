import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileNav from './MobileNav'

const renderAt = (path) => render(<MemoryRouter initialEntries={[path]}><MobileNav /></MemoryRouter>)

describe('MobileNav', () => {
  it('renders nav items and highlights the active one', () => {
    renderAt('/library')
    const libraryItem = screen.getByText('Library').closest('a')
    expect(libraryItem.className).toMatch(/active/)
  })

  it('navigation items are real links', () => {
    renderAt('/library')
    expect(screen.getByRole('link', { name: 'Calendar' })).toHaveAttribute('href', '/calendar')
  })
})
