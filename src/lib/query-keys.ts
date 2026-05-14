/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * QUERY KEYS — Định nghĩa tập trung, dùng được ở cả Server và Client
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Tại sao cần file riêng?
 * ─────────────────────────
 * Query keys phải KHỚP CHÍNH XÁC giữa:
 *   - `useQuery({ queryKey: ... })` trong Client Components (hooks)
 *   - `queryClient.setQueryData(key, data)` trong server-fetch.ts (server)
 *
 * Vấn đề: các hooks file (use-workspace.ts, use-channel.ts) có directive
 * `'use client'` ở đầu. Server-only files KHÔNG THỂ import từ 'use client' files
 * → Next.js bundler xử lý chúng riêng biệt → import bị break hoặc undefined.
 *
 * Giải pháp: tách keys ra file KHÔNG có 'use client' và không có 'server-only'
 * → Cả server lẫn client đều có thể import bình thường.
 *
 * Pattern này gọi là "isomorphic" hay "universal" — chạy được ở cả 2 môi trường.
 * Query keys chỉ là plain objects/functions (không dùng browser API hay server API)
 * nên hoàn toàn phù hợp để làm isomorphic.
 */

// ─── Auth / profile (theo workspace) ─────────────────────────────────────────

export const authKeys = {
  me: ['auth', 'me'] as const,
  workspaceProfile: (workspaceId: string) =>
    ['workspace-profile', workspaceId] as const,
}

// ─── Workspace query keys ─────────────────────────────────────────────────────

export const workspaceKeys = {
  /** Danh sách tất cả workspaces của user: useWorkspaces() */
  all: ['workspaces'] as const,

  /** Chi tiết một workspace: useWorkspace(id) */
  detail: (id: string) => ['workspaces', id] as const,

  /** Danh sách members của workspace */
  members: (id: string) => ['workspaces', id, 'members'] as const,

  /** Recent channels/DMs (toolbar) */
  recents: (id: string) => ['workspaces', id, 'recents'] as const,
}

// ─── Message query keys ───────────────────────────────────────────────────────

export const messageKeys = {
  /** Gốc của tất cả message queries */
  all: ['messages'] as const,
  /** Gốc của tất cả thread messages */
  threadsAll: ['thread-messages'] as const,
  /** Gốc của tất cả pinned messages */
  pinnedAll: ['pinned-messages'] as const,
  /** Infinite list của messages trong channel: useMessages(channelId) */
  list: (channelId: string) => ['messages', channelId] as const,
  /** Thread messages của một message (Thread Panel) */
  thread: (messageId: string) => ['thread-messages', messageId] as const,
  /** Infinite list attachment trong channel: useChannelAttachments(channelId) */
  channelAttachments: (channelId: string) =>
    ['messages', channelId, 'attachments'] as const,
  /** Infinite list attachment trong DM conversation */
  conversationAttachments: (conversationId: string) =>
    ['dm-conversations', conversationId, 'attachments'] as const,
  /** Infinite list threads trong workspace */
  threads: (workspaceId: string) => ['workspaces', workspaceId, 'threads'] as const,
  /** Tìm file trong channel (tab Files) — query string `q` đã trim */
  channelFilesSearch: (channelId: string, q: string) =>
    ['messages', channelId, 'files-search', q] as const,

  // ─── Direct Messages ────────────────────────────────────────────────────────
  /** Danh sách các DM conversation của user trong workspace */
  conversations: (workspaceId: string) => ['dm-conversations', workspaceId] as const,
  /** Chi tiết một DM conversation */
  conversationDetail: (conversationId: string) => ['dm-conversations', 'detail', conversationId] as const,
  /** Group DM — ứng viên mời (workspace, chưa trong conversation); `q` đã normalize */
  conversationInviteCandidates: (conversationId: string, q: string) =>
    ['dm-conversations', 'invite-candidates', conversationId, q] as const,
  /** Tìm file trong DM conversation (tab Files) */
  conversationFilesSearch: (conversationId: string, q: string) =>
    ['dm-conversations', conversationId, 'files-search', q] as const,

  /** --- All Files Search (Workspace level) --- */
  allFiles: (workspaceId: string, filters: any) =>
    ['workspaces', workspaceId, 'all-files', filters] as const,
}

// ─── Message drafts (server, đa thiết bị) ─────────────────────────────────────

export const draftKeys = {
  list: (workspaceId: string) => ['message-drafts', workspaceId] as const,
  current: (workspaceId: string, contextKey: string) =>
    ['message-drafts', workspaceId, 'current', contextKey] as const,
}

// ─── Scheduled messages (BullMQ dispatch) ─────────────────────────────────────

export const scheduledMessageKeys = {
  all: (workspaceId: string) => ['scheduled-messages', workspaceId] as const,
  list: (
    workspaceId: string,
    status: 'pending' | 'cancelled' | 'all',
  ) => ['scheduled-messages', workspaceId, status] as const,
}

// ─── Attachment content (code preview cache) ─────────────────────────────────────

export const attachmentContentKeys = {
  /** Nội dung file cho CodePreview — cache theo attachment.id (Virtuoso unmount/remount) */
  detail: (attachmentId: string) => ['attachment-content', attachmentId] as const,
}

// ─── Attachment file blob (PDF, Office preview cache) ──────────────────────────────

export const attachmentFileKeys = {
  /** Blob/ArrayBuffer của file theo URL — cache PDF để không tải lại khi mở lại modal */
  blob: (url: string) => ['attachment-file', url] as const,
}

// ─── Channel query keys ───────────────────────────────────────────────────────

/** Folders theo channel hoặc DM — list + attachment trong từng folder */
export const folderKeys = {
  list: (targetId: string) => ['folders', targetId, 'list'] as const,
  attachments: (targetId: string, folderId: string) =>
    ['folders', targetId, folderId, 'attachments'] as const,
}

export const channelKeys = {
  /** Tất cả channels trong workspace: useChannels(workspaceId) */
  all: (workspaceId: string) => ['channels', workspaceId] as const,

  /** Chi tiết một channel: useChannel(workspaceId, channelId) */
  detail: (workspaceId: string, channelId: string) =>
    ['channels', workspaceId, channelId] as const,

  /**
   * Danh sách members của channel (optional `search` đã trim, debounce phía client).
   */
  members: (workspaceId: string, channelId: string, search?: string) =>
    [
      'channels',
      workspaceId,
      channelId,
      'members',
      search?.trim() ?? '',
    ] as const,
}
