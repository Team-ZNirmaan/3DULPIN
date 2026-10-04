import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import i18n, { type Lang } from '@/i18n'

const safeStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name)
    } catch {
      return null
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value)
    } catch {
      /* storage unavailable: session-only */
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name)
    } catch {
      /* ignore */
    }
  },
}

interface SessionState {
  lang: Lang
  setLang: (lang: Lang) => void
}

function applyLang(lang: Lang) {
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      lang: 'en',
      setLang: (lang) => {
        applyLang(lang)
        set({ lang })
      },
    }),
    {
      name: 'bhu-aayam-p2-session',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (state) applyLang(state.lang)
      },
    },
  ),
)
