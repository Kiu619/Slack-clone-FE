import { apiClient } from "@/lib/axios"
import type {
  AccountUser,
  Channel,
  ChannelAttachmentsPage,
  ChannelFolder,
  ChannelMembersDirectory,
  Message,
  MessageAttachment,
  UpdateChannelPayload,
  User,
  WorkspaceMember,
  WorkspaceMemberStatus,
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

// ─── Messages ─────────────────────────────────────────────────────────────────

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

/** GET /channels/:channelId/files/search?q= — tìm attachment theo tên trong channel */
export const searchChannelFilesApi = async (channelId: string, q: string) => {
  const res = await apiClient.get<ChannelFileSearchResponse>(
    `/channels/${channelId}/files/search`,
    { params: { q: q.trim() } },
  )
  return res.data
}

// ─── Channel folders ──────────────────────────────────────────────────────────

export type ChannelFoldersListResponse = { folders: ChannelFolder[] }

export const listChannelFoldersApi = async (channelId: string) => {
  const res = await apiClient.get<ChannelFoldersListResponse>(
    `/channels/${channelId}/folders`,
  )
  return res.data
}

export const createChannelFolderApi = async (channelId: string, name: string) => {
  const res = await apiClient.post<{ folder: ChannelFolder }>(
    `/channels/${channelId}/folders`,
    { name },
  )
  return res.data
}

export const renameChannelFolderApi = async (
  channelId: string,
  folderId: string,
  name: string,
) => {
  const res = await apiClient.patch<{ folder: ChannelFolder }>(
    `/channels/${channelId}/folders/${folderId}`,
    { name },
  )
  return res.data
}

export const deleteChannelFolderApi = async (
  channelId: string,
  folderId: string,
) => {
  const res = await apiClient.delete<{ deleted: boolean; folderId: string }>(
    `/channels/${channelId}/folders/${folderId}`,
  )
  return res.data
}

export const listFolderAttachmentsApi = async (
  channelId: string,
  folderId: string,
  cursor?: string,
) => {
  const params: Record<string, string> = {}
  if (cursor) params.cursor = cursor
  const res = await apiClient.get<ChannelAttachmentsPage>(
    `/channels/${channelId}/folders/${folderId}/attachments`,
    { params },
  )
  return res.data
}

export const addAttachmentToFolderApi = async (
  channelId: string,
  folderId: string,
  attachmentId: string,
) => {
  const res = await apiClient.post<{ ok: boolean; folderId: string; attachmentId: string }>(
    `/channels/${channelId}/folders/${folderId}/attachments`,
    { attachmentId },
  )
  return res.data
}

export const removeAttachmentFromFolderApi = async (
  channelId: string,
  folderId: string,
  attachmentId: string,
) => {
  const res = await apiClient.delete<{ ok: boolean }>(
    `/channels/${channelId}/folders/${folderId}/attachments/${attachmentId}`,
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
