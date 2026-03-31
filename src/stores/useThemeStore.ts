import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type Theme = {
  id?: string
  systemNav: string
  selectedItems: string
  isGradient?: boolean
  fontFamily?: string
}

interface ThemeStore {
  theme: Theme
  savedTheme: Theme
  setTheme: (theme: Theme) => void
  confirmTheme: () => void
  resetTheme: () => void
}

const defaultTheme: Theme = {
  id: '',
  systemNav: '#4a154b',
  selectedItems: '#1164a3',
  isGradient: false,
  fontFamily: 'lato',
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      theme: defaultTheme,
      savedTheme: defaultTheme,
      setTheme: (theme: Theme) => set({ theme }),
      confirmTheme: () => set({ savedTheme: get().theme }),
      resetTheme: () => set({ theme: get().savedTheme }),
    }),
    {
      name: 'slack-clone-theme',
    }
  )
)
