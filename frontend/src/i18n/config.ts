import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import enTranslations from './locales/en.json'
import noTranslations from './locales/no.json'
import svTranslations from './locales/sv.json'

i18n
  .use(LanguageDetector) // Detects user language from browser/device
  .use(initReactI18next) // Passes i18n down to react-i18next
  .init({
    resources: {
      sv: {
        translation: svTranslations,
      },
      en: {
        translation: enTranslations,
      },
      no: {
        translation: noTranslations,
      },
    },
    fallbackLng: 'sv', // Default to Swedish
    supportedLngs: ['sv', 'en', 'no'], // Supported languages
    interpolation: {
      escapeValue: false, // React already escapes values
    },
    detection: {
      // Order of detection methods - check localStorage first (user preference), then navigator
      order: ['localStorage', 'navigator', 'cookie', 'htmlTag'],
      // Cache user language preference
      caches: ['localStorage'],
      // Look for language in these keys
      lookupLocalStorage: 'i18nextLng',
      lookupCookie: 'i18next',
      // Convert detected language to supported format (e.g., 'en-US' -> 'en')
      convertDetectedLanguage: (lng: string): string => {
        // Extract base language code (e.g., 'en-US' -> 'en', 'sv-SE' -> 'sv', 'nb-NO' -> 'no')
        const baseLang = lng.split('-')[0].toLowerCase()
        // Map Norwegian variants to 'no'
        if (baseLang === 'nb' || baseLang === 'nn') {
          return 'no'
        }
        // Return base language if supported, otherwise return fallback 'sv'
        return ['sv', 'en', 'no'].includes(baseLang) ? baseLang : 'sv'
      },
    },
  })

export default i18n

