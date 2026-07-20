import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ForgotPasswordPage.module.css'

export default function ForgotPasswordPage() {
  const { resetPassword } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await resetPassword(email)
      setSent(true)
    } catch {
      setError("Impossible d'envoyer l'e-mail. Vérifie l'adresse saisie.")
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>Mot de passe oublié</h1>
        {!sent ? (
          <>
            <p className={styles.subtitle}>Saisis ton adresse e-mail pour recevoir un lien de réinitialisation.</p>
            <input
              className={styles.input}
              type="email"
              placeholder="Adresse e-mail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">Envoyer le lien</button>
          </>
        ) : (
          <p className={styles.success}>
            E-mail envoyé ! Vérifie ta boîte de réception et clique sur le lien pour réinitialiser ton mot de passe.
          </p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          Retour à la connexion
        </div>
      </form>
    </div>
  )
}
