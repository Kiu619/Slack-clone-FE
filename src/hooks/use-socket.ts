'use client'

import { useEffect, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const CHANNEL_CHAT_SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/chat'
const USER_PROFILE_SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/user-profile'
const CHANNEL_SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/channel'

/** Singleton sockets — tạo một lần, tái dùng toàn app */
let channelChatSocketInstance: Socket | null = null
let userProfileSocketInstance: Socket | null = null
let channelSocketInstance: Socket | null = null

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

export function getUserProfileSocket(): Socket {
  if (!userProfileSocketInstance) {
    userProfileSocketInstance = io(USER_PROFILE_SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return userProfileSocketInstance
}

/** Namespace /channel — metadata channel (created/updated/deleted), room workspace */
export function getChannelSocket(): Socket {
  if (!channelSocketInstance) {
    channelSocketInstance = io(CHANNEL_SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return channelSocketInstance
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * useSocket — khởi tạo và duy trì kết nối WebSocket
 */
export function useSocket() {
  const channelChatSocket = getChannelChatSocket()
  const profileSocket = getUserProfileSocket()
  const channelSocket = getChannelSocket()
  const [isChannelChatConnected, setIsChannelChatConnected] = useState(channelChatSocket.connected)
  const [isProfileConnected, setIsProfileConnected] = useState(profileSocket.connected)
  const [isChannelConnected, setIsChannelConnected] = useState(channelSocket.connected)

  useEffect(() => {
    const onChannelChatConnect = () => setIsChannelChatConnected(true)
    const onChannelChatDisconnect = () => setIsChannelChatConnected(false)

    const onProfileConnect = () => setIsProfileConnected(true)
    const onProfileDisconnect = () => setIsProfileConnected(false)

    const onChannelConnect = () => setIsChannelConnected(true)
    const onChannelDisconnect = () => setIsChannelConnected(false)

    channelChatSocket.on('connect', onChannelChatConnect)
    channelChatSocket.on('disconnect', onChannelChatDisconnect)

    profileSocket.on('connect', onProfileConnect)
    profileSocket.on('disconnect', onProfileDisconnect)

    channelSocket.on('connect', onChannelConnect)
    channelSocket.on('disconnect', onChannelDisconnect)

    if (!channelChatSocket.connected) channelChatSocket.connect()
    if (!profileSocket.connected) profileSocket.connect()
    if (!channelSocket.connected) channelSocket.connect()

    return () => {
      channelChatSocket.off('connect', onChannelChatConnect)
      channelChatSocket.off('disconnect', onChannelChatDisconnect)
      profileSocket.off('connect', onProfileConnect)
      profileSocket.off('disconnect', onProfileDisconnect)
      channelSocket.off('connect', onChannelConnect)
      channelSocket.off('disconnect', onChannelDisconnect)
    }
  }, [channelChatSocket, profileSocket, channelSocket])

  return { isChannelChatConnected, isProfileConnected, isChannelConnected }
}

/**
 * useChannelChatSocket — join room + lắng nghe events của channel
 */
export function useChannelChatSocket(
  channelId: string | null,
  isChannelChatConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onReactionUpdate?: (data: unknown) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
    onAttachmentDeleted?: (data: { messageId: string; attachmentId: string }) => void
    onMessageMetadataUpdated?: (data: {
      messageId: string
      replyCount: number
      replyParticipantIds: string[]
      lastReplyAt: string
    }) => void
  },
) {
  const socket = getChannelChatSocket()

  useEffect(() => {
    if (!channelId || !isChannelChatConnected) return

    socket.emit('join-channel', { channelId })

    const {
      onMessage,
      onMessageUpdated,
      onMessageDeleted,
      onReactionUpdate,
      onAttachmentAdded,
      onAttachmentDeleted,
      onMessageMetadataUpdated,
    } = callbacks

    if (onMessage) socket.on('message', onMessage)
    if (onMessageUpdated) socket.on('message:updated', onMessageUpdated)
    if (onMessageDeleted) socket.on('message:deleted', onMessageDeleted)
    if (onReactionUpdate) socket.on('reaction:update', onReactionUpdate)
    if (onAttachmentAdded) socket.on('attachment:added', onAttachmentAdded)
    if (onAttachmentDeleted) socket.on('attachment:deleted', onAttachmentDeleted)
    if (onMessageMetadataUpdated) {
      socket.on('message:metadata-updated', onMessageMetadataUpdated)
    }

    return () => {
      socket.emit('leave-channel', { channelId })

      if (onMessage) socket.off('message', onMessage)
      if (onMessageUpdated) socket.off('message:updated', onMessageUpdated)
      if (onMessageDeleted) socket.off('message:deleted', onMessageDeleted)
      if (onReactionUpdate) socket.off('reaction:update', onReactionUpdate)
      if (onAttachmentAdded) socket.off('attachment:added', onAttachmentAdded)
      if (onAttachmentDeleted)
        socket.off('attachment:deleted', onAttachmentDeleted)
      if (onMessageMetadataUpdated) {
        socket.off('message:metadata-updated', onMessageMetadataUpdated)
      }
    }
  }, [channelId, isChannelChatConnected, callbacks, socket])
}

/**
 * useThreadSocket — join room thread + lắng nghe events của thread
 */
export function useThreadSocket(
  threadId: string | null,
  isChannelChatConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onReactionUpdate?: (data: unknown) => void
  },
) {
  const socket = getChannelChatSocket()

  useEffect(() => {
    if (!threadId || !isChannelChatConnected) return

    socket.emit('join-thread', { threadId })

    const {
      onMessage,
      onMessageUpdated,
      onMessageDeleted,
      onReactionUpdate,
    } = callbacks

    if (onMessage) socket.on('message', onMessage)
    if (onMessageUpdated) socket.on('message:updated', onMessageUpdated)
    if (onMessageDeleted) socket.on('message:deleted', onMessageDeleted)
    if (onReactionUpdate) socket.on('reaction:update', onReactionUpdate)

    return () => {
      socket.emit('leave-thread', { threadId })

      if (onMessage) socket.off('message', onMessage)
      if (onMessageUpdated) socket.off('message:updated', onMessageUpdated)
      if (onMessageDeleted) socket.off('message:deleted', onMessageDeleted)
      if (onReactionUpdate) socket.off('reaction:update', onReactionUpdate)
    }
  }, [threadId, isChannelChatConnected, callbacks, socket])
}

/**
 * useWorkspaceSocket — join room workspace + lắng nghe profile updates
 */
export function useWorkspaceSocket(
  workspaceId: string | null,
  isProfileConnected: boolean,
  callbacks: {
    onUserProfileUpdated?: (data: Record<string, unknown>) => void
  },
) {
  const socket = getUserProfileSocket()

  useEffect(() => {
    if (!workspaceId || !isProfileConnected) return

    socket.emit('join-workspace', { workspaceId })

    const { onUserProfileUpdated } = callbacks
    if (onUserProfileUpdated) socket.on('user_profile_updated', onUserProfileUpdated)

    return () => {
      socket.emit('leave-workspace', { workspaceId })
      if (onUserProfileUpdated) socket.off('user_profile_updated', onUserProfileUpdated)
    }
  }, [workspaceId, isProfileConnected, callbacks, socket])
}

export type ChannelSocketPayload = {
  workspaceId: string
  channel: unknown
}

export type ChannelDeletedSocketPayload = {
  workspaceId: string
  channelId: string
}

export type ChannelMembershipChangedPayload = {
  workspaceId: string
  channelId: string
  affectedUserId: string
  action: 'member_added' | 'member_removed'
}

/**
 * useChannelWorkspaceSocket — namespace /channel, room `workspace:${workspaceId}`
 * Nhận channel:created | channel:updated | channel:deleted | channel:membership:changed (broadcast từ REST).
 */
export function useChannelWorkspaceSocket(
  workspaceId: string | null,
  isChannelSocketConnected: boolean,
  callbacks: {
    onChannelCreated?: (data: ChannelSocketPayload) => void
    onChannelUpdated?: (data: ChannelSocketPayload) => void
    onChannelDeleted?: (data: ChannelDeletedSocketPayload) => void
    onChannelMembershipChanged?: (data: ChannelMembershipChangedPayload) => void
  },
) {
  const socket = getChannelSocket()

  useEffect(() => {
    if (!workspaceId || !isChannelSocketConnected) return

    socket.emit('join-workspace', { workspaceId })

    const {
      onChannelCreated,
      onChannelUpdated,
      onChannelDeleted,
      onChannelMembershipChanged,
    } = callbacks

    if (onChannelCreated) socket.on('channel:created', onChannelCreated)
    if (onChannelUpdated) socket.on('channel:updated', onChannelUpdated)
    if (onChannelDeleted) socket.on('channel:deleted', onChannelDeleted)
    if (onChannelMembershipChanged) {
      socket.on('channel:membership:changed', onChannelMembershipChanged)
    }

    return () => {
      socket.emit('leave-workspace', { workspaceId })

      if (onChannelCreated) socket.off('channel:created', onChannelCreated)
      if (onChannelUpdated) socket.off('channel:updated', onChannelUpdated)
      if (onChannelDeleted) socket.off('channel:deleted', onChannelDeleted)
      if (onChannelMembershipChanged) {
        socket.off('channel:membership:changed', onChannelMembershipChanged)
      }
    }
  }, [workspaceId, isChannelSocketConnected, callbacks, socket])
}
