import '@testing-library/jest-dom'
import './i18n/index.js'
import i18n from './i18n/index.js'
i18n.changeLanguage('en')

// firebase.js s'initialise à l'import : une fausse clé suffit pour les tests (aucun appel réseau)
import { vi } from 'vitest'
vi.stubEnv('VITE_FIREBASE_API_KEY', 'test-api-key')
vi.stubEnv('VITE_FIREBASE_PROJECT_ID', 'demo-jilu')
