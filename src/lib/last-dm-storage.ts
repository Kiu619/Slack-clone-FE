const PREFIX = 'slack-clone:last-dm:'

const key = (workspaceId: string) => `${PREFIX}${workspaceId}`

export const getLastDmConversationId = (workspaceId: string): string | null => {
  if (typeof window === 'undefined') return null
  try {
    const v = window.localStorage.getItem(key(workspaceId))
    return v && v.length > 0 ? v : null
  } catch {
    return null
  }
}

export const setLastDmConversationId = (
  workspaceId: string,
  conversationId: string,
) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(key(workspaceId), conversationId)
  } catch {
    /* quota / private mode */
  }
}

export const clearLastDmConversationId = (workspaceId: string) => {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.removeItem(key(workspaceId))
  } catch {
    /* ignore */
  }
}
