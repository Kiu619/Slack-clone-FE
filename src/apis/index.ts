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
  DmInviteCandidate,
  SavedItem,
  SavedItemsPage,
  SaveItemPayload,
  UpdateSavedItemPayload,
  UpdateConversationPayload,
  NotificationOverrideSetting,
  NotificationPreference,
  LaterSummary,
  WorkspaceMembersPage,
  WorkspaceMessageSearchResponse,
  WorkspaceCustomEmoji,
  WorkspaceCustomEmojisPage,
  WorkspaceEmojiOneClickSlots,
  WorkspaceMemberRole,
} from "@/lib/types"
import type {
  HuddleJoinResponse,
  HuddleStateSnapshot,
  HuddleTarget,
  WorkspaceHuddlesFilters,
  WorkspaceHuddlesResponse,
  RecentHuddlesResponse,
} from "@/lib/huddle"
import type {
  WorkspacePermissionKey,
  WorkspacePermissionMatrix,
  WorkspacePermissionRow,
} from "@/lib/workspace-permissions"

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const getUserApi = async () => {
  const res = await apiClient.get<AccountUser>('/auth/me')
  return res.data
}

export const magicLinkVerifyApi = async (token: string) => {
  const res = await apiClient.post<{ user: AccountUser; redirect?: string | null }>(
    '/auth/magic-link/verify',
    { token },
  )
  return res.data
}

export const initGoogleOAuthApi = async (redirect?: string) => {
  const res = await apiClient.post<{ ok: boolean }>('/auth/google/init', {
    redirect,
  })
  return res.data
}

export const initGithubOAuthApi = async (redirect?: string) => {
  const res = await apiClient.post<{ ok: boolean }>('/auth/github/init', {
    redirect,
  })
  return res.data
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

const buildHuddlePath = (target: HuddleTarget) => {
  return target.entityType === "channel"
    ? `/workspaces/${target.workspaceId}/channels/${target.entityId}/huddle`
    : `/workspaces/${target.workspaceId}/direct-messages/${target.entityId}/huddle`
}

export const getHuddleStateApi = async (target: HuddleTarget) => {
  const res = await apiClient.get<HuddleStateSnapshot>(buildHuddlePath(target))
  return res.data
}

export const startHuddleApi = async (
  target: HuddleTarget,
  socketId?: string,
) => {
  const res = await apiClient.post<HuddleStateSnapshot>(
    `${buildHuddlePath(target)}/start`,
    {},
    socketId ? { headers: { "x-socket-id": socketId } } : undefined,
  )
  return res.data
}

export const joinHuddleApi = async (
  target: HuddleTarget,
  socketId?: string,
) => {
  const res = await apiClient.post<HuddleJoinResponse>(
    `${buildHuddlePath(target)}/join`,
    {},
    socketId ? { headers: { "x-socket-id": socketId } } : undefined,
  )
  return res.data
}

export const leaveHuddleApi = async (
  target: HuddleTarget,
  socketId?: string,
) => {
  const res = await apiClient.post<HuddleStateSnapshot>(
    `${buildHuddlePath(target)}/leave`,
    {},
    socketId ? { headers: { "x-socket-id": socketId } } : undefined,
  )
  return res.data
}

export const leaveHuddleKeepaliveApi = async (target: HuddleTarget) => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
  const url = new URL(
    target.entityType === "channel"
      ? `/workspaces/${target.workspaceId}/channels/${target.entityId}/huddle/leave`
      : `/workspaces/${target.workspaceId}/direct-messages/${target.entityId}/huddle/leave`,
    baseUrl,
  )

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: '{}',
    keepalive: true,
  })

  if (!response.ok) {
    throw new Error(`Could not leave huddle (${response.status})`)
  }

  return (await response.json()) as HuddleStateSnapshot
}

export const muteParticipantApi = async (
  workspaceId: string,
  huddleId: string,
  participantIdentity: string,
) => {
  const res = await apiClient.post(`/workspaces/${workspaceId}/huddles/${huddleId}/participants/${participantIdentity}/mute`)
  return res.data
}

export const updateHuddleTopicApi = async (
  workspaceId: string,
  huddleId: string,
  topic: string | null,
) => {
  const res = await apiClient.patch<HuddleStateSnapshot>(
    `/workspaces/${workspaceId}/huddles/${huddleId}/topic`,
    { topic },
  )
  return res.data
}

export const getWorkspaceHuddlesApi = async (
  workspaceId: string,
  filters?: WorkspaceHuddlesFilters,
): Promise<WorkspaceHuddlesResponse> => {
  const res = await apiClient.get<WorkspaceHuddlesResponse>(
    `/workspaces/${workspaceId}/huddles`,
    { params: filters },
  )
  return res.data
}

import { serializeHuddleFilters } from '@/lib/huddle'
import type { RecentHuddlesFilters, WeeklyHuddlesResponse } from '@/lib/huddle'

export const getRecentHuddlesApi = async (
  workspaceId: string,
  filters?: RecentHuddlesFilters,
): Promise<RecentHuddlesResponse> => {
  const res = await apiClient.get<RecentHuddlesResponse>(
    `/workspaces/${workspaceId}/huddles/recent`,
    { params: filters ? serializeHuddleFilters(filters) : undefined },
  )
  return res.data
}

export const getWeeklyHuddlesApi = async (
  workspaceId: string,
  pageSize: number = 6,
): Promise<WeeklyHuddlesResponse> => {
  const res = await apiClient.get<WeeklyHuddlesResponse>(
    `/workspaces/${workspaceId}/huddles/weekly`,
    { params: { pageSize } },
  )
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

// ─── Member Preferences ──────────────────────────────────────────────────────────

export type MemberPreferencesResponse = {
  locale: 'en' | 'vi' | null
  dateFormat: 'en_US' | 'vi_VN' | null
  timeFormat: '12h' | '24h' | null
}

export type UpdateMemberPreferencesPayload = {
  locale?: 'en' | 'vi'
  dateFormat?: 'en_US' | 'vi_VN'
  timeFormat?: '12h' | '24h'
}

export const getMemberPreferencesApi = async (workspaceId: string) => {
  const res = await apiClient.get<MemberPreferencesResponse | null>(
    `/workspaces/${workspaceId}/member-preferences`,
  )
  return res.data
}

export const updateMemberPreferencesApi = async (
  workspaceId: string,
  payload: UpdateMemberPreferencesPayload,
) => {
  const res = await apiClient.patch<MemberPreferencesResponse>(
    `/workspaces/${workspaceId}/member-preferences`,
    payload,
  )
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
  const res = await apiClient.post<{ success: boolean }>(`/notifications/read-all`, {}, {
    params: { workspaceId }
  })
  return res.data
}

export const clearNotificationApi = async (notificationId: string) => {
  const res = await apiClient.delete<{ success: boolean }>(
    `/notifications/${notificationId}`,
  )
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

export const getLaterSummaryApi = async (workspaceId: string) => {
  const res = await apiClient.get<LaterSummary>(
    `/workspaces/${workspaceId}/later/summary`,
  )
  return res.data
}

export const fetchWorkspaceChannelsApi = async (
  workspaceId: string,
  params?: { withUserIds?: string[] },
) => {
  const withUserIds = params?.withUserIds?.filter(Boolean) ?? []
  const res = await apiClient.get<Channel[]>(`/workspaces/${workspaceId}/channels`, {
    params:
      withUserIds.length > 0
        ? { withUserIds: withUserIds.join(',') }
        : undefined,
  })
  return res.data
}

export type WorkspaceMembersQueryParams = {
  page?: number
  pageSize?: number
  sortBy?: 'fullName' | 'displayName' | 'email' | 'accountType' | 'joined' | 'status'
  sortDirection?: 'asc' | 'desc'
  q?: string
}

export const fetchWorkspaceMembersPageApi = async (
  workspaceId: string,
  params: WorkspaceMembersQueryParams,
) => {
  const res = await apiClient.get<WorkspaceMembersPage>(
    `/workspaces/${workspaceId}/members/page`,
    { params },
  )
  return res.data
}

export const updateWorkspaceMemberRoleApi = async (
  workspaceId: string,
  userId: string,
  role: WorkspaceMemberRole,
) => {
  const res = await apiClient.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${userId}/role`,
    { role },
  )
  return res.data
}

export const deactivateWorkspaceMemberApi = async (
  workspaceId: string,
  userId: string,
) => {
  const res = await apiClient.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${userId}/deactivate`,
  )
  return res.data
}

export const activateWorkspaceMemberApi = async (
  workspaceId: string,
  userId: string,
) => {
  const res = await apiClient.patch<WorkspaceMember>(
    `/workspaces/${workspaceId}/members/${userId}/activate`,
  )
  return res.data
}

export const removeDeactivatedWorkspaceMemberApi = async (
  workspaceId: string,
  userId: string,
) => {
  const res = await apiClient.delete<{ id: string; removed: true }>(
    `/workspaces/${workspaceId}/members/${userId}`,
  )
  return res.data
}

export const fetchWorkspacePermissionsApi = async (workspaceId: string) => {
  const res = await apiClient.get<WorkspacePermissionRow[]>(
    `/workspaces/${workspaceId}/permissions`,
  )
  return res.data
}

export const updateWorkspacePermissionApi = async (
  workspaceId: string,
  permissionKey: WorkspacePermissionKey,
  roles: WorkspacePermissionMatrix,
) => {
  const res = await apiClient.patch<WorkspacePermissionRow>(
    `/workspaces/${workspaceId}/permissions/${permissionKey}`,
    { roles },
  )
  return res.data
}

export type CreateWorkspaceCustomEmojiPayload = {
  name: string
  imageUrl: string
}

export type CreateWorkspaceCustomEmojiAliasPayload = {
  sourceEmojiId?: string
  sourceDefaultEmoji?: string
  alias: string
}

export type WorkspaceCustomEmojisQueryParams = {
  page?: number
  pageSize?: number
  sortBy?: 'name' | 'createdAt' | 'createdBy'
  sortDirection?: 'asc' | 'desc'
  q?: string
}

export const createWorkspaceCustomEmojiApi = async (
  workspaceId: string,
  payload: CreateWorkspaceCustomEmojiPayload,
) => {
  const res = await apiClient.post<WorkspaceCustomEmoji>(
    `/workspaces/${workspaceId}/custom-emojis`,
    payload,
  )
  return res.data
}

export const fetchWorkspaceCustomEmojisPageApi = async (
  workspaceId: string,
  params: WorkspaceCustomEmojisQueryParams,
) => {
  const res = await apiClient.get<WorkspaceCustomEmojisPage>(
    `/workspaces/${workspaceId}/custom-emojis`,
    { params },
  )
  return res.data
}

export const createWorkspaceCustomEmojiAliasApi = async (
  workspaceId: string,
  payload: CreateWorkspaceCustomEmojiAliasPayload,
) => {
  const res = await apiClient.post<WorkspaceCustomEmoji>(
    `/workspaces/${workspaceId}/custom-emojis/aliases`,
    payload,
  )
  return res.data
}

export const deleteWorkspaceCustomEmojiApi = async (
  workspaceId: string,
  emojiId: string,
) => {
  const res = await apiClient.delete<{ ok: boolean }>(
    `/workspaces/${workspaceId}/custom-emojis/${emojiId}`,
  )
  return res.data
}

export const updateWorkspaceEmojiOneClickApi = async (
  workspaceId: string,
  payload: { slots: WorkspaceEmojiOneClickSlots },
) => {
  const res = await apiClient.patch(
    `/workspaces/${workspaceId}/custom-emojis/one-click`,
    payload,
  )
  return res.data
}

export const getUnreadNotificationsCountApi = async (workspaceId: string) => {
  const res = await apiClient.get<{ count: number }>(`/notifications/unread-count`, {
    params: { workspaceId },
  })
  return res.data
}

export const getWorkspaceUnreadCountsApi = async (workspaceId: string) => {
  const res = await apiClient.get<{
    channels: Array<{ id: string; unreadCount: number }>
    conversations: Array<{ id: string; unreadCount: number }>
  }>(`/notifications/workspace-unread-counts`, { params: { workspaceId } })
  return res.data
}

export const markChannelAsReadApi = async (channelId: string) => {
  const res = await apiClient.post<{ success: boolean }>(
    `/notifications/channels/${channelId}/mark-as-read`,
  )
  return res.data
}

export const markDmConversationAsReadApi = async (conversationId: string) => {
  const res = await apiClient.post<{ success: boolean }>(
    `/notifications/conversations/${conversationId}/mark-as-read`,
  )
  return res.data
}

export const getDmUnreadSummaryApi = async (workspaceId: string) => {
  const res = await apiClient.get<{ count: number }>(
    `/workspaces/${workspaceId}/direct-messages/unread-summary`,
  )
  return res.data
}

type NotificationSettingTarget =
  | { workspaceId: string; channelId: string; conversationId?: never }
  | { workspaceId: string; conversationId: string; channelId?: never }

export const getNotificationSettingApi = async (
  target: NotificationSettingTarget,
) => {
  const res = await apiClient.get<NotificationOverrideSetting>(
    `/notifications/settings/override`,
    {
      params:
        'channelId' in target
          ? { workspaceId: target.workspaceId, channelId: target.channelId }
          : {
              workspaceId: target.workspaceId,
              conversationId: target.conversationId,
            },
    },
  )
  return res.data
}

export const updateNotificationSettingApi = async (
  target: NotificationSettingTarget,
  payload: { notifyFor?: NotificationPreference; muteChannel: boolean },
) => {
  const body =
    'channelId' in target
      ? {
          channelId: target.channelId,
          notifyFor: payload.notifyFor,
          muteChannel: payload.muteChannel,
        }
      : {
          conversationId: target.conversationId,
          notifyFor: payload.notifyFor,
          muteChannel: payload.muteChannel,
        }

  const res = await apiClient.patch<NotificationOverrideSetting>(
    `/notifications/settings/override`,
    body,
    { params: { workspaceId: target.workspaceId } },
  )
  return res.data
}

export type SearchWorkspaceMessagesParams = {
  workspaceId: string
  q?: string
  fromUserIds?: string[]
  withUserIds?: string[]
  channelIds?: string[]
  conversationIds?: string[]
  has?: string[]
  is?: string[]
  types?: string[]
  afterDate?: string | null
  beforeDate?: string | null
  sort?: 'relevance' | 'newest' | 'oldest'
  limit?: number
  offset?: number
}

export const searchWorkspaceMessagesApi = async (
  params: SearchWorkspaceMessagesParams,
) => {
  const {
    workspaceId,
    q,
    fromUserIds,
    withUserIds,
    channelIds,
    conversationIds,
    has,
    is,
    types,
    afterDate,
    beforeDate,
    sort,
    limit,
    offset,
  } = params

  const res = await apiClient.get<WorkspaceMessageSearchResponse>(
    `/workspaces/${workspaceId}/search/messages`,
    {
      params: {
        q,
        fromUserIds: fromUserIds?.length ? fromUserIds.join(',') : undefined,
        withUserIds: withUserIds?.length ? withUserIds.join(',') : undefined,
        channelIds: channelIds?.length ? channelIds.join(',') : undefined,
        conversationIds: conversationIds?.length
          ? conversationIds.join(',')
          : undefined,
        has: has?.length ? has.join(',') : undefined,
        is: is?.length ? is.join(',') : undefined,
        types: types?.length ? types.join(',') : undefined,
        afterDate,
        beforeDate,
        sort,
        limit,
        offset,
      },
    },
  )
  return res.data
}
