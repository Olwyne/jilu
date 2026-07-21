import { useTranslation } from 'react-i18next'
import LegalLayout from './LegalLayout'

export default function PrivacyPage() {
  const { t } = useTranslation()
  return (
    <LegalLayout title={t('legal.privacy.title')} date={t('legal.date')}>
      <h2>{t('legal.privacy.s1.h')}</h2>
      <p>
        {t('legal.privacy.s1.editor')} <strong>Sophie Boyer</strong>
        {t('legal.privacy.s1.contact')} <a href="mailto:boyersophie@outlook.com">boyersophie@outlook.com</a>.
      </p>

      <h2>{t('legal.privacy.s2.h')}</h2>
      <p>{t('legal.privacy.s2.intro')}</p>
      <ul>
        <li>{t('legal.privacy.s2.li1')}</li>
        <li>{t('legal.privacy.s2.li2')}</li>
        <li>{t('legal.privacy.s2.li3')}</li>
      </ul>
      <p>{t('legal.privacy.s2.note')}</p>

      <h2>{t('legal.privacy.s3.h')}</h2>
      <ul>
        <li>{t('legal.privacy.s3.li1')}</li>
        <li>{t('legal.privacy.s3.li2')}</li>
      </ul>

      <h2>{t('legal.privacy.s4.h')}</h2>
      <p>{t('legal.privacy.s4.vercel')}</p>
      <p>{t('legal.privacy.s4.firebase')}</p>
      <p>{t('legal.privacy.s4.note')}</p>

      <h2>{t('legal.privacy.s5.h')}</h2>
      <p>{t('legal.privacy.s5.p')}</p>

      <h2>{t('legal.privacy.s6.h')}</h2>
      <p>{t('legal.privacy.s6.intro')}</p>
      <ul>
        <li>{t('legal.privacy.s6.li1')}</li>
        <li>{t('legal.privacy.s6.li2')}</li>
        <li>{t('legal.privacy.s6.li3')}</li>
        <li>{t('legal.privacy.s6.li4')}</li>
        <li>{t('legal.privacy.s6.li5')}</li>
      </ul>
      <p>
        {t('legal.privacy.s6.contact_pre')} <a href="mailto:boyersophie@outlook.com">boyersophie@outlook.com</a>
        {t('legal.privacy.s6.contact_mid')} <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">CNIL</a>.
      </p>

      <h2>{t('legal.privacy.s7.h')}</h2>
      <p>{t('legal.privacy.s7.p')}</p>
    </LegalLayout>
  )
}
