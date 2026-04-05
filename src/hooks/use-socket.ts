'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/chat'
const USER_PROFILE_SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/user-profile'

/** Singleton sockets — tạo một lần, tái dùng toàn app */
let socketInstance: Socket | null = null
let userProfileSocketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      autoConnect: false,
    })
  }
  return socketInstance
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

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * useSocket — khởi tạo và duy trì kết nối WebSocket
 */
export function useSocket() {
  const socket = getSocket()
  const profileSocket = getUserProfileSocket()
  const [isConnected, setIsConnected] = useState(socket.connected)
  const [isProfileConnected, setIsProfileConnected] = useState(profileSocket.connected)

  useEffect(() => {
    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)
    
    const onProfileConnect = () => setIsProfileConnected(true)
    const onProfileDisconnect = () => setIsProfileConnected(false)

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    
    profileSocket.on('connect', onProfileConnect)
    profileSocket.on('disconnect', onProfileDisconnect)

    if (!socket.connected) socket.connect()
    if (!profileSocket.connected) profileSocket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      profileSocket.off('connect', onProfileConnect)
      profileSocket.off('disconnect', onProfileDisconnect)
    }
  }, [socket, profileSocket])

  return { isConnected, isProfileConnected }
}

/**
 * useChannelSocket — join room + lắng nghe events của channel
 */
export function useChannelSocket(
  channelId: string | null,
  isConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onReactionUpdate?: (data: unknown) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
    onAttachmentDeleted?: (data: { messageId: string; attachmentId: string }) => void
  },
) {
  const socket = getSocket()

  useEffect(() => {
    if (!channelId || !isConnected) return

    socket.emit('join-channel', { channelId })

    const { onMessage, onMessageUpdated, onMessageDeleted, onReactionUpdate, onAttachmentAdded, onAttachmentDeleted } = callbacks

    if (onMessage) socket.on('message', onMessage)
    if (onMessageUpdated) socket.on('message:updated', onMessageUpdated)
    if (onMessageDeleted) socket.on('message:deleted', onMessageDeleted)
    if (onReactionUpdate) socket.on('reaction:update', onReactionUpdate)
    if (onAttachmentAdded) socket.on('attachment:added', onAttachmentAdded)
    if (onAttachmentDeleted) socket.on('attachment:deleted', onAttachmentDeleted)

    return () => {
      socket.emit('leave-channel', { channelId })

      if (onMessage) socket.off('message', onMessage)
      if (onMessageUpdated) socket.off('message:updated', onMessageUpdated)
      if (onMessageDeleted) socket.off('message:deleted', onMessageDeleted)
      if (onReactionUpdate) socket.off('reaction:update', onReactionUpdate)
      if (onAttachmentAdded) socket.off('attachment:added', onAttachmentAdded)
      if (onAttachmentDeleted) socket.off('attachment:deleted', onAttachmentDeleted)
    }
  }, [channelId, isConnected, callbacks, socket])
}

/**
 * useWorkspaceSocket — join room workspace + lắng nghe profile updates
 */
export function useWorkspaceSocket(
  workspaceId: string | null,
  isProfileConnected: boolean,
  callbacks: {
    onUserProfileUpdated?: (data: any) => void
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
