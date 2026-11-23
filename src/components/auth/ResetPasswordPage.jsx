import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { usePageTitle } from '../../hooks/usePageTitle'
import { useAuth } from '../../contexts/AuthContext'
import styles from './Auth.module.css'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
  usePageTitle(t('auth.newPassword'))
  const { confirmReset } = useAuth()
  const [searchParams] = useSearchParams()
  const oobCode = searchParams.get('oobCode')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    if (!oobCode) {
      setError(t('auth.invalidLink'))
      return
    }
    try {
      await confirmReset(oobCode, password)
      setDone(true)
    } catch {
      setError(t('auth.resetError'))
    }
  }

  return (
    <div className={styles.wrap}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <div className={styles.brand}>Jilu</div>
        <h1 className={styles.title}>{t('auth.newPassword')}</h1>
        {!done ? (
          <>
            <input
              className={styles.input}
              type="password"
              autoComplete="new-password"
              placeholder={t('auth.newPasswordPlaceholder')}
              aria-label={t('auth.newPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <div role="alert" className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">{t('auth.resetButton')}</button>
          </>
        ) : (
          <p className={styles.success}>{t('auth.resetSuccess')}</p>
        )}
        <Link to="/login" className={styles.switch}>
          {t('auth.backToLogin')}
        </Link>
      </form>
    </div>
  )
}
