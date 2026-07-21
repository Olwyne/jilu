import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import LegalLayout from './LegalLayout'

export default function LegalNoticePage() {
  const { t } = useTranslation()
  return (
    <LegalLayout title={t('legal.notice.title')} date={t('legal.date')}>
      <h2>{t('legal.notice.s1.h')}</h2>
      <p>
        <strong>{t('legal.notice.s1.name_label')}</strong> Sophie Boyer<br />
        <strong>{t('legal.notice.s1.status_label')}</strong> {t('legal.notice.s1.status_val')}<br />
        <strong>{t('legal.notice.s1.email_label')}</strong>{' '}
        <a href="mailto:boyersophie@outlook.com">boyersophie@outlook.com</a>
      </p>

      <h2>{t('legal.notice.s2.h')}</h2>
      <p>Sophie Boyer</p>

      <h2>{t('legal.notice.s3.h')}</h2>
      <p>
        <strong>{t('legal.notice.s3.vercel_label')}</strong><br />
        {t('legal.notice.s3.vercel_p').split('\n').map((line, i) => (
          <span key={i}>{line}<br /></span>
        ))}
        <a href="https://vercel.com" target="_blank" rel="noopener noreferrer">vercel.com</a>
      </p>
      <p style={{ marginTop: '1rem' }}>
        <strong>{t('legal.notice.s3.firebase_label')}</strong><br />
        {t('legal.notice.s3.firebase_p').split('\n').map((line, i) => (
          <span key={i}>{line}<br /></span>
        ))}
        <a href="https://firebase.google.com" target="_blank" rel="noopener noreferrer">firebase.google.com</a>
      </p>

      <h2>{t('legal.notice.s4.h')}</h2>
      <p>{t('legal.notice.s4.p')}</p>

      <h2>{t('legal.notice.s5.h')}</h2>
      <p>
        {t('legal.notice.s5.p_pre')}{' '}
        <Link to="/privacy">{t('legal.notice.s5.p_link')}</Link>.
      </p>

      <h2>{t('legal.notice.s6.h')}</h2>
      <p>
        {t('legal.notice.s6.p')} <a href="mailto:boyersophie@outlook.com">boyersophie@outlook.com</a>
      </p>
    </LegalLayout>
  )
}
