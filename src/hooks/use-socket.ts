'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import type { HuddleSessionSnapshot, HuddleStateSnapshot } from '@/lib/huddle'

const CHANNEL_CHAT_SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/chat'

/** Singleton sockets — tạo một lần, tái dùng toàn app */
let channelChatSocketInstance: Socket | null = null
let mainGatewaySocketInstance: Socket | null = null

export function getChannelChatSocket(): Socket {
  if (!channelChatSocketInstance) {
    channelChatSocketInstance = io(CHANNEL_CHAT_SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return channelChatSocketInstance
}

/** Main Gateway Socket (Default namespace) — Unified sync, DM, channel rooms, profile updates */
export function getMainGatewaySocket(): Socket {
  if (!mainGatewaySocketInstance) {
    const MAIN_GATEWAY_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
    mainGatewaySocketInstance = io(MAIN_GATEWAY_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return mainGatewaySocketInstance
}

/**
 * useUserSocket — lắng nghe các sự kiện cá nhân (ví dụ: tin nhắn DM mới từ bất kỳ đâu)
 */
export function useUserSocket(
  userId: string | null,
  isConnected: boolean,
  callbacks: {
    onNewMessage?: (msg: unknown) => void
    onNewSidebarMessage?: (msg: unknown) => void
    onAttachmentAdded?: (data: unknown) => void
    onMessageUpdated?: (data: unknown) => void
  },
) {
  const socket = getMainGatewaySocket()

  useEffect(() => {
    if (!userId || !isConnected) return

    // Room user:${userId} đã được backend join tự động khi connect
    const { onNewMessage, onNewSidebarMessage, onAttachmentAdded, onMessageUpdated } = callbacks

    if (onNewMessage) socket.on('message', onNewMessage)
    if (onNewSidebarMessage) socket.on('message:sidebar', onNewSidebarMessage)
    if (onAttachmentAdded) socket.on('attachment:added', onAttachmentAdded)
    if (onMessageUpdated) socket.on('message:updated', onMessageUpdated)

    return () => {
      if (onNewMessage) socket.off('message', onNewMessage)
      if (onNewSidebarMessage) socket.off('message:sidebar', onNewSidebarMessage)
      if (onAttachmentAdded) socket.off('attachment:added', onAttachmentAdded)
      if (onMessageUpdated) socket.off('message:updated', onMessageUpdated)
    }
  }, [userId, isConnected, callbacks, socket])
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * useSocket — khởi tạo và duy trì kết nối WebSocket (main `/` — channel metadata qua `entity:sync` trên cùng socket)
 */
export function useSocket() {
  const mainGatewaySocket = getMainGatewaySocket()

  const [isMainGatewayConnected, setIsMainGatewayConnected] = useState(mainGatewaySocket.connected)

  useEffect(() => {
    const onMainGatewayConnect = () => {
      console.log('[Socket] / (MainGateway) namespace CONNECTED')
      setIsMainGatewayConnected(true)
    }
    const onMainGatewayDisconnect = () => {
      console.log('[Socket] / (MainGateway) namespace DISCONNECTED')
      setIsMainGatewayConnected(false)
    }

    mainGatewaySocket.on('connect', onMainGatewayConnect)
    mainGatewaySocket.on('disconnect', onMainGatewayDisconnect)

    if (!mainGatewaySocket.connected) mainGatewaySocket.connect()

    return () => {
      mainGatewaySocket.off('connect', onMainGatewayConnect)
      mainGatewaySocket.off('disconnect', onMainGatewayDisconnect)
    }
  }, [mainGatewaySocket])

  return {
    isMainGatewayConnected,
    /** Giữ tên cũ: profile realtime nay dùng main gateway */
    isProfileConnected: isMainGatewayConnected,
    isConnected: isMainGatewayConnected,
    socket: mainGatewaySocket,
  }
}

/**
 * useChannelChatSocket — join room + lắng nghe events của channel
 */
export function useChannelChatSocket(
  channelId: string | null,
  isConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
    onAttachmentDeleted?: (data: { messageId: string; attachmentId: string }) => void
    onMessagePinned?: (data: { messageId: string; isPinned: boolean }) => void
    onMessageMetadataUpdated?: (data: {
      messageId: string
      replyCount: number
      replyParticipantIds: string[]
      lastReplyAt: string
    }) => void
  },
) {
  const socket = getMainGatewaySocket()
  const callbacksRef = useRef(callbacks)
  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!channelId || !isConnected) return

    socket.emit('join-channel', { channelId })

    const onMessage = (msg: any) => callbacksRef.current.onMessage?.(msg)
    const onMessageUpdated = (data: any) => callbacksRef.current.onMessageUpdated?.(data)
    const onMessageDeleted = (data: any) => callbacksRef.current.onMessageDeleted?.(data)
    const onAttachmentAdded = (data: any) => callbacksRef.current.onAttachmentAdded?.(data)
    const onAttachmentDeleted = (data: any) => callbacksRef.current.onAttachmentDeleted?.(data)
    const onMessagePinned = (data: any) => callbacksRef.current.onMessagePinned?.(data)
    const onMessageMetadataUpdated = (data: any) => callbacksRef.current.onMessageMetadataUpdated?.(data)

    socket.on('message', onMessage)
    socket.on('message:updated', onMessageUpdated)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('attachment:added', onAttachmentAdded)
    socket.on('attachment:deleted', onAttachmentDeleted)
    socket.on('message:pinned', onMessagePinned)
    socket.on('message:metadata-updated', onMessageMetadataUpdated)

    return () => {
      // Slack behavior: không nhất thiết phải emit leave-channel ngay lập tức để tránh flicker room
      socket.off('message', onMessage)
      socket.off('message:updated', onMessageUpdated)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('attachment:added', onAttachmentAdded)
      socket.off('attachment:deleted', onAttachmentDeleted)
      socket.off('message:pinned', onMessagePinned)
      socket.off('message:metadata-updated', onMessageMetadataUpdated)
    }
  }, [channelId, isConnected, socket])
}

/**
 * useConversationChatSocket — join room + lắng nghe events của DM conversation
 */
export function useConversationChatSocket(
  conversationId: string | null,
  isConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
    onAttachmentDeleted?: (data: { messageId: string; attachmentId: string }) => void
    onMessagePinned?: (data: { messageId: string; isPinned: boolean }) => void
    onMessageMetadataUpdated?: (data: {
      messageId: string
      replyCount: number
      replyParticipantIds: string[]
      lastReplyAt: string
    }) => void
  },
) {
  const socket = getMainGatewaySocket()
  const callbacksRef = useRef(callbacks)
  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!conversationId || !isConnected) return

    socket.emit('join-conversation', { conversationId })

    const onMessage = (msg: any) => callbacksRef.current.onMessage?.(msg)
    const onMessageUpdated = (data: any) => callbacksRef.current.onMessageUpdated?.(data)
    const onMessageDeleted = (data: any) => callbacksRef.current.onMessageDeleted?.(data)
    const onAttachmentAdded = (data: any) => callbacksRef.current.onAttachmentAdded?.(data)
    const onAttachmentDeleted = (data: any) => callbacksRef.current.onAttachmentDeleted?.(data)
    const onMessagePinned = (data: any) => callbacksRef.current.onMessagePinned?.(data)
    const onMessageMetadataUpdated = (data: any) => callbacksRef.current.onMessageMetadataUpdated?.(data)

    socket.on('message', onMessage)
    socket.on('message:updated', onMessageUpdated)
    socket.on('message:deleted', onMessageDeleted)
    socket.on('attachment:added', onAttachmentAdded)
    socket.on('attachment:deleted', onAttachmentDeleted)
    socket.on('message:pinned', onMessagePinned)
    socket.on('message:metadata-updated', onMessageMetadataUpdated)

    return () => {
      socket.off('message', onMessage)
      socket.off('message:updated', onMessageUpdated)
      socket.off('message:deleted', onMessageDeleted)
      socket.off('attachment:added', onAttachmentAdded)
      socket.off('attachment:deleted', onAttachmentDeleted)
      socket.off('message:pinned', onMessagePinned)
      socket.off('message:metadata-updated', onMessageMetadataUpdated)
    }
  }, [conversationId, isConnected, socket])
}

/**
 * useThreadSocket — join room thread + lắng nghe events của thread (Thread Panel)
 */
export function useThreadSocket(
  threadId: string | null,
  isConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
    onAttachmentDeleted?: (data: { messageId: string; attachmentId: string }) => void
    onMessagePinned?: (data: { messageId: string; isPinned: boolean }) => void
  },
) {
  const socket = getChannelChatSocket()
  const callbacksRef = useRef(callbacks)
  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!threadId || !isConnected) return

    socket.emit('join-thread', { threadId })

    const onMessage = (msg: any) => callbacksRef.current.onMessage?.(msg)
    const onMessageUpdated = (data: any) => callbacksRef.current.onMessageUpdated?.(data)
    const onMessageDeleted = (data: any) => callbacksRef.current.onMessageDeleted?.(data)
    const onAttachmentAdded = (data: any) => callbacksRef.current.onAttachmentAdded?.(data)
    const onAttachmentDeleted = (data: any) => callbacksRef.current.onAttachmentDeleted?.(data)
    const onMessagePinned = (data: any) => callbacksRef.current.onMessagePinned?.(data)

    socket.on('thread-panel:message', onMessage)
    socket.on('thread-panel:message_updated', onMessageUpdated)
    socket.on('thread-panel:message_deleted', onMessageDeleted)
    socket.on('thread-panel:attachment_added', onAttachmentAdded)
    socket.on('thread-panel:attachment_deleted', onAttachmentDeleted)
    socket.on('thread-panel:message_pinned', onMessagePinned)

    return () => {
      socket.off('thread-panel:message', onMessage)
      socket.off('thread-panel:message_updated', onMessageUpdated)
      socket.off('thread-panel:message_deleted', onMessageDeleted)
      socket.off('thread-panel:attachment_added', onAttachmentAdded)
      socket.off('thread-panel:attachment_deleted', onAttachmentDeleted)
      socket.off('thread-panel:message_pinned', onMessagePinned)
    }
  }, [threadId, isConnected, socket])
}

/**
 * useWorkspaceSocket — join room workspace trên main gateway + `user_profile_updated`
 */
export function useWorkspaceSocket(
  workspaceId: string | null,
  isConnected: boolean,
  callbacks: {
    onUserProfileUpdated?: (data: Record<string, unknown>) => void
    onEntitySync?: (data: { domain: string; action: string; payload: Record<string, unknown> }) => void
    onHuddleState?: (data: {
      reason: string
      target: { workspaceId: string; entityType: string; entityId: string }
      state: HuddleStateSnapshot
      session: HuddleSessionSnapshot | null
    }) => void
    onWorkspacePresenceSnapshot?: (data: {
      workspaceId: string
      connectedUserIds: string[]
    }) => void
    onWorkspacePresenceUpdated?: (data: {
      workspaceId: string
      userId: string
      isConnected: boolean
    }) => void
  },
) {
  const socket = getMainGatewaySocket()
  const callbacksRef = useRef(callbacks)
  useLayoutEffect(() => {
    callbacksRef.current = callbacks
  }, [callbacks])

  useEffect(() => {
    if (!workspaceId || !isConnected) return

    socket.emit('join-workspace', { workspaceId })

    const onUserProfileUpdated = (data: Record<string, unknown>) => {
      callbacksRef.current.onUserProfileUpdated?.(data)
    }
    const onWorkspacePresenceSnapshot = (data: {
      workspaceId: string
      connectedUserIds: string[]
    }) => {
      callbacksRef.current.onWorkspacePresenceSnapshot?.(data)
    }
    const onWorkspacePresenceUpdated = (data: {
      workspaceId: string
      userId: string
      isConnected: boolean
    }) => {
      callbacksRef.current.onWorkspacePresenceUpdated?.(data)
    }
    const onEntitySync = (data: {
      domain: string
      action: string
      payload: Record<string, unknown>
    }) => {
      callbacksRef.current.onEntitySync?.(data)
    }
    const onHuddleState = (data: {
      reason: string
      target: { workspaceId: string; entityType: string; entityId: string }
      state: HuddleStateSnapshot
      session: HuddleSessionSnapshot | null
    }) => {
      callbacksRef.current.onHuddleState?.(data)
    }

    socket.on('user_profile_updated', onUserProfileUpdated)
    socket.on('entity:sync', onEntitySync)
    socket.on('huddle:state', onHuddleState)
    socket.on('workspace_presence_snapshot', onWorkspacePresenceSnapshot)
    socket.on('workspace_presence_updated', onWorkspacePresenceUpdated)

    return () => {
      socket.emit('leave-workspace', { workspaceId })
      socket.off('user_profile_updated', onUserProfileUpdated)
      socket.off('entity:sync', onEntitySync)
      socket.off('huddle:state', onHuddleState)
      socket.off('workspace_presence_snapshot', onWorkspacePresenceSnapshot)
      socket.off('workspace_presence_updated', onWorkspacePresenceUpdated)
    }
  }, [workspaceId, isConnected, socket])
}

/**
 * leaveHuddleSocket — gửi leave request qua WebSocket, trả về state mới
 */
export function leaveHuddleSocket(
  target: { workspaceId: string; entityType: 'channel' | 'dm'; entityId: string },
  socket: Socket,
): Promise<HuddleStateSnapshot | null> {
  return new Promise((resolve) => {
    socket.emit(
      'huddle:leave',
      {
        workspaceId: target.workspaceId,
        entityType: target.entityType,
        entityId: target.entityId,
      },
      (response: { success: boolean; state?: HuddleStateSnapshot }) => {
        resolve(response?.state ?? null)
      },
    )
  })
}
