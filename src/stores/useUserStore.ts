import { create } from 'zustand'
import type { User } from '@/lib/types'
import { devtools, persist, createJSONStorage } from 'zustand/middleware'

interface UserStore {
  user: User | null
  isLoading: boolean
  isAuthenticated: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  clearUser: () => void
}

export const useUserStore = create<UserStore>()(devtools(persist( (set) => ({
  user: null,
  isLoading: true,
  isAuthenticated: false,
  setUser: (user) =>
    set({ user, isAuthenticated: !!user, isLoading: false }),
  setLoading: (isLoading) => set({ isLoading }),
  clearUser: () =>
    set({ user: null, isAuthenticated: false, isLoading: false }),
}), {
  name: 'user',
  storage: createJSONStorage(() => localStorage),
})))
