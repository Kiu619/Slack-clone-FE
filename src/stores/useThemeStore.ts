import { create } from 'zustand'

export type Theme = {
  id?: string
  systemNav: string
  selectedItems: string
  isGradient?: boolean
  fontFamily?: string
}

export const defaultTheme: Theme = {
  id: '',
  systemNav: '#4a154b',
  selectedItems: '#1164a3',
  isGradient: false,
  fontFamily: 'lato',
}

interface ThemeStore {
  scope: string
  theme: Theme
  savedTheme: Theme
  setScope: (scope: string, initialTheme?: Theme) => void
  setTheme: (theme: Theme) => void
  confirmTheme: () => void
  resetTheme: () => void
}

const THEME_STORAGE_PREFIX = 'slack-clone-theme'

function getThemeStorageKey(scope: string) {
  return `${THEME_STORAGE_PREFIX}:${scope}`
}

function persistTheme(scope: string, theme: Theme) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(getThemeStorageKey(scope), JSON.stringify(theme))
  } catch {
    // Ignore storage failures such as private mode / quota issues.
  }
}

export const useThemeStore = create<ThemeStore>()((set, get) => ({
  scope: 'global',
  theme: defaultTheme,
  savedTheme: defaultTheme,
  setScope: (scope: string, initialTheme = defaultTheme) => {
    set({
      scope,
      theme: initialTheme,
      savedTheme: initialTheme,
    })

    persistTheme(scope, initialTheme)
  },
  setTheme: (theme: Theme) => set({ theme }),
  confirmTheme: () => {
    const { scope, theme } = get()
    set({ savedTheme: theme })
    persistTheme(scope, theme)
  },
  resetTheme: () => set({ theme: get().savedTheme }),
}))
