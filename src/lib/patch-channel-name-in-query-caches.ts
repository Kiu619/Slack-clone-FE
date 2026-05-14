import type { InfiniteData, QueryClient } from '@tanstack/react-query'

import type {
  Notification,
  NotificationsPage,
  SavedItem,
  SavedItemsPage,
  ThreadMessage,
  ThreadsPage,
} from '@/lib/types'

function patchNotificationChannelName(
  n: Notification,
  channelId: string,
  newName: string,
): Notification {
  const matches = n.channelId === channelId || n.channel?.id === channelId
  if (!matches) return n
  if (n.channel?.name === newName && n.channel.id === channelId) return n
  return {
    ...n,
    channel: n.channel
      ? { ...n.channel, id: channelId, name: newName }
      : { id: channelId, name: newName },
  }
}

function patchSavedItemChannelName(
  item: SavedItem,
  channelId: string,
  newName: string,
): SavedItem {
  if (item.type === 'message' && item.message?.channelId === channelId) {
    if (item.message.channelName === newName) return item
    return {
      ...item,
      message: { ...item.message, channelName: newName },
    }
  }
  if (item.type === 'attachment' && item.attachment?.channelId === channelId) {
    if (item.attachment.channelName === newName) return item
    return {
      ...item,
      attachment: { ...item.attachment, channelName: newName },
    }
  }
  return item
}

function patchThreadMessageChannelName(
  t: ThreadMessage,
  channelId: string,
  newName: string,
): ThreadMessage {
  if (!t.channel || t.channel.id !== channelId) return t
  if (t.channel.name === newName) return t
  return {
    ...t,
    channel: { ...t.channel, name: newName },
  }
}

/**
 * Khi channel đổi tên (`entity:sync` CHANNEL UPDATE), cập nhật tên denormalized
 * trong cache Notification / Later / Threads (không refetch).
 */
export function patchChannelNameInQueryCaches(
  qc: QueryClient,
  workspaceId: string,
  channelId: string,
  newName: string,
): void {
  qc.setQueriesData<InfiniteData<NotificationsPage>>(
    {
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          k[0] === 'notifications' &&
          k[1] === workspaceId
        )
      },
    },
    (old) => {
      if (!old?.pages?.length) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((n) =>
            patchNotificationChannelName(n, channelId, newName),
          ),
        })),
      }
    },
  )

  qc.setQueriesData<InfiniteData<SavedItemsPage>>(
    {
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          k[0] === 'saved-items' &&
          k[1] === workspaceId
        )
      },
    },
    (old) => {
      if (!old?.pages?.length) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          items: page.items.map((item) =>
            patchSavedItemChannelName(item, channelId, newName),
          ),
        })),
      }
    },
  )

  qc.setQueriesData<InfiniteData<ThreadsPage>>(
    {
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          k[0] === 'workspaces' &&
          k[1] === workspaceId &&
          k[2] === 'threads'
        )
      },
    },
    (old) => {
      if (!old?.pages?.length) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          threads: page.threads.map((t) =>
            patchThreadMessageChannelName(t, channelId, newName),
          ),
        })),
      }
    },
  )
}
