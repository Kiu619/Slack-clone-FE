import { create } from 'zustand'
import type { User } from '@/lib/types'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'

interface UserStore {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  isProfilePanelOpen: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
  setIsProfilePanelOpen: (isProfilePanelOpen: boolean) => void
}

export const useUserStore = create<UserStore>()(devtools(persist((set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  isProfilePanelOpen: false,
  setUser: (user) =>
    set((state) => ({
      user: user
        ? {
            ...state.user,
            ...user,
            role: user.role ?? state.user?.role ?? null,
          }
        : null,
      isAuthenticated: !!user,
      isLoading: false,
    })),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),
  setIsProfilePanelOpen: (isProfilePanelOpen) => set({ isProfilePanelOpen }),
}), {
  name: 'user',
  storage: createJSONStorage(() => localStorage),
})))
