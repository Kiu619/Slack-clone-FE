'use client'

import { useEffect, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'

const SOCKET_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080') + '/chat'

/** Singleton socket — tạo một lần, tái dùng toàn app */
let socketInstance: Socket | null = null

export function getSocket(): Socket {
  if (!socketInstance) {
    socketInstance = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      /**
       * autoConnect: false — ta tự gọi socket.connect() trong useSocket()
       * Tránh connect trước khi user đã auth xong
       */
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
    })
  }
  return socketInstance
}

export type SocketStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

/**
 * useSocket — khởi tạo và duy trì kết nối WebSocket
 *
 * Gọi một lần ở top-level component (WorkspaceShell hoặc Main).
 * Trả về { socket, isConnected } để các hook con sử dụng.
 */
export function useSocket() {
  const [isConnected, setIsConnected] = useState(false)
  const socketRef = useRef<Socket>(getSocket())

  useEffect(() => {
    const socket = socketRef.current

    const onConnect = () => setIsConnected(true)
    const onDisconnect = () => setIsConnected(false)
    const onConnectError = (err: Error) => {
      console.error('[Socket] connect_error:', err.message)
      setIsConnected(false)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('connect_error', onConnectError)

    if (!socket.connected) {
      socket.connect()
    } else {
      setIsConnected(true)
    }

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('connect_error', onConnectError)
    }
  }, [])

  return { socket: socketRef.current, isConnected }
}

/**
 * useChannelSocket — join room + lắng nghe events của channel
 *
 * Vấn đề với code cũ:
 * - `socket.connected` là plain property, KHÔNG phải React state
 *   → useEffect không re-run khi socket kết nối xong
 *   → Nếu socket chưa connected khi mount → không join room, mất hết events
 *
 * Fix: nhận `isConnected` (boolean state) từ ngoài vào dependency array
 * Khi socket kết nối xong → isConnected = true → useEffect re-run → join room
 */
export function useChannelSocket(
  channelId: string | null,
  isConnected: boolean,
  callbacks: {
    onMessage?: (msg: unknown) => void
    onTyping?: (data: {
      channelId: string
      user: { userId: string; name: string | null }
      isTyping: boolean
    }) => void
    onMessageUpdated?: (data: unknown) => void
    onMessageDeleted?: (data: { messageId: string }) => void
    onReactionUpdate?: (data: unknown) => void
    onAttachmentAdded?: (data: { messageId: string; attachment: unknown }) => void
  },
) {
  const socket = getSocket()

  useEffect(() => {
    /**
     * Guard: chỉ chạy khi đã connected VÀ có channelId
     * isConnected là React state → useEffect re-run đúng lúc
     */
    if (!channelId || !isConnected) return

    // Join vào room của channel
    socket.emit('join-channel', { channelId })

    // Đăng ký event listeners
    const { onMessage, onTyping, onMessageUpdated, onMessageDeleted, onReactionUpdate, onAttachmentAdded } = callbacks

    if (onMessage) socket.on('message', onMessage)
    if (onTyping) socket.on('typing', onTyping)
    if (onMessageUpdated) socket.on('message:updated', onMessageUpdated)
    if (onMessageDeleted) socket.on('message:deleted', onMessageDeleted)
    if (onReactionUpdate) socket.on('reaction:update', onReactionUpdate)
    if (onAttachmentAdded) socket.on('attachment:added', onAttachmentAdded)

    return () => {
      socket.emit('leave-channel', { channelId })

      if (onMessage) socket.off('message', onMessage)
      if (onTyping) socket.off('typing', onTyping)
      if (onMessageUpdated) socket.off('message:updated', onMessageUpdated)
      if (onMessageDeleted) socket.off('message:deleted', onMessageDeleted)
      if (onReactionUpdate) socket.off('reaction:update', onReactionUpdate)
      if (onAttachmentAdded) socket.off('attachment:added', onAttachmentAdded)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId, isConnected])
}
