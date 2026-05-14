import { create } from 'zustand'
import { Message } from '@/lib/types'

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
      if (!entity) return state

      // Xử lý đặc biệt cho Reaction Update
      if ((updates as any).reactionUpdate) {
        const { emoji, userId, action } = (updates as any).reactionUpdate
        const currentReactions = (entity as any).reactions || []
        
        let newReactions = [...currentReactions]
        const existingReactionIndex = newReactions.findIndex(r => r.emoji === emoji)
        
        if (action === 'add' || action === 'added') {
          if (existingReactionIndex >= 0) {
            const r = newReactions[existingReactionIndex]
            if (!r.userIds.includes(userId)) {
              newReactions[existingReactionIndex] = {
                ...r,
                count: r.count + 1,
                userIds: [...r.userIds, userId]
              }
            }
          } else {
            newReactions.push({ emoji, count: 1, userIds: [userId] })
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
                userIds: newUserIds
              }
            }
          }
        }
        
        updates = { reactions: newReactions } as any
      }

      return {
        entities: {
          ...state.entities,
          [messageId]: { ...entity, ...updates } as Message,
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

    set((state) => ({
      channels: {
        ...state.channels,
        [channelId]: {
          ...DEFAULT_CHANNEL_STATE,
          messageIds: [...fromServerIds, ...pendingOptimisticTail],
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
