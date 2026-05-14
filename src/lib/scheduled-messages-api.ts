import { apiClient } from '@/lib/axios'
import { scheduledMessageKeys } from '@/lib/query-keys'
import type { QueryClient } from '@tanstack/react-query'

export type ScheduledMessageStatus = 'pending' | 'sent' | 'cancelled'

/** Tham số GET list — không còn filter `sent` (đã bỏ tab Sent trên UI). */
export type ScheduledMessageListStatus = 'pending' | 'cancelled' | 'all'

export type ScheduledMessageRow = {
  id: string
  userId: string
  workspaceId: string
  channelId: string | null
  conversationId: string | null
  parentId: string | null
  content: string
  alsoSendToChannel: boolean
  scheduledAt: string
  status: ScheduledMessageStatus
  sentMessageId: string | null
  sentAt: string | null
  createdAt: string
  updatedAt: string
}

export async function fetchScheduledMessagesList(
  workspaceId: string,
  status?: ScheduledMessageListStatus,
): Promise<ScheduledMessageRow[]> {
  const params = status ? { status } : undefined
  const { data } = await apiClient.get<ScheduledMessageRow[]>(
    `/workspaces/${workspaceId}/scheduled-messages`,
    { params },
  )
  return Array.isArray(data) ? data : []
}

export type CreateScheduledMessageBody = {
  content: string
  channelId?: string
  conversationId?: string
  parentId?: string
  alsoSendToChannel?: boolean
  scheduledAt: string
}

export async function createScheduledMessageApi(
  workspaceId: string,
  body: CreateScheduledMessageBody,
): Promise<ScheduledMessageRow> {
  const { data } = await apiClient.post<ScheduledMessageRow>(
    `/workspaces/${workspaceId}/scheduled-messages`,
    body,
  )
  return data
}

export async function updateScheduledMessageApi(
  workspaceId: string,
  id: string,
  body: { scheduledAt: string },
): Promise<ScheduledMessageRow> {
  const { data } = await apiClient.patch<ScheduledMessageRow>(
    `/workspaces/${workspaceId}/scheduled-messages/${id}`,
    body,
  )
  return data
}

export async function cancelScheduledMessageApi(
  workspaceId: string,
  id: string,
): Promise<{ ok: true }> {
  const { data } = await apiClient.delete<{ ok: true }>(
    `/workspaces/${workspaceId}/scheduled-messages/${id}`,
  )
  return data
}

export function invalidateScheduledMessageQueries(
  qc: QueryClient,
  workspaceId: string,
) {
  void qc.invalidateQueries({
    queryKey: scheduledMessageKeys.all(workspaceId),
  })
}
