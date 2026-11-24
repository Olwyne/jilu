import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'

export default function SignupPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.signup'))
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
    } catch {
      setError(t('auth.signupError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.signup')}</h1>
        <label className={styles.field}>
          <span className={styles.label}>{t('auth.emailPlaceholder')}</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </label>
        <label className={styles.field}>
          <span className={styles.label}>{t('auth.passwordPlaceholder')}</span>
          <input
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        {error && <div role="alert" className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit">{t('auth.createAccount')}</button>
        <Link to="/login" state={location.state} className={styles.switch}>
          {t('auth.alreadyAccount')}
        </Link>
      </form>
    </div>
  )
}
