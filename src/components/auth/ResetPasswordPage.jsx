import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../contexts/AuthContext'
import styles from './ResetPasswordPage.module.css'

export default function ResetPasswordPage() {
  const { t } = useTranslation()
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
              placeholder={t('auth.newPasswordPlaceholder')}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit">{t('auth.resetButton')}</button>
          </>
        ) : (
          <p className={styles.success}>{t('auth.resetSuccess')}</p>
        )}
        <div className={styles.switch} onClick={() => navigate('/login')}>
          {t('auth.backToLogin')}
        </div>
      </form>
    </div>
  )
}
