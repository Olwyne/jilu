import { useTranslation } from 'react-i18next'
import LegalLayout from './LegalLayout'

export default function TermsPage() {
  const { t } = useTranslation()
  return (
    <LegalLayout title={t('legal.terms.title')} date={t('legal.date')}>
      <h2>{t('legal.terms.s1.h')}</h2>
      <p>{t('legal.terms.s1.p')}</p>

      <h2>{t('legal.terms.s2.h')}</h2>
      <p>{t('legal.terms.s2.p')}</p>

      <h2>{t('legal.terms.s3.h')}</h2>
      <p>
        {t('legal.terms.s3.p_pre')} <a href="mailto:boyersophie@outlook.com">boyersophie@outlook.com</a>.
      </p>

      <h2>{t('legal.terms.s4.h')}</h2>
      <p>{t('legal.terms.s4.p')}</p>

      <h2>{t('legal.terms.s5.h')}</h2>
      <p>{t('legal.terms.s5.p')}</p>

      <h2>{t('legal.terms.s6.h')}</h2>
      <p>{t('legal.terms.s6.p')}</p>

      <h2>{t('legal.terms.s7.h')}</h2>
      <p>{t('legal.terms.s7.p')}</p>

      <h2>{t('legal.terms.s8.h')}</h2>
      <p>{t('legal.terms.s8.p')}</p>

      <h2>{t('legal.terms.s9.h')}</h2>
      <p>{t('legal.terms.s9.p')}</p>
    </LegalLayout>
  )
}
