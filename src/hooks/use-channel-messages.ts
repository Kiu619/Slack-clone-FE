'use client'

import { useCallback, useEffect, useMemo, useRef } from 'react'
import { useMessageStore, DEFAULT_CHANNEL_STATE } from '@/stores/useMessageStore'
import { apiClient } from '@/lib/axios'
import { Message, MessagesPage } from '@/lib/types'
import { useChannelChatSocket, useConversationChatSocket } from '@/hooks/use-socket'
import { endOfDay, isSameDay, startOfDay } from 'date-fns'
import { toast } from 'sonner'

export function useChannelMessages(
  target: { channelId?: string; conversationId?: string },
  currentUserId: string,
  isConnected: boolean
) {
  const channelId = (target.channelId || target.conversationId)!
  const store = useMessageStore()
  const channelState = store.channels[channelId] || DEFAULT_CHANNEL_STATE
  const olderRequestKeyRef = useRef<string | null>(null)
  const newerRequestKeyRef = useRef<string | null>(null)
  
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

  const fetchOlderPage = useCallback(async () => {
    const latestState =
      useMessageStore.getState().channels[channelId] || DEFAULT_CHANNEL_STATE
    if (!latestState.hasOlder || latestState.isLoadingOlder) return null

    const requestKey = `${channelId}:older:${latestState.olderCursor ?? 'latest'}`
    if (olderRequestKeyRef.current === requestKey) return null
    olderRequestKeyRef.current = requestKey
    
    store.setLoadingOlder(channelId, true)
    try {
      const data = await fetchMessages(latestState.olderCursor || undefined, 'backward')
      return {
        messages: data.messages.reverse(),
        nextCursor: data.nextCursor,
        hasOlder: !!data.nextCursor,
      }
    } catch (error) {
      console.error('Failed to fetch older messages', error)
      store.setLoadingOlder(channelId, false)
      return null
    } finally {
      olderRequestKeyRef.current = null
    }
  }, [channelId, fetchMessages, store])

  const fetchOlder = useCallback(async () => {
    const page = await fetchOlderPage()
    if (!page) return
    store.prependMessages(channelId, page.messages, page.nextCursor, page.hasOlder)
  }, [channelId, fetchOlderPage, store])

  const fetchNewer = useCallback(async () => {
    const latestState =
      useMessageStore.getState().channels[channelId] || DEFAULT_CHANNEL_STATE
    if (!latestState.hasNewer || latestState.isLoadingNewer) return

    const requestKey = `${channelId}:newer:${latestState.newerCursor ?? 'latest'}`
    if (newerRequestKeyRef.current === requestKey) return
    newerRequestKeyRef.current = requestKey

    store.setLoadingNewer(channelId, true)
    try {
      const data = await fetchMessages(latestState.newerCursor || undefined, 'forward')
      store.appendMessages(channelId, data.messages.reverse(), data.prevCursor || null, !!data.prevCursor)
    } catch (error) {
      console.error('Failed to fetch newer messages', error)
      store.setLoadingNewer(channelId, false)
    } finally {
      newerRequestKeyRef.current = null
    }
  }, [channelId, fetchMessages, store])

  const jumpToDate = useCallback(async (date: Date) => {
    const cursor = endOfDay(date).toISOString()
    try {
      const data = await fetchMessages(cursor, 'backward')
      const hasMessageOnDate = data.messages.some(msg => isSameDay(new Date(msg.createdAt), date))
      
      if (!hasMessageOnDate) {
        toast.error('There are no messages on the selected date')
        return
      }

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
      toast.error('There was an error loading messages')
      return false
    }
  }, [channelId, fetchMessages, store])

  const jumpToBeginning = useCallback(async (createdAt: string) => {
    const beginningOfTargetDay = startOfDay(new Date(createdAt))
    const cursor = new Date(beginningOfTargetDay.getTime() - 1).toISOString()

    try {
      const data = await fetchMessages(cursor, 'forward')

      if (data.messages.length === 0) {
        toast.error('There are no messages to display')
        return false
      }

      store.initialize(
        channelId,
        data.messages.reverse(),
        null,
        data.prevCursor || null,
        false,
        data.hasMore,
      )
      return true
    } catch (error) {
      console.error('Jump to beginning failed:', error)
      toast.error('There was an error loading the first messages')
      return false
    }
  }, [channelId, fetchMessages, store])

  const jumpToMostRecent = useCallback(async () => {
    try {
      const data = await fetchMessages()

      store.initialize(
        channelId,
        data.messages.reverse(),
        data.nextCursor,
        data.prevCursor || null,
        !!data.nextCursor,
        !!data.prevCursor,
      )
      return true
    } catch (error) {
      console.error('Jump to most recent failed:', error)
      toast.error('There was an error loading the most recent messages')
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
    fetchOlderPage,
    fetchNewer,
    jumpToDate,
    jumpToBeginning,
    jumpToMostRecent,
  }
}
