// Langue utilisée par les modules de catalogue. Navigateur : branchée sur i18n (src/i18n/index.js).
// Serveur : français par défaut (langue de l'application).
let provider = () => 'fr'

export const currentLanguage = () => provider()

export function setLanguageProvider(fn) {
  provider = fn
}
