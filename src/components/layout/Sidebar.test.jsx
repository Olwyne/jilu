import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Sidebar from './Sidebar'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/library' })
}))

describe('Sidebar', () => {
  it('renders nav items and highlights the active one', () => {
    render(<Sidebar />)
    const libraryItem = screen.getByText('Library').closest('div')
    expect(libraryItem.className).toMatch(/active/)
  })

  it('navigates to the clicked section', async () => {
    render(<Sidebar />)
    await userEvent.click(screen.getByText('Calendar'))
    expect(mockNavigate).toHaveBeenCalledWith('/calendar')
  })
})
