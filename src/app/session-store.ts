import { create } from 'zustand'
import { createJSONStorage, persist, type StateStorage } from 'zustand/middleware'
import i18n, { type Lang } from '@/i18n'
import type { RoleId } from './roles'

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
  role: RoleId
  lang: Lang
  largeFont: boolean
  sidebarCollapsed: boolean
  setRole: (role: RoleId) => void
  setLang: (lang: Lang) => void
  toggleLargeFont: () => void
  toggleSidebar: () => void
}

function applyLang(lang: Lang) {
  void i18n.changeLanguage(lang)
  document.documentElement.lang = lang
}

function applyLargeFont(on: boolean) {
  document.documentElement.dataset.largeFont = String(on)
}

export const useSession = create<SessionState>()(
  persist(
    (set, get) => ({
      role: 'presenter',
      lang: 'en',
      largeFont: false,
      sidebarCollapsed: false,
      setRole: (role) => set({ role }),
      setLang: (lang) => {
        applyLang(lang)
        set({ lang })
      },
      toggleLargeFont: () => {
        const next = !get().largeFont
        applyLargeFont(next)
        set({ largeFont: next })
      },
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
    }),
    {
      name: 'bhu-aayam-session',
      storage: createJSONStorage(() => safeStorage),
      onRehydrateStorage: () => (state) => {
        if (!state) return
        applyLang(state.lang)
        applyLargeFont(state.largeFont)
      },
    },
  ),
)
