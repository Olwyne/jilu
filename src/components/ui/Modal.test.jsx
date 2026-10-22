import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Modal from './Modal'

function Harness({ onClose }) {
  return (
    <>
      <button>opener</button>
      <Modal onClose={onClose} label="Test dialog">
        <button>first</button>
        <button>last</button>
      </Modal>
    </>
  )
}

describe('Modal', () => {
  it('exposes a labelled modal dialog and moves focus inside', () => {
    render(<Harness onClose={() => {}} />)
    expect(screen.getByRole('dialog', { name: 'Test dialog' })).toHaveAttribute('aria-modal', 'true')
    expect(screen.getByText('first')).toHaveFocus()
  })

  it('closes on Escape', async () => {
    const onClose = vi.fn()
    render(<Harness onClose={onClose} />)
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('keeps Tab and Shift+Tab inside the dialog', async () => {
    render(<Harness onClose={() => {}} />)
    await userEvent.tab()
    expect(screen.getByText('last')).toHaveFocus()
    await userEvent.tab()
    expect(screen.getByText('first')).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(screen.getByText('last')).toHaveFocus()
  })

  it('does not close on Escape when not dismissable', async () => {
    const onClose = vi.fn()
    render(<Modal onClose={onClose} label="x" dismissable={false}><button>ok</button></Modal>)
    await userEvent.keyboard('{Escape}')
    expect(onClose).not.toHaveBeenCalled()
  })
})
