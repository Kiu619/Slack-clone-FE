/* eslint-disable @typescript-eslint/no-explicit-any */

export const authKeys = {
  me: ['auth', 'me'] as const,
  workspaceProfile: (workspaceId: string) =>
    ['workspace-profile', workspaceId] as const,
}

export const memberPreferencesKeys = {
  detail: (workspaceId: string) => ['member-preferences', workspaceId] as const,
}

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (id: string) => ['workspaces', id] as const,
  members: (id: string) => ['workspaces', id, 'members'] as const,
  permissions: (id: string) => ['workspaces', id, 'permissions'] as const,
  membersPage: (
    id: string,
    params: {
      page: number
      pageSize: number
      sortKey: string
      sortDirection: string
      search: string
    },
  ) =>
    [
      'workspaces',
      id,
      'members-page',
      params.page,
      params.pageSize,
      params.sortKey,
      params.sortDirection,
      params.search,
    ] as const,
  customEmojisPage: (
    id: string,
    params: {
      page: number
      pageSize: number
      sortKey: string
      sortDirection: string
      search: string
    },
  ) =>
    [
      'workspaces',
      id,
      'custom-emojis-page',
      params.page,
      params.pageSize,
      params.sortKey,
      params.sortDirection,
      params.search,
    ] as const,
  recents: (id: string) => ['workspaces', id, 'recents'] as const,
}

export const huddleKeys = {
  state: (workspaceId: string, entityType: 'channel' | 'dm', entityId: string) =>
    ['huddles', workspaceId, entityType, entityId, 'state'] as const,
  workspaceHuddles: (workspaceId: string, filters?: Record<string, unknown>) =>
    ['huddles', 'workspace', workspaceId, filters ?? {}] as const,
  recentHuddles: (workspaceId: string, filters?: Record<string, unknown>) =>
    ['huddles', 'workspace', workspaceId, 'recent', filters ?? {}] as const,
  weeklyHuddles: (workspaceId: string) =>
    ['huddles', 'workspace', workspaceId, 'weekly'] as const,
}

export const notificationKeys = {
  setting: (
    workspaceId: string,
    scope: 'channel' | 'conversation',
    targetId: string,
  ) => ['notification-setting', workspaceId, scope, targetId] as const,
}

export const messageKeys = {
  all: ['messages'] as const,
  threadsAll: ['thread-messages'] as const,
  pinnedAll: ['pinned-messages'] as const,
  list: (channelId: string) => ['messages', channelId] as const,
  thread: (messageId: string) => ['thread-messages', messageId] as const,
  channelAttachments: (channelId: string) =>
    ['messages', channelId, 'attachments'] as const,
  conversationAttachments: (conversationId: string) =>
    ['dm-conversations', conversationId, 'attachments'] as const,
  threads: (workspaceId: string) => ['workspaces', workspaceId, 'threads'] as const,
  channelFilesSearch: (channelId: string, q: string) =>
    ['messages', channelId, 'files-search', q] as const,
  conversations: (workspaceId: string) => ['dm-conversations', workspaceId] as const,
  conversationsUnreadSummary: (workspaceId: string) =>
    ['dm-conversations', workspaceId, 'unread-summary'] as const,
  conversationDetail: (conversationId: string) =>
    ['dm-conversations', 'detail', conversationId] as const,
  conversationInviteCandidates: (conversationId: string, q: string) =>
    ['dm-conversations', 'invite-candidates', conversationId, q] as const,
  conversationFilesSearch: (conversationId: string, q: string) =>
    ['dm-conversations', conversationId, 'files-search', q] as const,
  allFiles: (workspaceId: string, filters: any) =>
    ['workspaces', workspaceId, 'all-files', filters] as const,
  workspaceSearch: (workspaceId: string, params: any) =>
    ['workspaces', workspaceId, 'message-search', params] as const,
}

export const draftKeys = {
  list: (workspaceId: string) => ['message-drafts', workspaceId] as const,
  current: (workspaceId: string, contextKey: string) =>
    ['message-drafts', workspaceId, 'current', contextKey] as const,
}

export const scheduledMessageKeys = {
  all: (workspaceId: string) => ['scheduled-messages', workspaceId] as const,
  list: (workspaceId: string, status: 'pending' | 'cancelled' | 'all') =>
    ['scheduled-messages', workspaceId, status] as const,
}

export const attachmentContentKeys = {
  detail: (attachmentId: string) => ['attachment-content', attachmentId] as const,
}

export const attachmentFileKeys = {
  blob: (url: string) => ['attachment-file', url] as const,
}

export const folderKeys = {
  list: (targetId: string) => ['folders', targetId, 'list'] as const,
  attachments: (targetId: string, folderId: string) =>
    ['folders', targetId, folderId, 'attachments'] as const,
}

export const channelKeys = {
  all: (workspaceId: string) => ['channels', workspaceId] as const,
  detail: (workspaceId: string, channelId: string) =>
    ['channels', workspaceId, channelId] as const,
  members: (workspaceId: string, channelId: string, search?: string) =>
    ['channels', workspaceId, channelId, 'members', search?.trim() ?? ''] as const,
  withMembers: (workspaceId: string, withUserIds: string[]) => {
    const normalizedWithUserIds = Array.from(
      new Set(withUserIds.map((id) => id.trim()).filter(Boolean)),
    ).sort()
    return [
      'channels',
      workspaceId,
      'search-with-members',
      normalizedWithUserIds,
    ] as const
  },
}

export function isChannelMembersQueryKey(
  queryKey: readonly unknown[],
  workspaceId?: string,
) {
  if (!Array.isArray(queryKey)) return false
  if (queryKey[0] !== 'channels') return false
  if (workspaceId && queryKey[1] !== workspaceId) return false
  if (typeof queryKey[2] !== 'string') return false
  return queryKey[3] === 'members'
}

export function isSpecificChannelMembersQueryKey(
  queryKey: readonly unknown[],
  workspaceId: string,
  channelId: string,
) {
  return (
    isChannelMembersQueryKey(queryKey, workspaceId) &&
    queryKey[2] === channelId
  )
}
