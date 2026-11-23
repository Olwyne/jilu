import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.forgotTitle'))
  const { resetPassword } = useAuth()
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
      setError(t('auth.sendError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.forgotTitle')}</h1>
        {!sent ? (
          <>
            <p className={styles.subtitle}>{t('auth.forgotSubtitle')}</p>
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
            {error && <div role="alert" className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">{t('auth.sendLink')}</button>
          </>
        ) : (
          <p className={styles.success}>
            {t('auth.emailSent')}
          </p>
        )}
        <Link to="/login" className={styles.switch}>
          {t('auth.backToLogin')}
        </Link>
      </form>
    </div>
  )
}
