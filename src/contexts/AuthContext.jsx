import { createContext, useContext, useEffect, useState } from 'react'
import {
  onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, signOut,
  sendPasswordResetEmail, confirmPasswordReset,
  updatePassword, EmailAuthProvider, reauthenticateWithCredential,
  deleteUser
} from 'firebase/auth'
import { auth } from '../firebase'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => { setUser(u); setLoading(false) })
  }, [])

  const value = {
    user,
    loading,
    signup: (email, password) => createUserWithEmailAndPassword(auth, email, password),
    login: (email, password) => signInWithEmailAndPassword(auth, email, password),
    logout: () => signOut(auth),
    resetPassword: (email) => sendPasswordResetEmail(auth, email, { url: 'https://jilu-app.vercel.app/login' }),
    confirmReset: (oobCode, newPassword) => confirmPasswordReset(auth, oobCode, newPassword),
    changePassword: async (currentPassword, newPassword) => {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, currentPassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await updatePassword(auth.currentUser, newPassword)
    },
    deleteAccount: async (password) => {
      const credential = EmailAuthProvider.credential(auth.currentUser.email, password)
      await reauthenticateWithCredential(auth.currentUser, credential)
      await deleteUser(auth.currentUser)
    },
  }

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export function useAuth() {
  return useContext(AuthCtx)
}
