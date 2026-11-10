// src/components/Toast.test.jsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Toast from './Toast'

describe('Toast', () => {
  const toast = { title: 'Severance', label: 'S1 · E3' }

  it('keeps an empty live region mounted when toast is null', () => {
    render(<Toast toast={null} onClose={() => {}} onOpenRating={() => {}} />)
    expect(screen.queryByText('Marked as seen')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeEmptyDOMElement()
  })

  it('shows "Marked as seen" and work info when toast is set', () => {
    render(<Toast toast={toast} onClose={() => {}} onOpenRating={() => {}} />)
    expect(screen.getByText('Marked as seen')).toBeInTheDocument()
    expect(screen.getByText(/Severance/)).toBeInTheDocument()
    expect(screen.getByText(/S1 · E3/)).toBeInTheDocument()
  })

  it('calls onOpenRating when "Rate" is clicked', async () => {
    const onOpenRating = vi.fn()
    render(<Toast toast={toast} onClose={() => {}} onOpenRating={onOpenRating} />)
    await userEvent.click(screen.getByText('Rate'))
    expect(onOpenRating).toHaveBeenCalled()
  })

  it('calls onClose when ✕ is clicked', async () => {
    const onClose = vi.fn()
    render(<Toast toast={toast} onClose={onClose} onOpenRating={() => {}} />)
    await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('offers Undo for episode toasts and calls onUndo', async () => {
    const onUndo = vi.fn()
    render(<Toast toast={{ title: 'Severance', label: 'S1 · E3', workId: 'w1', sNum: 1, eNum: 3 }} onClose={() => {}} onOpenRating={() => {}} onUndo={onUndo} />)
    await userEvent.click(screen.getByRole('button', { name: 'Undo' }))
    expect(onUndo).toHaveBeenCalled()
  })

  it('has no Undo when the toast is not about an episode', () => {
    render(<Toast toast={{ title: 'Added' }} onClose={() => {}} onOpenRating={() => {}} onUndo={() => {}} />)
    expect(screen.queryByRole('button', { name: 'Undo' })).not.toBeInTheDocument()
  })
})
