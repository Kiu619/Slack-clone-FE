import type { User } from '@/lib/types'
import { create } from 'zustand'

interface ProfilePanelStore {
  userData: User | null
  workspaceId: string | null
  isOpen: boolean
  open: ({ userData, workspaceId }: { userData: User; workspaceId: string }) => void
  close: () => void
}

export const useProfilePanelStore = create<ProfilePanelStore>((set) => ({
  userData: null,
  workspaceId: null,
  isOpen: false,
  open: ({ userData, workspaceId }) => set({ userData, workspaceId, isOpen: true }),
  close: () => set({ isOpen: false, userData: null, workspaceId: null }),
}))
