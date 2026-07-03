import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { cb(null); return () => {} },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn()
}))

function Probe() {
  const { user, loading } = useAuth()
  return <div>{loading ? 'loading' : user ? 'signed-in' : 'signed-out'}</div>
}

describe('AuthProvider', () => {
  it('resolves to signed-out when there is no Firebase user', async () => {
    render(<AuthProvider><Probe /></AuthProvider>)
    await waitFor(() => expect(screen.getByText('signed-out')).toBeInTheDocument())
  })
})
