import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import LoginPage from './LoginPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null })
}))

const login = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ login }) }))

describe('LoginPage', () => {
  it('submits email and password to login()', async () => {
    render(<LoginPage onSwitchToSignup={() => {}} />)
    await userEvent.type(screen.getByPlaceholderText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByPlaceholderText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(login).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
