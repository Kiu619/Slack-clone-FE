import { apiClient } from "@/lib/axios"
import type {
  AccountUser,
  Channel,
  ChannelAttachmentsPage,
  ChannelFolder,
  ChannelMembersDirectory,
  DirectMessageConversation,
  Message,
  MessageAttachment,
  MessagesPage,
  ThreadsPage,
  UpdateChannelPayload,
  UploadFileToFolderDto,
  User,
  WorkspaceMember,
  WorkspaceMemberStatus,
  NotificationsPage,
  Notification,
  ChannelFileHit,
  ChannelMember,
  DmInviteCandidate,
  SavedItem,
  SavedItemsPage,
  SaveItemPayload,
  UpdateSavedItemPayload,
  UpdateConversationPayload,
} from "@/lib/types"

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getUserApi = async () => {
  const res = await apiClient.get<AccountUser>('/auth/me')
  return res.data
}

export const magicLinkVerifyApi = async (token: string) => {
  const res = await apiClient.post<{ user: AccountUser }>(
    '/auth/magic-link/verify',
    { token },
  )
  return res.data.user
}

export const signOutApi = async () => {
  const res = await apiClient.post('/auth/sign-out')
  return res.data
}

// ─── User Profile (theo workspace) ───────────────────────────────────────────

export const getWorkspaceProfileApi = async (workspaceId: string) => {
  const res = await apiClient.get<User>('/user-profile/me', {
    params: { workspaceId },
  })
  return res.data
}

export type UpdateProfilePayload = {
  name?: string
  displayName?: string
  namePronunciation?: string | null
  timeZone?: string | null
  avatar?: string | null
  isAway?: boolean
  status?: string | null
  theme?: string | null
}

export type UpdateContactPayload = {
  phone?: string | null
}

export type UpdateAboutMePayload = {
  description?: string | null
}

export const updateProfileApi = async (
  workspaceId: string,
  payload: UpdateProfilePayload,
) => {
  const res = await apiClient.patch<User>('/user-profile/profile', payload, {
    params: { workspaceId },
  })
  return res.data
}

export const updateContactApi = async (
  workspaceId: string,
  payload: UpdateContactPayload,
) => {
  const res = await apiClient.patch<User>('/user-profile/contact', payload, {
    params: { workspaceId },
  })
  return res.data
}

export const updateAboutMeApi = async (
  workspaceId: string,
  payload: UpdateAboutMePayload,
) => {
  const res = await apiClient.patch<User>('/user-profile/about-me', payload, {
    params: { workspaceId },
  })
  return res.data
}

// ─── Workspace Member Status ──────────────────────────────────────────────────

export type UpdateMemberStatusPayload = {
  statusText?: string | null
  statusEmoji?: string | null
  statusExpiration?: string | null
  notificationsPausedUntil?: string | null
}

export const updateMemberStatusApi = async (
  workspaceId: string,
  payload: UpdateMemberStatusPayload,
) => {
  const res = await apiClient.patch(
    `/workspaces/${workspaceId}/member/status`,
    payload,
  )
  return res.data
}

export const getMemberStatusApi = async (workspaceId: string, userId: string) => {
  const res = await apiClient.get<WorkspaceMemberStatus>(
    `/workspaces/${workspaceId}/members/${userId}/status`,
  )
  return res.data
}

export const clearMemberStatusApi = async (workspaceId: string) => {
  const res = await apiClient.delete(
    `/workspaces/${workspaceId}/member/status`,
  )
  return res.data
}

// ─── Workspace recents (toolbar history) ─────────────────────────────────────

export type WorkspaceRecentItem = {
  kind: 'channel' | 'dm'
  id: string
  visitedAt: string
}

export type WorkspaceRecentsResponse = {
  items: WorkspaceRecentItem[]
}

export const getWorkspaceRecentsApi = async (workspaceId: string) => {
  const res = await apiClient.get<WorkspaceRecentsResponse>(
    `/workspaces/${workspaceId}/recents`,
  )
  return res.data
}

export const postWorkspaceRecentVisitApi = async (
  workspaceId: string,
  body: { kind: 'channel' | 'dm'; id: string },
) => {
  const res = await apiClient.post<WorkspaceRecentsResponse>(
    `/workspaces/${workspaceId}/recents/visit`,
    body,
  )
  return res.data
}

/** GET /workspaces/:id/members — danh sách member workspace */
export const fetchWorkspaceMembersApi = async (workspaceId: string) => {
  const res = await apiClient.get<WorkspaceMember[]>(
    `/workspaces/${workspaceId}/members`,
  )
  return res.data
}

/** POST /workspaces/:id/invite-emails — gửi email mời workspace (Resend) */
export const sendWorkspaceInviteEmailsApi = async (
  workspaceId: string,
  emails: string[],
  channelId?: string,
) => {
  const res = await apiClient.post<{
    sent: number
    skipped: number
    failed: { email: string; message: string }[]
  }>(`/workspaces/${workspaceId}/invite-emails`, {
    emails,
    ...(channelId ? { channelId } : {}),
  })
  return res.data
}

// ─── Channels (workspace) ─────────────────────────────────────────────────────

export const updateChannelApi = async (
  workspaceId: string,
  channelId: string,
  payload: UpdateChannelPayload,
) => {
  const res = await apiClient.patch<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}`,
    payload,
  )
  return res.data
}

export const starChannelApi = async (
  workspaceId: string,
  channelId: string,
  socketHeaders?: Record<string, string>,
) => {
  const res = await apiClient.put<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}/star`,
    undefined,
    socketHeaders?.['x-socket-id']
      ? { headers: { 'x-socket-id': socketHeaders['x-socket-id'] } }
      : undefined,
  )
  return res.data
}

export const unstarChannelApi = async (
  workspaceId: string,
  channelId: string,
  socketHeaders?: Record<string, string>,
) => {
  const res = await apiClient.delete<Channel>(
    `/workspaces/${workspaceId}/channels/${channelId}/star`,
    socketHeaders?.['x-socket-id']
      ? { headers: { 'x-socket-id': socketHeaders['x-socket-id'] } }
      : undefined,
  )
  return res.data
}

export const getChannelMemberStatusApi = async (
  workspaceId: string,
  channelId: string,
) => {
  const res = await apiClient.get<{ isMember: boolean }>(
    `/workspaces/${workspaceId}/channels/${channelId}/member-status`,
  )
  return res.data
}

/** GET .../channels/:channelId/members?search= */
export const fetchChannelMembersApi = async (
  workspaceId: string,
  channelId: string,
  search?: string,
) => {
  const params: Record<string, string> = {}
  const q = search?.trim()
  if (q) params.search = q
  const res = await apiClient.get<ChannelMembersDirectory>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
    { params },
  )
  return res.data
}

export const addChannelMemberApi = async (
  workspaceId: string,
  channelId: string,
  userId: string,
) => {
  const res = await apiClient.post<{ ok: boolean }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members`,
    { userId },
  )
  return res.data
}

/** POST .../channels/:channelId/members/bulk — thêm mọi workspace member chưa có trong channel */
export const addAllChannelMembersBulkApi = async (
  workspaceId: string,
  channelId: string,
) => {
  const res = await apiClient.post<{ added: number }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members/bulk`,
  )
  return res.data
}

export const removeChannelMemberApi = async (
  workspaceId: string,
  channelId: string,
  memberUserId: string,
) => {
  const res = await apiClient.delete<{ ok: boolean }>(
    `/workspaces/${workspaceId}/channels/${channelId}/members/${memberUserId}`,
  )
  return res.data
}

// ─── Direct Messages ──────────────────────────────────────────────────────────

export const fetchDirectMessagesApi = async (workspaceId: string, q?: string) => {
  const res = await apiClient.get<DirectMessageConversation[]>(
    `/workspaces/${workspaceId}/direct-messages`,
    { params: { q: q?.trim() } }
  )
  return res.data
}

export const getOrCreateDirectMessageApi = async (
  workspaceId: string,
  userIds: string[],
) => {
  const res = await apiClient.post<DirectMessageConversation>(
    `/workspaces/${workspaceId}/direct-messages`,
    { workspaceId, userIds },
  )
  return res.data
}

export const updateConversationApi = async (
  workspaceId: string,
  conversationId: string,
  payload: UpdateConversationPayload,
) => {
  const res = await apiClient.patch<DirectMessageConversation>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}`,
    payload,
  )
  return res.data
}

export const starConversationApi = async (
  workspaceId: string,
  conversationId: string,
  socketHeaders?: Record<string, string>,
) => {
  const res = await apiClient.put<DirectMessageConversation>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}/star`,
    undefined,
    socketHeaders?.['x-socket-id']
      ? { headers: { 'x-socket-id': socketHeaders['x-socket-id'] } }
      : undefined,
  )
  return res.data
}

export const unstarConversationApi = async (
  workspaceId: string,
  conversationId: string,
  socketHeaders?: Record<string, string>,
) => {
  const res = await apiClient.delete<DirectMessageConversation>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}/star`,
    socketHeaders?.['x-socket-id']
      ? { headers: { 'x-socket-id': socketHeaders['x-socket-id'] } }
      : undefined,
  )
  return res.data
}

/** GET .../direct-messages/:conversationId/invite-candidates?q= */
export const fetchDmInviteCandidatesApi = async (
  workspaceId: string,
  conversationId: string,
  q?: string,
) => {
  const params: Record<string, string> = {}
  const trimmed = q?.trim()
  if (trimmed) params.q = trimmed
  const res = await apiClient.get<DmInviteCandidate[]>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}/invite-candidates`,
    { params },
  )
  return res.data
}

export const addConversationMembersApi = async (
  workspaceId: string,
  conversationId: string,
  userIds: string[],
) => {
  const res = await apiClient.post<DirectMessageConversation>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}/members`,
    { userIds },
  )
  return res.data
}

export const fetchDirectMessageMessagesApi = async (
  workspaceId: string,
  conversationId: string,
  cursor?: string,
) => {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<MessagesPage>(
    `/workspaces/${workspaceId}/direct-messages/${conversationId}/messages`,
    { params },
  )
  return res.data
}

// ─── Messages ─────────────────────────────────────────────────────────────────

export const getMessageByIdApi = async (messageId: string) => {
  const res = await apiClient.get<Message>(`/messages/${messageId}`)
  return res.data
}

export type ForwardMessageDestination =
  | { type: "channel"; channelId: string }
  | { type: "conversation"; conversationId: string }

export const forwardMessageApi = async (
  messageId: string,
  body: { destinations: ForwardMessageDestination[]; commentary?: string },
  config?: { headers?: Record<string, string> },
) => {
  const res = await apiClient.post<{ messages: Message[] }>(
    `/messages/${messageId}/forward`,
    body,
    config,
  )
  return res.data
}

export const updateMessageApi = async (messageId: string, content: string) => {
  const res = await apiClient.patch<{ id: string; content: string; editedAt: string }>(
    `/messages/${messageId}`,
    { content },
  )
  return res.data
}

export const deleteMessageApi = async (messageId: string) => {
  const res = await apiClient.delete<{ messageId: string; channelId: string; deleted: boolean }>(
    `/messages/${messageId}`,
  )
  return res.data
}

export const togglePinMessageApi = async (messageId: string) => {
  const res = await apiClient.patch<{ messageId: string; isPinned: boolean; room: string }>(
    `/messages/${messageId}/pin`,
  )
  return res.data
}

export const fetchPinnedChannelMessagesApi = async (channelId: string) => {
  const res = await apiClient.get<Message[]>(`/channels/${channelId}/pinned`)
  return res.data
}

export const fetchPinnedConversationMessagesApi = async (conversationId: string) => {
  const res = await apiClient.get<Message[]>(`/direct-messages/${conversationId}/pinned`)
  return res.data
}

export type ChannelFileSearchHit = {
  attachment: MessageAttachment
  message: Message
}

/** GET /channels/:channelId/attachments?cursor= */
export const listChannelAttachmentsApi = async (
  channelId: string,
  cursor?: string,
) => {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<ChannelAttachmentsPage>(
    `/channels/${channelId}/attachments`,
    { params },
  )
  return res.data
}

export type ChannelFileSearchResponse = {
  results: ChannelFileSearchHit[]
}

/** GET /workspaces/:workspaceId/direct-messages/:conversationId/attachments?cursor= */
export const listConversationAttachmentsApi = async (
  workspaceId: string,
  conversationId: string,
  cursor?: string,
) => {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<ChannelAttachmentsPage>(
    `direct-messages/${conversationId}/attachments`,
    { params },
  )
  return res.data
}

/** GET /workspaces/:workspaceId/direct-messages/:conversationId/files/search?q= */
export const searchConversationFilesApi = async (
  workspaceId: string,
  conversationId: string,
  q: string,
) => {
  const res = await apiClient.get<ChannelFileSearchResponse>(
    `direct-messages/${conversationId}/files/search`,
    { params: { q: q.trim() } },
  )
  return res.data
}

/** GET /channels/:channelId/files/search?q= — tìm attachment theo tên trong channel */
export const searchChannelFilesApi = async (channelId: string, q: string) => {
  const res = await apiClient.get<ChannelFileSearchResponse>(
    `/channels/${channelId}/files/search`,
    { params: { q: q.trim() } },
  )
  return res.data
}

/** POST sau khi client upload file lên S3/Cloudinary (cùng flow useFileUpload). */
export const uploadFileToFolderApi = async (
  targetId: string,
  folderId: string,
  dto: UploadFileToFolderDto,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.post<{ messageId: string; attachment: MessageAttachment }>(
    `/${prefix}/${targetId}/folders/${folderId}/files`,
    dto,
  )
  return res.data
}

// ─── Channel folders ──────────────────────────────────────────────────────────

export type ChannelFoldersListResponse = { folders: ChannelFolder[] }

export const listChannelFoldersApi = async (targetId: string, isDM = false) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.get<ChannelFoldersListResponse>(
    `/${prefix}/${targetId}/folders`,
  )
  return res.data
}

export const createChannelFolderApi = async (
  targetId: string,
  name: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.post<{ folder: ChannelFolder }>(
    `/${prefix}/${targetId}/folders`,
    { name },
  )
  return res.data
}

export const renameChannelFolderApi = async (
  targetId: string,
  folderId: string,
  name: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.patch<{ folder: ChannelFolder }>(
    `/${prefix}/${targetId}/folders/${folderId}`,
    { name },
  )
  return res.data
}

export const deleteChannelFolderApi = async (
  targetId: string,
  folderId: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.delete<{ deleted: boolean; folderId: string }>(
    `/${prefix}/${targetId}/folders/${folderId}`,
  )
  return res.data
}

export const listFolderAttachmentsApi = async (
  targetId: string,
  folderId: string,
  cursor?: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<ChannelAttachmentsPage>(
    `/${prefix}/${targetId}/folders/${folderId}/attachments`,
    { params },
  )
  return res.data
}

export const addAttachmentToFolderApi = async (
  targetId: string,
  folderId: string,
  attachmentId: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.post<{
    ok: boolean
    folderId: string
    attachmentId: string
  }>(`/${prefix}/${targetId}/folders/${folderId}/attachments`, {
    attachmentId,
  })
  return res.data
}

export const removeAttachmentFromFolderApi = async (
  targetId: string,
  folderId: string,
  attachmentId: string,
  isDM = false,
) => {
  const prefix = isDM ? 'direct-messages' : 'channels'
  const res = await apiClient.delete<{ ok: boolean }>(
    `/${prefix}/${targetId}/folders/${folderId}/attachments/${attachmentId}`,
  )
  return res.data
}

// ─── Attachments ──────────────────────────────────────────────────────────────

export const deleteAttachmentApi = async (attachmentId: string) => {
  const res = await apiClient.delete<{ success: boolean; messageId: string; channelId: string; attachmentId: string }>(
    `/attachments/${attachmentId}`,
  )
  return res.data
}

  /** GET /attachments — Tìm kiếm file trong workspace với đầy đủ bộ lọc */
export const searchAttachmentsApi = async (params: {
  workspaceId: string
  scope?: 'all' | 'created_by_me' | 'shared_with_me'
  categories?: string
  sort?: 'recent_viewed' | 'last_updated' | 'newest'
  userIds?: string
  channelIds?: string
  conversationIds?: string
  dateFrom?: string
  dateTo?: string
  limit?: number
  offset?: number
  name?: string
}) => {
  const res = await apiClient.get<ChannelFileHit[]>('/attachments', { params })
  return res.data
}

/** POST /attachments/:id/view — Đánh dấu đã xem file */
export const trackAttachmentViewApi = async (id: string, workspaceId: string) => {
  const res = await apiClient.post(`/attachments/${id}/view`, {}, {
    params: { workspaceId },
  })
  return res.data
}

export const getNotificationsApi = async (workspaceId: string, limit = 20, cursor?: string) => {
  const res = await apiClient.get<NotificationsPage>('/notifications', {
    params: { workspaceId, limit, cursor }
  })
  return res.data
}

export const markAsReadApi = async (notificationId: string) => {
  const res = await apiClient.patch<Notification>(`/notifications/${notificationId}/read`)
  return res.data
}

export const markAllAsReadApi = async (workspaceId: string) => {
  const res = await apiClient.patch<{ success: boolean }>(`/notifications/read-all`, {}, {
    params: { workspaceId }
  })
  return res.data
}

// ─── Threads ──────────────────────────────────────────────────────────────────

export const fetchThreadsApi = async (workspaceId: string, cursor?: string) => {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<ThreadsPage>(
    `/workspaces/${workspaceId}/threads`,
    { params },
  )
  return res.data
}

export const markThreadAsReadApi = async (parentId: string) => {
  const res = await apiClient.patch<{ success: boolean }>(
    `/messages/${parentId}/threads/read`,
  )
  return res.data
}

// ─── Later (Saved Items) ──────────────────────────────────────────────────────

export const getSavedItemsApi = async (
  workspaceId: string,
  status?: 'in_progress' | 'completed' | 'archived',
  cursor?: string,
  limit = 20,
  hideUpcoming?: boolean,
) => {
  const res = await apiClient.get<SavedItemsPage>(
    `/workspaces/${workspaceId}/later`,
    { params: { status, cursor, limit, hideUpcoming } },
  )
  return res.data
}

export const saveItemApi = async (
  workspaceId: string,
  payload: SaveItemPayload,
) => {
  const res = await apiClient.post<SavedItem>(
    `/workspaces/${workspaceId}/later`,
    payload,
  )
  return res.data
}

export const checkLaterMessagesApi = async (
  workspaceId: string,
  messageIds: string[],
) => {
  const res = await apiClient.post<{
    savedMessageIds: string[]
    remindAtByMessageId?: Record<string, string>
  }>(`/workspaces/${workspaceId}/later/check-messages`, { messageIds })
  return res.data
}

export const removeLaterByMessageIdApi = async (
  workspaceId: string,
  messageId: string,
) => {
  const res = await apiClient.delete<{ success: true; removed: number }>(
    `/workspaces/${workspaceId}/later/messages/${messageId}`,
  )
  return res.data
}

export const updateSavedItemApi = async (
  workspaceId: string,
  itemId: string,
  payload: UpdateSavedItemPayload,
) => {
  const res = await apiClient.patch<SavedItem>(
    `/workspaces/${workspaceId}/later/${itemId}`,
    payload,
  )
  return res.data
}

export const removeSavedItemApi = async (
  workspaceId: string,
  itemId: string,
) => {
  const res = await apiClient.delete<{ success: boolean }>(
    `/workspaces/${workspaceId}/later/${itemId}`,
  )
  return res.data
}

export const clearCompletedSavedItemsApi = async (workspaceId: string) => {
  const res = await apiClient.delete<{ success: boolean }>(
    `/workspaces/${workspaceId}/later/completed`,
  )
  return res.data
}
