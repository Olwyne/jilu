import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ResetPasswordPage.module.css'

export default function ResetPasswordPage() {
  const { confirmReset } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!oobCode) {
      setError("Lien invalide ou expiré. Recommence la procédure.")
      return
    }
    try {
      await confirmReset(oobCode, password)
      setDone(true)
    } catch {
      setError("Impossible de réinitialiser le mot de passe. Le lien est peut-être expiré.")
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>Nouveau mot de passe</h1>
        {!done ? (
          <>
            <input
              className={styles.input}
              type="password"
              placeholder="Nouveau mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">Réinitialiser</button>
          </>
        ) : (
          <p className={styles.success}>Mot de passe mis à jour ! Tu peux maintenant te connecter.</p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          Retour à la connexion
        </div>
      </form>
    </div>
  )
}
