import { useEffect, useLayoutEffect, useRef } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { useSocket } from '@/hooks/use-socket'
import { useMessageSync } from '@/hooks/use-message-sync'
import { applyIncomingDmMessageToConversationsCaches, patchDmSidebarIfLastMessageEdited } from '@/lib/conversations-cache'
import { applyDraftSyncToCache } from '@/lib/message-drafts-api'
import { patchChannelNameInQueryCaches } from '@/lib/patch-channel-name-in-query-caches'
import {
  channelKeys,
  folderKeys,
  isSpecificChannelMembersQueryKey,
  messageKeys,
  notificationKeys,
  scheduledMessageKeys,
  workspaceKeys,
} from '@/lib/query-keys'
import type { Channel, DirectMessageConversation, Message, NotificationOverrideSetting } from '@/lib/types'
import { useMessageStore } from '@/stores/useMessageStore'
import { useUserStore } from '@/stores/useUserStore'
import { useMainPanelStore } from '@/stores/useMainPanelStore'

const isDev = process.env.NODE_ENV === 'development'

type EntitySyncChatPayload = {
  id: string
  data?: unknown
  workspaceId?: string
  channelId?: string
  conversationId?: string
  transferredToConversationId?: string
  attachmentsChanged?: boolean
  deletedAttachmentId?: string
}

type EntitySyncEnvelope = {
  domain: string
  action: string
  payload: EntitySyncChatPayload
}

type SidebarStarPayload = {
  kind: 'channel' | 'dm'
  id: string
  starredAt: string | null
}

type SidebarRecentPayload = {
  workspaceId?: string
  items?: unknown
}

type NotificationRealtimePayload = {
  workspaceId: string
}

const isRecentItem = (x: unknown): x is { kind: 'channel' | 'dm'; id: string; visitedAt: string } => {
  if (!x || typeof x !== 'object') return false
  const o = x as Record<string, unknown>
  return (
    (o.kind === 'channel' || o.kind === 'dm') &&
    typeof o.id === 'string' &&
    typeof o.visitedAt === 'string'
  )
}

/**
 * useGlobalSync — join workspace + lắng nghe entity:sync, sidebar:star, sidebar:recent trên Main Gateway.
 * Ref giữ bản mới nhất của useMessageSync để tránh gỡ/gắn socket listener không cần thiết.
 */
export function useGlobalSync(workspaceId: string) {
  const queryClient = useQueryClient()
  const { socket, isMainGatewayConnected } = useSocket()
  const { syncMessageUpdate, syncMessageDeletion, syncMessageCreation } =
    useMessageSync()

  const syncUpdateRef = useRef(syncMessageUpdate)
  const syncDeleteRef = useRef(syncMessageDeletion)
  const syncCreateRef = useRef(syncMessageCreation)
  const workspaceIdRef = useRef(workspaceId)
  const queryClientRef = useRef(queryClient)

  useLayoutEffect(() => {
    syncUpdateRef.current = syncMessageUpdate
    syncDeleteRef.current = syncMessageDeletion
    syncCreateRef.current = syncMessageCreation
    workspaceIdRef.current = workspaceId
    queryClientRef.current = queryClient
  }, [
    syncMessageUpdate,
    syncMessageDeletion,
    syncMessageCreation,
    workspaceId,
    queryClient,
  ])

  useEffect(() => {
    if (!socket || !isMainGatewayConnected || !workspaceId) {
      if (isDev) {
        console.log('[GlobalSync] Not ready:', {
          hasSocket: !!socket,
          isMainGatewayConnected,
          workspaceId,
        })
      }
      return
    }

    const wid = workspaceId

    socket.emit('join-workspace', { workspaceId: wid })

    const handleEntitySync = (raw: EntitySyncEnvelope) => {
      const { domain, action, payload: data } = raw
      const activeWs = workspaceIdRef.current
      const qc = queryClientRef.current

      if (isDev) {
        console.log(
          `[GlobalSync] entity:sync received on / - ${domain}:${action}`,
          data,
        )
      }

      if (domain === 'CHANNEL') {
        if (data.workspaceId && data.workspaceId !== activeWs) return

        if (action === 'CREATE') {
          return
        }

        if (
          action === 'UPDATE' &&
          data.data &&
          typeof data.data === 'object'
        ) {
          const ch = data.data as Channel
          const channelId = ch.id ?? data.id
          if (!channelId) return
          qc.setQueryData<Channel>(
            channelKeys.detail(activeWs, channelId),
            (prev) => {
              if (!prev) return ch
              return {
                ...ch,
                starredAt: ch.starredAt ?? prev.starredAt ?? null,
              }
            },
          )
          qc.setQueryData<Channel[]>(
            channelKeys.all(activeWs),
            (old = []) => {
              if (!old.some((c) => c.id === channelId)) return old
              return [
                ...old.map((c) => {
                  if (c.id !== channelId) return c
                  return {
                    ...ch,
                    starredAt: ch.starredAt ?? c.starredAt ?? null,
                  }
                }),
              ].sort((a, b) => a.name.localeCompare(b.name))
            },
          )
          patchChannelNameInQueryCaches(qc, activeWs, channelId, ch.name)
          useMessageStore.getState().patchChannelDisplayName(channelId, ch.name)
          return
        }

        if (action === 'DELETE') {
          const channelId = data.id
          if (!channelId) return
          qc.removeQueries({
            queryKey: channelKeys.detail(activeWs, channelId),
          })
          qc.setQueryData<Channel[]>(
            channelKeys.all(activeWs),
            (old = []) => old.filter((c) => c.id !== channelId),
          )
          return
        }

        if (action === 'SYNC' && data.data && typeof data.data === 'object') {
          const mem = data.data as {
            kind?: string
            affectedUserId?: string
            action?: string
            folderId?: string
          }
          const channelId = data.channelId
          if (
            mem.kind === 'membership' &&
            typeof channelId === 'string' &&
            typeof mem.affectedUserId === 'string' &&
            (mem.action === 'member_added' || mem.action === 'member_removed')
          ) {
            const currentUserId = useUserStore.getState().user?.id
            void qc.invalidateQueries({
              predicate: (q) => {
                return isSpecificChannelMembersQueryKey(
                  q.queryKey,
                  activeWs,
                  channelId,
                )
              },
            })
            if (mem.affectedUserId === currentUserId) {
              void qc.invalidateQueries({
                queryKey: channelKeys.all(activeWs),
              })
              void qc.invalidateQueries({
                queryKey: channelKeys.detail(activeWs, channelId),
              })
            }
          }

          if (mem.kind === 'folders') {
            const targetId =
              (typeof data.channelId === 'string' && data.channelId) ||
              (typeof data.conversationId === 'string' && data.conversationId)
            if (targetId) {
              void qc.invalidateQueries({ queryKey: folderKeys.list(targetId) })
              if (typeof mem.folderId === 'string' && mem.folderId) {
                void qc.invalidateQueries({
                  queryKey: folderKeys.attachments(targetId, mem.folderId),
                })
              }
              void qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey
                  return (
                    Array.isArray(k) &&
                    k[0] === 'folders' &&
                    k[1] === targetId &&
                    k.length >= 4 &&
                    k[3] === 'attachments'
                  )
                },
              })
              if (typeof data.channelId === 'string' && data.channelId) {
                void qc.invalidateQueries({
                  queryKey: messageKeys.channelAttachments(data.channelId),
                })
                void qc.invalidateQueries({
                  predicate: (q) => {
                    const k = q.queryKey
                    return (
                      Array.isArray(k) &&
                      k[0] === 'messages' &&
                      k[1] === data.channelId &&
                      k[2] === 'files-search'
                    )
                  },
                })
              }
              if (typeof data.conversationId === 'string' && data.conversationId) {
                void qc.invalidateQueries({
                  queryKey: messageKeys.conversationAttachments(
                    data.conversationId,
                  ),
                })
                void qc.invalidateQueries({
                  predicate: (q) => {
                    const k = q.queryKey
                    return (
                      Array.isArray(k) &&
                      k[0] === 'dm-conversations' &&
                      k[1] === data.conversationId &&
                      k[2] === 'files-search'
                    )
                  },
                })
              }
            }
          }
        }
        return
      }

      if (domain === 'NOTIFICATION') {
        if (data.workspaceId && data.workspaceId !== activeWs) return
        if (action !== 'UPDATE' || !data.data || typeof data.data !== 'object') {
          return
        }

        const setting = data.data as NotificationOverrideSetting
        const scope = setting.scope
        const targetId =
          setting.targetId ||
          (scope === 'channel' ? data.channelId : data.conversationId)

        if (!targetId) return

        qc.setQueryData(
          notificationKeys.setting(activeWs, scope, targetId),
          setting,
        )
        return
      }

      if (domain === 'EMOJI') {
        if (data.workspaceId && data.workspaceId !== activeWs) return
        void qc.invalidateQueries({
          queryKey: ["workspaces", activeWs, "custom-emojis-page"],
        })
        return
      }

      if (domain === 'CHAT') {
        useMessageStore.getState().syncEntity(domain, action, data)

        if (action === 'UPDATE') {
          if (data.data && typeof data.data === 'object') {
            syncUpdateRef.current({
              id: data.id,
              ...(data.data as Partial<Message>),
            })
          }
          const p = data as EntitySyncChatPayload
          if (
            (p.attachmentsChanged || p.deletedAttachmentId) &&
            (!p.workspaceId || p.workspaceId === activeWs)
          ) {
            if (p.channelId) {
              void qc.invalidateQueries({
                queryKey: messageKeys.channelAttachments(p.channelId),
              })
              void qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey
                  return (
                    Array.isArray(k) &&
                    k[0] === 'messages' &&
                    k[1] === p.channelId &&
                    k[2] === 'files-search'
                  )
                },
              })
            }
            if (p.conversationId) {
              void qc.invalidateQueries({
                queryKey: messageKeys.conversationAttachments(p.conversationId),
              })
              void qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey
                  return (
                    Array.isArray(k) &&
                    k[0] === 'dm-conversations' &&
                    k[1] === p.conversationId &&
                    k[2] === 'files-search'
                  )
                },
              })
            }
          }
          if (
            data.data &&
            typeof data.data === 'object' &&
            'isPinned' in (data.data as object) &&
            (!data.workspaceId || data.workspaceId === activeWs)
          ) {
            const ent = useMessageStore.getState().entities[data.id]
            const tid =
              data.channelId ??
              data.conversationId ??
              ent?.channelId ??
              ent?.conversationId
            if (typeof tid === 'string') {
              void qc.invalidateQueries({ queryKey: ['pinned-messages', tid] })
            } else {
              void qc.invalidateQueries({ queryKey: messageKeys.pinnedAll })
            }
          }
        } else if (action === 'DELETE') {
          const transferred = (data as EntitySyncChatPayload)
            .transferredToConversationId
          if (!transferred) {
            syncDeleteRef.current(data.id)
            const del = data as EntitySyncChatPayload
            if (!del.workspaceId || del.workspaceId === activeWs) {
              if (del.channelId) {
                void qc.invalidateQueries({
                  queryKey: messageKeys.channelAttachments(del.channelId),
                })
                void qc.invalidateQueries({
                  predicate: (q) => {
                    const k = q.queryKey
                    return (
                      Array.isArray(k) &&
                      k[0] === 'messages' &&
                      k[1] === del.channelId &&
                      k[2] === 'files-search'
                    )
                  },
                })
                void qc.invalidateQueries({
                  queryKey: ['pinned-messages', del.channelId],
                })
              }
              if (del.conversationId) {
                void qc.invalidateQueries({
                  queryKey: messageKeys.conversationAttachments(
                    del.conversationId,
                  ),
                })
                void qc.invalidateQueries({
                  predicate: (q) => {
                    const k = q.queryKey
                    return (
                      Array.isArray(k) &&
                      k[0] === 'dm-conversations' &&
                      k[1] === del.conversationId &&
                      k[2] === 'files-search'
                    )
                  },
                })
                void qc.invalidateQueries({
                  queryKey: ['pinned-messages', del.conversationId],
                })
              }
            }
          } else if (data.conversationId) {
            qc.setQueryData(
              messageKeys.list(data.conversationId),
              (old: { pages: { messages: Message[] }[]; pageParams: unknown[] } | undefined) => {
                if (!old?.pages) return old
                return {
                  ...old,
                  pages: old.pages.map((page) => ({
                    ...page,
                    messages: page.messages.filter((m) => m.id !== data.id),
                  })),
                }
              },
            )
          }
        } else if (
          action === 'CREATE' &&
          data.data &&
          typeof data.data === 'object' &&
          'parentId' in data.data &&
          (data.data as { parentId?: string | null }).parentId
        ) {
          syncCreateRef.current(data.data as Message)
        }

        if (
          action === 'CREATE' &&
          data.data &&
          typeof data.data === 'object' &&
          (!data.workspaceId || data.workspaceId === activeWs)
        ) {
          const msg = data.data as Message
          if (Array.isArray(msg.attachments) && msg.attachments.length > 0) {
            if (data.channelId) {
              void qc.invalidateQueries({
                queryKey: messageKeys.channelAttachments(data.channelId),
              })
              void qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey
                  return (
                    Array.isArray(k) &&
                    k[0] === 'messages' &&
                    k[1] === data.channelId &&
                    k[2] === 'files-search'
                  )
                },
              })
            }
            if (data.conversationId) {
              void qc.invalidateQueries({
                queryKey: messageKeys.conversationAttachments(
                  data.conversationId,
                ),
              })
              void qc.invalidateQueries({
                predicate: (q) => {
                  const k = q.queryKey
                  return (
                    Array.isArray(k) &&
                    k[0] === 'dm-conversations' &&
                    k[1] === data.conversationId &&
                    k[2] === 'files-search'
                  )
                },
              })
            }
          }
        }

        if (
          action === 'CREATE' &&
          (!data.workspaceId || data.workspaceId === activeWs) &&
          (data.channelId || data.conversationId)
        ) {
          void qc.invalidateQueries({
            queryKey: ['workspace-unread-counts', activeWs],
          })
        }

        if (
          action === 'CREATE' &&
          data.data &&
          data.conversationId &&
          (!data.workspaceId || data.workspaceId === activeWs)
        ) {
          applyIncomingDmMessageToConversationsCaches(
            qc,
            activeWs,
            data.data as Message,
            {
              currentUserId: useUserStore.getState().user?.id,
              activeConversationId: (() => {
                const view = useMainPanelStore.getState().view
                return view.type === 'dm' ? view.conversationId : null
              })(),
            },
          )
        }

        if (
          action === 'UPDATE' &&
          data.conversationId &&
          !data.channelId &&
          (!data.workspaceId || data.workspaceId === activeWs) &&
          data.data &&
          typeof data.data === 'object'
        ) {
          const base = useMessageStore.getState().entities[data.id]
          const delta = data.data as Partial<Message>
          const merged = (
            base
              ? ({
                  ...base,
                  ...delta,
                  id: data.id,
                  conversationId:
                    data.conversationId ?? base.conversationId ?? undefined,
                  workspaceId: data.workspaceId ?? activeWs,
                } as Message)
              : ({
                  ...delta,
                  id: data.id,
                  conversationId: data.conversationId,
                  workspaceId: data.workspaceId ?? activeWs,
                  channelId: null,
                } as Message)
          ) as Message
          if (typeof merged.content === 'string') {
            patchDmSidebarIfLastMessageEdited(qc, activeWs, merged)
          }
        }
      } else {
        console.warn(`[GlobalSync] Unknown sync domain: ${domain}`)
      }
    }

    const handleDraftSync = (raw: unknown) => {
      applyDraftSyncToCache(
        queryClientRef.current,
        workspaceIdRef.current,
        raw,
      )
    }

    const handleScheduledSync = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const p = raw as { workspaceId?: string }
      const wid = workspaceIdRef.current
      if (String(p.workspaceId ?? '') !== String(wid)) return
      void queryClientRef.current.invalidateQueries({
        queryKey: scheduledMessageKeys.all(wid),
      })
    }

    const handleSidebarStar = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const p = raw as SidebarStarPayload
      if (p.kind !== 'channel' && p.kind !== 'dm') return
      if (typeof p.id !== 'string') return
      const activeWs = workspaceIdRef.current
      const qc = queryClientRef.current
      const starredAt =
        p.starredAt === null || p.starredAt === undefined
          ? null
          : String(p.starredAt)

      if (p.kind === 'channel') {
        qc.setQueryData<Channel>(
          channelKeys.detail(activeWs, p.id),
          (old) => {
            if (!old) return old
            return { ...old, starredAt }
          },
        )
        qc.setQueryData<Channel[]>(
          channelKeys.all(activeWs),
          (old = []) => {
            const next = old.map((c) =>
              c.id === p.id ? { ...c, starredAt } : c,
            )
            return next.sort((a, b) => a.name.localeCompare(b.name))
          },
        )
        return
      }

      qc.setQueryData<DirectMessageConversation>(
        messageKeys.conversationDetail(p.id),
        (old) => {
          if (!old) return old
          return { ...old, starredAt }
        },
      )
      qc.setQueriesData<DirectMessageConversation[]>(
        { queryKey: messageKeys.conversations(activeWs), exact: false },
        (old) => {
          if (!old) return old
          return old.map((c) =>
            c.id === p.id ? { ...c, starredAt } : c,
          )
        },
      )
    }

    const handleSidebarRecent = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const p = raw as SidebarRecentPayload
      const activeWs = workspaceIdRef.current
      if (String(p.workspaceId ?? '') !== String(activeWs)) return
      const qc = queryClientRef.current
      if (!Array.isArray(p.items)) return
      const items = p.items.filter(isRecentItem)
      qc.setQueryData(workspaceKeys.recents(activeWs), { items })
    }

    const handleNotificationNew = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const payload = raw as NotificationRealtimePayload
      const activeWs = workspaceIdRef.current
      if (String(payload.workspaceId ?? '') !== String(activeWs)) return

      const qc = queryClientRef.current
      void qc.invalidateQueries({ queryKey: ['notifications', activeWs] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      void qc.invalidateQueries({ queryKey: ['notifications-unread-count', activeWs] })
      void qc.invalidateQueries({ queryKey: ['workspace-unread-counts', activeWs] })
      void qc.invalidateQueries({
        queryKey: messageKeys.conversationsUnreadSummary(activeWs),
      })
      void qc.invalidateQueries({
        queryKey: messageKeys.conversations(activeWs),
        exact: false,
      })
    }

    const handleNotificationChanged = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const payload = raw as NotificationRealtimePayload
      const activeWs = workspaceIdRef.current
      if (String(payload.workspaceId ?? '') !== String(activeWs)) return

      const qc = queryClientRef.current
      void qc.invalidateQueries({ queryKey: ['notifications', activeWs] })
      void qc.invalidateQueries({ queryKey: ['notifications'] })
      void qc.invalidateQueries({ queryKey: ['notifications-unread-count', activeWs] })
      void qc.invalidateQueries({ queryKey: ['workspace-unread-counts', activeWs] })
      void qc.invalidateQueries({
        queryKey: messageKeys.conversationsUnreadSummary(activeWs),
      })
      void qc.invalidateQueries({
        queryKey: messageKeys.conversations(activeWs),
        exact: false,
      })
    }

    const invalidateLaterCachesForWorkspace = (eventWs: string | undefined) => {
      const activeWs = workspaceIdRef.current
      if (!activeWs) return
      if (eventWs !== undefined && eventWs !== activeWs) return
      const qc = queryClientRef.current
      void qc.invalidateQueries({
        predicate: (q) => {
          const k = q.queryKey
          return (
            Array.isArray(k) &&
            k[0] === 'later-saved-messages' &&
            k[1] === activeWs
          )
        },
      })
        void qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey
            return (
              Array.isArray(k) &&
              k[0] === 'saved-items' &&
              k[1] === activeWs
            )
          },
        })
        void qc.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey
            return (
              Array.isArray(k) &&
              k[0] === 'saved-items-summary' &&
              k[1] === activeWs
            )
          },
        })
      }

    const handleLaterUpdated = (raw: unknown) => {
      const ws =
        raw && typeof raw === 'object' && 'workspaceId' in raw
          ? String((raw as { workspaceId: unknown }).workspaceId ?? '')
          : ''
      if (!ws) return
      invalidateLaterCachesForWorkspace(ws)
    }

    const handleLaterRemoved = (raw: unknown) => {
      let eventWs: string | undefined
      if (raw && typeof raw === 'object' && 'workspaceId' in raw) {
        const v = (raw as { workspaceId: unknown }).workspaceId
        if (typeof v === 'string' && v.length > 0) eventWs = v
      }
      invalidateLaterCachesForWorkspace(eventWs)
    }

    const handleLaterClearedCompleted = (raw: unknown) => {
      if (!raw || typeof raw !== 'object') return
      const ws = (raw as { workspaceId?: string }).workspaceId
      if (typeof ws !== 'string') return
      invalidateLaterCachesForWorkspace(ws)
    }

    if (isDev) {
      console.log(
        '[GlobalSync] Registering entity:sync + draft:sync + scheduled:sync + sidebar:star + sidebar:recent + later:* on Main Gateway',
      )
    }
    socket.on('entity:sync', handleEntitySync)
    socket.on('notification:new', handleNotificationNew)
    socket.on('notification:changed', handleNotificationChanged)
    socket.on('draft:sync', handleDraftSync)
    socket.on('scheduled:sync', handleScheduledSync)
    socket.on('sidebar:star', handleSidebarStar)
    socket.on('sidebar:recent', handleSidebarRecent)
    socket.on('later:updated', handleLaterUpdated)
    socket.on('later:removed', handleLaterRemoved)
    socket.on('later:cleared_completed', handleLaterClearedCompleted)

    return () => {
      if (isDev) {
        console.log('[GlobalSync] Cleanup: socket listeners + leave-workspace')
      }
      socket.off('entity:sync', handleEntitySync)
      socket.off('notification:new', handleNotificationNew)
      socket.off('notification:changed', handleNotificationChanged)
      socket.off('draft:sync', handleDraftSync)
      socket.off('scheduled:sync', handleScheduledSync)
      socket.off('sidebar:star', handleSidebarStar)
      socket.off('sidebar:recent', handleSidebarRecent)
      socket.off('later:updated', handleLaterUpdated)
      socket.off('later:removed', handleLaterRemoved)
      socket.off('later:cleared_completed', handleLaterClearedCompleted)
      socket.emit('leave-workspace', { workspaceId: wid })
    }
  }, [socket, isMainGatewayConnected, workspaceId, queryClient])
}
