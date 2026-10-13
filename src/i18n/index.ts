import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import { en } from './en'
import { hi } from './hi'

export type Lang = 'en' | 'hi'
const STORAGE_KEY = 'znirmaan.lang'

function savedLang(): Lang {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'hi' ? 'hi' : 'en'
  } catch {
    return 'en'
  }
}

i18n.use(initReactI18next).init({
  resources: { en: { translation: en }, hi: { translation: hi } },
  lng: savedLang(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

function applyLang(lng: string) {
  document.documentElement.lang = lng
  try {
    localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    // Storage can be blocked (private window). The toggle still works for this visit.
  }
}

applyLang(i18n.language)
i18n.on('languageChanged', applyLang)

export default i18n
