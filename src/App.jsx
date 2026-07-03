import { useState } from 'react'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import LoginPage from './components/auth/LoginPage'
import SignupPage from './components/auth/SignupPage'

function Gate() {
  const { user, loading } = useAuth()
  const [showSignup, setShowSignup] = useState(false)

  if (loading) return null
  if (!user) {
    return showSignup
      ? <SignupPage onSwitchToLogin={() => setShowSignup(false)} />
      : <LoginPage onSwitchToSignup={() => setShowSignup(true)} />
  }
  return <div>Signed in as {user.email}</div> // replaced by the real app shell in Task 12
}

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  )
}
