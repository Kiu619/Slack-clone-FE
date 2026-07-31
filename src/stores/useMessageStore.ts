import { create } from 'zustand'
import { Message, type Reaction } from '@/lib/types'

interface ChannelMessageState {
  messageIds: string[]
  olderCursor: string | null
  newerCursor: string | null
  hasOlder: boolean
  hasNewer: boolean
  isInitialized: boolean
  isLoadingOlder: boolean
  isLoadingNewer: boolean
}

export const DEFAULT_CHANNEL_STATE: ChannelMessageState = {
  messageIds: [],
  olderCursor: null,
  newerCursor: null,
  hasOlder: false,
  hasNewer: false,
  isInitialized: false,
  isLoadingOlder: false,
  isLoadingNewer: false,
}

interface MessageStore {
  // 1. Entities: Single Source of Truth
  entities: Record<string, Message>
  
  // 2. Channel Lists: Lists of IDs
  channels: Record<string, ChannelMessageState>

  // Actions
  upsertEntities: (messages: Message[]) => void
  updateEntity: (messageId: string, updates: Partial<Message>) => void
  /** Đổi tên hiển thị (#channel) trên mọi message entity thuộc channel */
  patchChannelDisplayName: (channelId: string, channelName: string) => void

  initialize: (channelId: string, messages: Message[], olderCursor: string | null, newerCursor: string | null, hasOlder: boolean, hasNewer: boolean) => void
  prependMessages: (channelId: string, messages: Message[], nextOlderCursor: string | null, hasOlder: boolean) => void
  appendMessages: (channelId: string, messages: Message[], nextNewerCursor: string | null, hasNewer: boolean) => void
  addMessage: (channelId: string, message: Message) => void
  updateMessage: (channelId: string, messageId: string, updates: Partial<Message>) => void // Shortcut for updateEntity + list check
  finalizePendingMessage: (channelId: string, tempId: string, finalMessage: Message) => void
  removeMessage: (channelId: string, messageId: string) => void
  
  setLoadingOlder: (channelId: string, loading: boolean) => void
  setLoadingNewer: (channelId: string, loading: boolean) => void
  resetChannel: (channelId: string) => void
  
  // Helpers
  getMessage: (id: string) => Message | undefined

  // Unified Sync Action
  syncEntity: (domain: string, action: string, payload: any) => void
}

type ReactionUserSnapshot = NonNullable<Reaction['users']>[number]

const getMessageTimestamp = (message?: Message) => {
  if (!message?.createdAt) return Number.POSITIVE_INFINITY
  const timestamp = new Date(message.createdAt).getTime()
  return Number.isNaN(timestamp) ? Number.POSITIVE_INFINITY : timestamp
}

const sortMessageIdsByCreatedAt = (
  messageIds: string[],
  entities: Record<string, Message>,
) => {
  const seen = new Set<string>()
  const dedupedIds: string[] = []

  for (const id of messageIds) {
    if (!id || seen.has(id)) continue
    seen.add(id)
    dedupedIds.push(id)
  }

  const originalOrder = new Map(dedupedIds.map((id, index) => [id, index]))

  return dedupedIds.sort((leftId, rightId) => {
    const leftTime = getMessageTimestamp(entities[leftId])
    const rightTime = getMessageTimestamp(entities[rightId])

    if (leftTime !== rightTime) return leftTime - rightTime

    return (originalOrder.get(leftId) ?? 0) - (originalOrder.get(rightId) ?? 0)
  })
}

export const useMessageStore = create<MessageStore>((set, get) => ({
  entities: {},
  channels: {},

  upsertEntities: (messages) => {
    set((state) => {
      const newEntities = { ...state.entities }
      messages.forEach((m) => {
        const existing = state.entities[m.id]
        if (existing) {
          // Merge thông minh: Ưu tiên dữ liệu mới từ server, nhưng giữ lại các flag local nếu cần
          newEntities[m.id] = {
            ...existing,
            ...m,
            // Ví dụ: Nếu tin nhắn cũ đang có isOptimistic = true, và tin nhắn mới từ server về, 
            // ta sẽ để server ghi đè hoàn toàn.
          }
        } else {
          newEntities[m.id] = m
        }
      })
      return { entities: newEntities }
    })
  },

  updateEntity: (messageId, updates) => {
    set((state) => {
      const entity = state.entities[messageId]

      // X? l? ??c bi?t cho Reaction Update
      if ((updates as any).reactionUpdate) {
        const { emoji, userId, action } = (updates as any).reactionUpdate
        const currentReactions = (entity as any)?.reactions || []

        let newReactions = [...currentReactions]
        const existingReactionIndex = newReactions.findIndex(r => r.emoji === emoji)

        if (action === 'add' || action === 'added') {
          if (existingReactionIndex >= 0) {
            const r = newReactions[existingReactionIndex]
            if (!r.userIds.includes(userId)) {
              newReactions[existingReactionIndex] = {
                ...r,
                count: r.count + 1,
                userIds: [...r.userIds, userId],
                users: [
                  ...(r.users ?? []),
                  {
                    id: userId,
                    name: null,
                    displayName: null,
                    avatar: null,
                  },
                ],
              }
            }
          } else {
            newReactions.push({
              emoji,
              count: 1,
              userIds: [userId],
              users: [
                {
                  id: userId,
                  name: null,
                  displayName: null,
                  avatar: null,
                },
              ],
            })
          }
        } else if (action === 'remove' || action === 'removed') {
          if (existingReactionIndex >= 0) {
            const r = newReactions[existingReactionIndex]
            const newUserIds = r.userIds.filter((uid: string) => uid !== userId)
            if (newUserIds.length === 0) {
              newReactions = newReactions.filter(x => x.emoji !== emoji)
            } else {
              newReactions[existingReactionIndex] = {
                ...r,
                count: newUserIds.length,
                userIds: newUserIds,
                users: (r.users ?? []).filter((u: ReactionUserSnapshot) => u.id !== userId),
              }
            }
          }
        }

        updates = { reactions: newReactions } as any
      }

      const fallbackEntity: Message = {
        id: messageId,
        workspaceId: (updates as any).workspaceId,
        channelId: (updates as any).channelId ?? null,
        conversationId: (updates as any).conversationId ?? null,
        content: '',
        type: 'text',
        parentId: null,
        huddleSessionId: null,
        huddleSnapshot: null,
        alsoSendToChannel: false,
        replyCount: 0,
        replyParticipantIds: [],
        lastReplyAt: null,
        editedAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isPinned: false,
        allowEdit: true,
        user: {
          id: '',
          email: '',
          name: null,
          displayName: null,
          avatar: null,
        },
        reactions: [],
        attachments: [],
      }

      const baseEntity = entity ?? fallbackEntity

      return {
        entities: {
          ...state.entities,
          [messageId]: { ...baseEntity, ...updates } as Message,
        },
      }
    })
  },

  patchChannelDisplayName: (channelId, channelName) => {
    set((state) => {
      const nextEntities = { ...state.entities }
      let changed = false
      for (const id of Object.keys(state.entities)) {
        const m = state.entities[id]
        let nextMsg = m
        let rowChanged = false
        if (m.channelId === channelId && m.channelName !== channelName) {
          nextMsg = { ...m, channelName }
          rowChanged = true
        }
        const srcAtt = nextMsg.attachments
        if (srcAtt?.some((a) => a.channelId === channelId)) {
          const attachments = srcAtt.map((a) =>
            a.channelId === channelId ? { ...a, channelName } : a,
          )
          nextMsg = { ...nextMsg, attachments }
          rowChanged = true
        }
        if (rowChanged) {
          nextEntities[id] = nextMsg
          changed = true
        }
      }
      return changed ? { entities: nextEntities } : state
    })
  },

  initialize: (channelId, messages, olderCursor, newerCursor, hasOlder, hasNewer) => {
    get().upsertEntities(messages)
    const fromServerIds = messages.map((m) => m.id)
    const fromServerSet = new Set(fromServerIds)
    const prev = get().channels[channelId]
    const entities = get().entities
    const pendingOptimisticTail =
      prev?.messageIds.filter(
        (id) =>
          typeof id === 'string' &&
          id.startsWith('temp-') &&
          !fromServerSet.has(id) &&
          entities[id],
      ) ?? []
    const pendingRealtimeHuddleTail =
      prev?.isInitialized
        ? []
        : prev?.messageIds.filter((id) => {
            if (typeof id !== 'string' || fromServerSet.has(id)) return false
            const entity = entities[id]
            return entity?.type === 'huddle'
          }) ?? []
    const nextMessageIds = sortMessageIdsByCreatedAt(
      [...fromServerIds, ...pendingRealtimeHuddleTail, ...pendingOptimisticTail],
      entities,
    )

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...DEFAULT_CHANNEL_STATE,
          messageIds: nextMessageIds,
          olderCursor,
          newerCursor,
          hasOlder,
          hasNewer,
          isInitialized: true,
        },
      },
    }))
  },

  prependMessages: (channelId, newMessages, nextOlderCursor, hasOlder) => {
    get().upsertEntities(newMessages)
    const currentChannel = get().channels[channelId] || DEFAULT_CHANNEL_STATE
    
    const existingIds = new Set(currentChannel.messageIds)
    const filteredIds = newMessages.map(m => m.id).filter(id => !existingIds.has(id))

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...currentChannel,
          messageIds: [...filteredIds, ...currentChannel.messageIds],
          olderCursor: nextOlderCursor,
          hasOlder,
          isLoadingOlder: false,
        },
      },
    }))
  },

  appendMessages: (channelId, newMessages, nextNewerCursor, hasNewer) => {
    get().upsertEntities(newMessages)
    const currentChannel = get().channels[channelId] || DEFAULT_CHANNEL_STATE
    
    const existingIds = new Set(currentChannel.messageIds)
    const filteredIds = newMessages.map(m => m.id).filter(id => !existingIds.has(id))

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...currentChannel,
          messageIds: [...currentChannel.messageIds, ...filteredIds],
          newerCursor: nextNewerCursor,
          hasNewer,
          isLoadingNewer: false,
        },
      },
    }))
  },

  addMessage: (channelId, message) => {
    if (!message?.id) return
    
    get().upsertEntities([message])
    const currentChannel = get().channels[channelId] || DEFAULT_CHANNEL_STATE

    // Luôn gắn tin mới vào danh sách đang mở: khi hasNewer=true mà return sớm
    // sẽ làm mất cả optimistic lẫn entity:sync từ WebSocket (user tưởng "không broadcast").

    // Chống trùng lặp tuyệt đối bằng Set
    const existingIds = new Set(currentChannel.messageIds)
    if (existingIds.has(message.id)) {
      console.log(`[MessageStore] Duplicate message ignored: ${message.id} in channel ${channelId}`)
      return
    }

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...currentChannel,
          messageIds: [...currentChannel.messageIds, message.id],
        },
      },
    }))
  },

  updateMessage: (channelId, messageId, updates) => {
    // 1. Update global entity
    get().updateEntity(messageId, updates)
    
    // 2. Note: we don't need to update the list because it's just IDs
  },

  finalizePendingMessage: (channelId, tempId, finalMessage) => {
    if (!tempId || tempId === finalMessage.id) {
      get().upsertEntities([finalMessage])
      return
    }

    set((state) => {
      const nextEntities = { ...state.entities }
      delete nextEntities[tempId]
      nextEntities[finalMessage.id] = finalMessage

      const ch = state.channels[channelId]
      if (!ch) {
        return { entities: nextEntities }
      }

      const mapped = ch.messageIds.map((id) =>
        id === tempId ? finalMessage.id : id,
      )
      const messageIds = [...new Set(mapped)]

      return {
        entities: nextEntities,
        channels: {
          ...state.channels,
          [channelId]: { ...ch, messageIds },
        },
      }
    })
  },

  removeMessage: (channelId, messageId) => {
    const currentChannel = get().channels[channelId]
    if (!currentChannel) return

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...currentChannel,
          messageIds: currentChannel.messageIds.filter((id) => id !== messageId),
        },
      },
    }))
    // We keep the entity in the store for other views (like threads) until memory cleanup
  },

  setLoadingOlder: (channelId, loading) => {
    const currentChannel = get().channels[channelId] || DEFAULT_CHANNEL_STATE
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: { ...currentChannel, isLoadingOlder: loading },
      },
    }))
  },

  setLoadingNewer: (channelId, loading) => {
    const currentChannel = get().channels[channelId] || DEFAULT_CHANNEL_STATE
    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: { ...currentChannel, isLoadingNewer: loading },
      },
    }))
  },

  resetChannel: (channelId) => {
    set((state) => {
      const newChannels = { ...state.channels }
      delete newChannels[channelId]
      return { channels: newChannels }
    })
  },

  getMessage: (id) => get().entities[id],

  syncEntity: (domain, action, payload) => {
    const { id, data, channelId, conversationId } = payload
    const targetId = channelId || conversationId

    if (domain === 'CHAT') {
      switch (action) {
        case 'CREATE':
          if (data) {
            get().upsertEntities([data])
            if (targetId) {
              const isThreadReply = !!data.parentId;
              const shouldShowInChannel = !isThreadReply || data.alsoSendToChannel;
              if (shouldShowInChannel) {
                get().addMessage(targetId, data)
              }
            }
          }
          break
        case 'UPDATE':
          if (data) {
            get().updateEntity(id, data)
            if (targetId && data.type === 'huddle') {
              const currentChannel = get().channels[targetId] || DEFAULT_CHANNEL_STATE
              if (!currentChannel.messageIds.includes(id)) {
                get().addMessage(targetId, data)
              }
            }
          } else {
            // Nếu chỉ có ID, có thể cần fetch lại hoặc xử lý partial (tùy Backend gửi gì)
            // Hiện tại Backend gửi partial data hoặc toàn bộ.
          }
          break
        case 'DELETE': {
          const transferred = (payload as { transferredToConversationId?: string })
            .transferredToConversationId
          if (targetId) get().removeMessage(targetId, id)
          if (!transferred) {
            get().updateEntity(id, { deletedAt: new Date().toISOString() } as any)
          }
          break
        }
      }
    }
    // TODO: Xử lý domain CHANNEL, USER nếu cần Store chung
  },
}))
