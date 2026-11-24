import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'

export default function LoginPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.login'))
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    try {
      await login(email, password)
      navigate(location.state?.from || '/library', { replace: true })
    } catch {
      setError(t('auth.loginError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.login')}</h1>
        <label className={styles.field}>
          <span className={styles.label}>{t('auth.emailPlaceholder')}</span>
          <input
            className={styles.input}
            type="email"
            autoComplete="username"
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
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>
        <Link to="/forgot-password" className={styles.switchRight}>
          {t('auth.forgotPassword')}
        </Link>
        {error && <div role="alert" className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit">{t('auth.login')}</button>
        <Link to="/signup" state={location.state} className={styles.switch}>
          {t('auth.noAccount')}
        </Link>
      </form>
    </div>
  )
}
