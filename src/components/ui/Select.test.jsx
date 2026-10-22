import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Select from './Select'

const options = [
  { value: 'a', label: 'Alpha', color: 'var(--color-accent)' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma' },
]

describe('Select', () => {
  it('announces haspopup/expanded and opens a listbox with the current option selected', async () => {
    render(<Select value="b" options={options} onChange={() => {}} label="Status" />)
    const trigger = screen.getByRole('button', { name: 'Status: Beta' })
    expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'Beta' })).toHaveFocus()
  })

  it('moves with arrow keys, selects with Enter and returns focus to the trigger', async () => {
    const onChange = vi.fn()
    render(<Select value="a" options={options} onChange={onChange} label="Status" />)
    await userEvent.tab()
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{ArrowDown}')
    await userEvent.keyboard('{Enter}')
    expect(onChange).toHaveBeenCalledWith('b')
    expect(screen.getByRole('button', { name: /Status/ })).toHaveFocus()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('closes on Escape without changing the value', async () => {
    const onChange = vi.fn()
    render(<Select value="a" options={options} onChange={onChange} label="Status" />)
    await userEvent.click(screen.getByRole('button', { name: /Status/ }))
    await userEvent.keyboard('{Escape}')
    expect(onChange).not.toHaveBeenCalled()
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('does not open when disabled', async () => {
    render(<Select value="a" options={options} onChange={() => {}} disabled label="Status" />)
    await userEvent.click(screen.getByRole('button', { name: /Status/ }))
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })
})
