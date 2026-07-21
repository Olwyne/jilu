import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ForgotPasswordPage.module.css'

export default function ForgotPasswordPage() {
  const { t } = useTranslation()
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
              placeholder={t('auth.emailPlaceholder')}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">{t('auth.sendLink')}</button>
          </>
        ) : (
          <p className={styles.success}>
            {t('auth.emailSent')}
          </p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          {t('auth.backToLogin')}
        </div>
      </form>
    </div>
  )
}
