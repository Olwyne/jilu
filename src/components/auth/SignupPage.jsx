import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'
import { pressable } from '../../lib/a11y'

export default function SignupPage() {
  const { t } = useTranslation()
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
      setError(t('auth.signupError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.signup')}</h1>
        <input
          className={styles.input}
          type="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          aria-label={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className={styles.input}
          type="password"
          autoComplete="new-password"
          placeholder={t('auth.passwordPlaceholder')}
          aria-label={t('auth.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        {error && <div role="alert" className={styles.error}>{error}</div>}
        <button className={styles.button} type="submit">{t('auth.createAccount')}</button>
        <div className={styles.switch} {...pressable(() => navigate('/login', { state: location.state }), { role: 'link' })}>
          {t('auth.alreadyAccount')}
        </div>
      </form>
    </div>
  )
}
