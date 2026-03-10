import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

type CreateWorkSpaceValues = {
  name: string
  imageUrl: string
  imageFile: File | null
  emails: string[]
  currentEmail: string
  invite_code: string
  updateInviteCode: (code: string) => void
  updateImageUrl: (url: string) => void
  updateImageFile: (file: File | null) => void
  updateValues: (values: Partial<CreateWorkSpaceValues>) => void
  addEmail: (email: string) => void
  removeEmail: (email: string) => void
  setCurrentEmail: (email: string) => void
  currStep: number
  setCurrStep: (step: number) => void
  resetWorkspace: () => void
}

export const useCreateWorkspaceValues = create<CreateWorkSpaceValues>()(
  persist(
    (set) => ({
      name: '',
      imageUrl: '',
      imageFile: null,
      emails: [],
      currentEmail: '',
      invite_code: '',
      currStep: 1,
      updateInviteCode: (code) => set({ invite_code: code }),
      updateImageUrl: (url) => set({ imageUrl: url }),
      updateImageFile: (file) => set({ imageFile: file }),
      updateValues: (values) => set(values),
      addEmail: (email) => set(state => ({
        emails: [...state.emails, email],
        currentEmail: ''
      })),
      removeEmail: (email) => set(state => ({
        emails: state.emails.filter(e => e !== email)
      })),
      setCurrentEmail: (email) => set({ currentEmail: email }),
      setCurrStep: (step) => set({ currStep: step }),
      resetWorkspace: () => set({
        name: '',
        imageUrl: '',
        imageFile: null,
        emails: [],
        currentEmail: '',
        invite_code: '',
        currStep: 1
      })
    }),
    {
      name: 'slack-clone-workspace',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        name: state.name,
        imageUrl: state.imageUrl,
        emails: state.emails,
        currentEmail: state.currentEmail,
        invite_code: state.invite_code,
        currStep: state.currStep
        // Không persist imageFile vì File object không thể serialize
      })
    }
  )
)
