import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'
import { pressable } from '../../lib/a11y'

export default function LoginPage() {
  const { t } = useTranslation()
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
    } catch (err) {
      setError(t('auth.loginError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.login')}</h1>
        <input
          className={styles.input}
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          placeholder={t('auth.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <div className={styles.switchRight} {...pressable(() => navigate('/forgot-password'), { role: 'link' })}>
          {t('auth.forgotPassword')}
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit">{t('auth.login')}</button>
        <div className={styles.switch} {...pressable(() => navigate('/signup', { state: location.state }), { role: 'link' })}>
          {t('auth.noAccount')}
        </div>
      </form>
    </div>
  )
}
