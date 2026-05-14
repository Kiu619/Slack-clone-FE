'use client'

import { useCallback, useEffect, useMemo } from 'react'
import { useMessageStore, DEFAULT_CHANNEL_STATE } from '@/stores/useMessageStore'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { apiClient } from '@/lib/axios'
import { Message, MessagesPage } from '@/lib/types'
import { useChannelChatSocket, useConversationChatSocket } from '@/hooks/use-socket'
import { updateMessageReactions } from '@/hooks/use-messages'
import { endOfDay, isSameDay } from 'date-fns'
import { toast } from 'sonner'
import { useMessageSync } from './use-message-sync'

export function useChannelMessages(
  target: { channelId?: string; conversationId?: string },
  currentUserId: string,
  isConnected: boolean
) {
  const channelId = (target.channelId || target.conversationId)!
  const store = useMessageStore()
  const channelState = store.channels[channelId] || DEFAULT_CHANNEL_STATE
  
  // Transform messageIds to Message objects for the UI
  const messages = useMemo(() => 
    channelState.messageIds.map(id => store.entities[id]).filter(Boolean) as Message[],
    [channelState.messageIds, store.entities]
  )

  const fetchMessages = useCallback(async (cursor?: string, direction: 'forward' | 'backward' = 'backward') => {
    const url = target.channelId
      ? `/channels/${target.channelId}/messages`
      : `/direct-messages/${target.conversationId}/messages`
    
    const res = await apiClient.get<MessagesPage>(url, { params: { cursor, direction } })
    return res.data
  }, [target.channelId, target.conversationId])

  // Initial Fetch
  useEffect(() => {
    if (!channelId || channelState.isInitialized) return

    const init = async () => {
      try {
        const data = await fetchMessages()
        store.initialize(
          channelId,
          data.messages.reverse(), // Backend trả về mới nhất trước -> đảo lại thành cũ -> mới
          data.nextCursor,
          data.prevCursor || null,
          !!data.nextCursor,
          !!data.prevCursor
        )
      } catch (error) {
        console.error('Failed to fetch initial messages', error)
      }
    }

    init()
  }, [channelId, channelState.isInitialized, fetchMessages, store])

  const fetchOlder = useCallback(async () => {
    if (!channelState.hasOlder || channelState.isLoadingOlder) return
    
    store.setLoadingOlder(channelId, true)
    try {
      const data = await fetchMessages(channelState.olderCursor || undefined, 'backward')
      store.prependMessages(channelId, data.messages.reverse(), data.nextCursor, !!data.nextCursor)
    } catch (error) {
      console.error('Failed to fetch older messages', error)
      store.setLoadingOlder(channelId, false)
    }
  }, [channelId, channelState.hasOlder, channelState.isLoadingOlder, channelState.olderCursor, fetchMessages, store])

  const fetchNewer = useCallback(async () => {
    if (!channelState.hasNewer || channelState.isLoadingNewer) return

    store.setLoadingNewer(channelId, true)
    try {
      const data = await fetchMessages(channelState.newerCursor || undefined, 'forward')
      store.appendMessages(channelId, data.messages.reverse(), data.prevCursor || null, !!data.prevCursor)
    } catch (error) {
      console.error('Failed to fetch newer messages', error)
      store.setLoadingNewer(channelId, false)
    }
  }, [channelId, channelState.hasNewer, channelState.isLoadingNewer, channelState.newerCursor, fetchMessages, store])

  const jumpToDate = useCallback(async (date: Date) => {
    const cursor = endOfDay(date).toISOString()
    try {
      const data = await fetchMessages(cursor, 'backward')
      const hasMessageOnDate = data.messages.some(msg => isSameDay(new Date(msg.createdAt), date))
      
      if (!hasMessageOnDate) {
        toast.error('Không có tin nhắn nào trong ngày này')
        return
      }

      store.resetChannel(channelId)
      store.initialize(
        channelId,
        data.messages.reverse(),
        data.nextCursor,
        data.prevCursor || null,
        !!data.nextCursor,
        !!data.prevCursor
      )
      return true // success
    } catch (error) {
      console.error('Jump to date failed:', error)
      toast.error('Có lỗi xảy ra khi tải tin nhắn')
      return false
    }
  }, [channelId, fetchMessages, store])

  // Socket Handlers - Chỉ Join Room, dữ liệu sẽ về qua useGlobalSync
  const socketCallbacks = useMemo(() => ({
    // Không cần onMessage ở đây nữa vì đã có useGlobalSync
  }), [])

  useChannelChatSocket(target.channelId ?? null, isConnected, socketCallbacks)
  useConversationChatSocket(target.conversationId ?? null, isConnected, socketCallbacks)

  return {
    messages,
    hasOlder: channelState.hasOlder,
    hasNewer: channelState.hasNewer,
    isLoadingOlder: channelState.isLoadingOlder,
    isLoadingNewer: channelState.isLoadingNewer,
    isInitialized: channelState.isInitialized,
    fetchOlder,
    fetchNewer,
    jumpToDate,
  }
}
