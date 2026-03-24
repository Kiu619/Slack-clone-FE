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
}

// ─── Message query keys ───────────────────────────────────────────────────────

export const messageKeys = {
  /** Infinite list của messages trong channel: useMessages(channelId) */
  list: (channelId: string) => ['messages', channelId] as const,
  /** Thread messages của một message */
  thread: (messageId: string) => ['messages', 'thread', messageId] as const,
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

export const channelKeys = {
  /** Tất cả channels trong workspace: useChannels(workspaceId) */
  all: (workspaceId: string) => ['channels', workspaceId] as const,

  /** Chi tiết một channel: useChannel(workspaceId, channelId) */
  detail: (workspaceId: string, channelId: string) =>
    ['channels', workspaceId, channelId] as const,

  /** Danh sách members của channel */
  members: (workspaceId: string, channelId: string) =>
    ['channels', workspaceId, channelId, 'members'] as const,
}
