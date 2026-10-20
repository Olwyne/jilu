import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, waitFor } from '@testing-library/react'
import { reauthenticateWithCredential, deleteUser } from 'firebase/auth'
import { AuthProvider, useAuth } from './AuthContext'

vi.mock('../firebase', () => ({ auth: { currentUser: { email: 'a@b.c' } } }))
vi.mock('firebase/auth', () => ({
  onAuthStateChanged: (auth, cb) => { cb(null); return () => {} },
  signInWithEmailAndPassword: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  signOut: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  confirmPasswordReset: vi.fn(),
  updatePassword: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  deleteUser: vi.fn(),
  EmailAuthProvider: { credential: vi.fn(() => 'cred') },
}))

let auth
function Grab() { auth = useAuth(); return null }

beforeEach(() => {
  vi.clearAllMocks()
  render(<AuthProvider><Grab /></AuthProvider>)
})

describe('deleteAccount', () => {
  it('efface les données Firestore avant de supprimer le compte Auth', async () => {
    const calls = []
    reauthenticateWithCredential.mockImplementation(async () => { calls.push('reauth') })
    deleteUser.mockImplementation(async () => { calls.push('deleteUser') })
    await waitFor(() => expect(auth).toBeTruthy())
    await auth.deleteAccount('pw', async () => { calls.push('cleanup') })
    expect(calls).toEqual(['reauth', 'cleanup', 'deleteUser'])
  })

  it("n'efface rien si le mot de passe est faux", async () => {
    reauthenticateWithCredential.mockRejectedValue({ code: 'auth/invalid-credential' })
    const cleanup = vi.fn()
    await waitFor(() => expect(auth).toBeTruthy())
    await expect(auth.deleteAccount('mauvais', cleanup)).rejects.toMatchObject({ code: 'auth/invalid-credential' })
    expect(cleanup).not.toHaveBeenCalled()
    expect(deleteUser).not.toHaveBeenCalled()
  })
})
