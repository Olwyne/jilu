// src/components/Toast.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from './Toast'

describe('Toast', () => {
  const toast = { title: 'Severance', label: 'S1 · E3' }

  it('renders nothing when toast is null', () => {
    const { container } = render(<Toast toast={null} onClose={() => {}} onOpenRating={() => {}} />)
    expect(container.firstChild).toBeNull()
  })

  it('shows "Marqué comme vu" and work info when toast is set', () => {
    render(<Toast toast={toast} onClose={() => {}} onOpenRating={() => {}} />)
    expect(screen.getByText('Marqué comme vu')).toBeInTheDocument()
    expect(screen.getByText('Severance')).toBeInTheDocument()
    expect(screen.getByText('S1 · E3')).toBeInTheDocument()
  })

  it('calls onOpenRating when "Noter" is clicked', async () => {
    const onOpenRating = vi.fn()
    render(<Toast toast={toast} onClose={() => {}} onOpenRating={onOpenRating} />)
    await userEvent.click(screen.getByText('Noter'))
    expect(onOpenRating).toHaveBeenCalled()
  })

  it('calls onClose when ✕ is clicked', async () => {
    const onClose = vi.fn()
    render(<Toast toast={toast} onClose={onClose} onOpenRating={() => {}} />)
    await userEvent.click(screen.getByText('✕'))
    expect(onClose).toHaveBeenCalled()
  })
})
