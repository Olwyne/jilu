import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import SignupPage from './SignupPage'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: null }),
}))

const signup = vi.fn().mockResolvedValue()
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ signup }) }))

describe('SignupPage', () => {
  it('submits email and password to signup()', async () => {
    render(<MemoryRouter><SignupPage /></MemoryRouter>)
    await userEvent.type(screen.getByLabelText('Email address'), 'alex@example.com')
    await userEvent.type(screen.getByLabelText('Password'), 'hunter22')
    await userEvent.click(screen.getByRole('button', { name: 'Create account' }))
    expect(signup).toHaveBeenCalledWith('alex@example.com', 'hunter22')
  })
})
