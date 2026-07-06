import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './SignupPage.module.css'

export default function SignupPage() {
  const { signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await signup(email, password)
      navigate(location.state?.from || '/library', { replace: true })
    } catch (err) {
      setError("Impossible de créer le compte. Vérifie ton e-mail et ton mot de passe.")
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>Créer un compte</h1>
        <input
          className={styles.input}
          type="email"
          placeholder="Adresse e-mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit">Créer mon compte</button>
        <div className={styles.switch} onClick={() => navigate('/login', { state: location.state })}>
          Déjà un compte ? Se connecter
        </div>
      </form>
    </div>
  )
}
