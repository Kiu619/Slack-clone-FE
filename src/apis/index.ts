import { apiClient } from "@/lib/axios"
import type {
  AccountUser,
  ChannelAttachmentsPage,
  Message,
  MessageAttachment,
  User,
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

// ─── Attachments ──────────────────────────────────────────────────────────────

export const deleteAttachmentApi = async (attachmentId: string) => {
  const res = await apiClient.delete<{ success: boolean; messageId: string; channelId: string; attachmentId: string }>(
    `/attachments/${attachmentId}`,
  )
  return res.data
}
