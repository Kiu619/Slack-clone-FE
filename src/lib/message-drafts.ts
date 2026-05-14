/**
 * Quy ước contextKey draft (đồng bộ với backend) + session restore / điều hướng.
 * Persist nội dung draft: API — xem `message-drafts-api.ts`.
 */

export const MESSAGE_DRAFT_RESTORE_SESSION_KEY = 'sc-restore-draft-payload'

/** Prefill New message composer sau khi mở từ danh sách draft */
export const NEW_MSG_RESTORE_CHANNEL_KEY = 'sc-new-msg-restore-channel'
export const NEW_MSG_RESTORE_DM_KEY = 'sc-new-msg-restore-dm'

export type MessageDraftContextKey = string

export function buildMessageDraftContextKey(params: {
  workspaceId: string
  channelId?: string | null
  conversationId?: string | null
  parentId?: string | null
  isNewMessageMode?: boolean
}): MessageDraftContextKey {
  const {
    workspaceId,
    channelId,
    conversationId,
    parentId,
    isNewMessageMode,
  } = params

  if (parentId && (channelId || conversationId)) {
    const t = channelId ? `ch:${channelId}` : `dm:${conversationId}`
    return `ws:${workspaceId}:${t}:thread:${parentId}`
  }
  if (isNewMessageMode && channelId) {
    return `ws:${workspaceId}:ch:${channelId}:compose:new`
  }
  if (isNewMessageMode && conversationId) {
    return `ws:${workspaceId}:dm:${conversationId}:compose:new`
  }
  if (isNewMessageMode && !channelId && !conversationId) {
    return `ws:${workspaceId}:compose:new`
  }
  if (channelId) return `ws:${workspaceId}:ch:${channelId}`
  if (conversationId) return `ws:${workspaceId}:dm:${conversationId}`
  return `ws:${workspaceId}:unknown`
}

export type MessageDraftSummary = {
  contextKey: MessageDraftContextKey
  html: string
  updatedAt: number
  workspaceId: string
  channelId?: string
  conversationId?: string
  parentId?: string
  isComposeNew?: boolean
  isThread: boolean
}

export function previewPlainFromDraftHtml(html: string, maxLen = 80): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\u00a0/g, ' ')
    .trim()
  if (text.length <= maxLen) return text
  return `${text.slice(0, maxLen)}…`
}

function parseContextKey(
  contextKey: MessageDraftContextKey,
): Omit<MessageDraftSummary, 'html' | 'updatedAt'> | null {
  const wsMatch = /^ws:([^:]+):(.+)$/.exec(contextKey)
  if (!wsMatch) return null
  const workspaceId = wsMatch[1]
  const rest = wsMatch[2]

  const threadCh = /^ch:([^:]+):thread:([^:]+)$/.exec(rest)
  if (threadCh) {
    return {
      contextKey,
      workspaceId,
      channelId: threadCh[1],
      parentId: threadCh[2],
      isThread: true,
    }
  }
  const threadDm = /^dm:([^:]+):thread:([^:]+)$/.exec(rest)
  if (threadDm) {
    return {
      contextKey,
      workspaceId,
      conversationId: threadDm[1],
      parentId: threadDm[2],
      isThread: true,
    }
  }

  const composeNewCh = /^ch:([^:]+):compose:new$/.exec(rest)
  if (composeNewCh) {
    return {
      contextKey,
      workspaceId,
      channelId: composeNewCh[1],
      isComposeNew: true,
      isThread: false,
    }
  }
  const composeNewDm = /^dm:([^:]+):compose:new$/.exec(rest)
  if (composeNewDm) {
    return {
      contextKey,
      workspaceId,
      conversationId: composeNewDm[1],
      isComposeNew: true,
      isThread: false,
    }
  }
  if (rest === 'compose:new') {
    return { contextKey, workspaceId, isComposeNew: true, isThread: false }
  }

  const ch = /^ch:([^:]+)$/.exec(rest)
  if (ch) {
    return { contextKey, workspaceId, channelId: ch[1], isThread: false }
  }
  const dm = /^dm:([^:]+)$/.exec(rest)
  if (dm) {
    return {
      contextKey,
      workspaceId,
      conversationId: dm[1],
      isThread: false,
    }
  }
  if (rest === 'unknown') {
    return { contextKey, workspaceId, isThread: false }
  }
  return null
}

/** Map bản ghi API → summary cho UI danh sách draft */
export function serverDraftToSummary(row: {
  contextKey: string
  content: string
  updatedAt: string
}): MessageDraftSummary | null {
  const parsed = parseContextKey(row.contextKey)
  const ts = new Date(row.updatedAt).getTime()
  if (Number.isNaN(ts)) return null
  if (!parsed) {
    return {
      contextKey: row.contextKey,
      html: row.content,
      updatedAt: ts,
      workspaceId: '',
      isThread: false,
    }
  }
  return {
    ...parsed,
    html: row.content,
    updatedAt: ts,
  }
}

export function setRestoreDraftSessionPayload(payload: {
  contextKey: MessageDraftContextKey
  html: string
}) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      MESSAGE_DRAFT_RESTORE_SESSION_KEY,
      JSON.stringify(payload),
    )
  } catch {
    /* noop */
  }
}

export function buildOpenThreadSearch(parentMessageId: string) {
  const params = new URLSearchParams()
  params.set('openThreadParent', parentMessageId)
  return `?${params.toString()}`
}
