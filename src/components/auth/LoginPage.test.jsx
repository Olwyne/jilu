import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LoginPage from './LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}))

const login = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

describe('LoginPage', () => {
  it('submits email and password to login()', async () => {
    render(<MemoryRouter><LoginPage /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(login).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
