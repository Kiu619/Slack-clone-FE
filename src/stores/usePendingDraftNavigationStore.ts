import { create } from 'zustand'

export type PendingDraftNavigationPayload = {
  workspaceId: string
  contextKey: string
  html: string
}

type State = {
  pending: PendingDraftNavigationPayload | null
  setPending: (p: PendingDraftNavigationPayload) => void
  /**
   * Trả về HTML nếu có payload khớp workspace + contextKey (và xóa payload).
   * Trả về null nếu không khớp — payload giữ nguyên cho lần điều hướng sau.
   */
  consumeIfMatch: (
    workspaceId: string,
    contextKey: string,
  ) => string | null
}

export const usePendingDraftNavigationStore = create<State>((set, get) => ({
  pending: null,
  setPending: (p) => set({ pending: p }),
  consumeIfMatch: (workspaceId, contextKey) => {
    const { pending } = get()
    if (
      !pending ||
      pending.workspaceId !== workspaceId ||
      pending.contextKey !== contextKey
    ) {
      return null
    }
    set({ pending: null })
    return pending.html
  },
}))
