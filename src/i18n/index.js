import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import en from './en.json'
import fr from './fr.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fr: { translation: fr },
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'fr'],
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      cacheUserLanguage: true,
    },
  })

i18n.on('initialized', () => {
  document.documentElement.lang = i18n.language?.startsWith('fr') ? 'fr' : 'en'
})

i18n.on('languageChanged', (lng) => {
  document.documentElement.lang = lng.startsWith('fr') ? 'fr' : 'en'
})

export default i18n
