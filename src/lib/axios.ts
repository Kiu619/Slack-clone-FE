import axios from 'axios'
import { getChannelSocket, getSocket } from '@/hooks/use-socket'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Request interceptor: đính kèm socket.id vào header X-Socket-Id
 *
 * Mục đích: khi REST controller broadcast WebSocket sau khi lưu DB,
 * backend có thể exclude socket của người gửi khỏi broadcast.
 * → Người gửi không nhận WebSocket event cho message của chính mình
 * → Tránh duplicate (optimistic update đã có message rồi)
 *
 * REST workspace channels → namespace /channel (broadcast exclude đúng room).
 */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const path = config.url ?? ''
    const isWorkspaceChannelsRest =
      /\/workspaces\/[^/]+\/channels(\/|$)/.test(path)
    const socket = isWorkspaceChannelsRest ? getChannelSocket() : getSocket()
    if (socket.id) {
      config.headers['X-Socket-Id'] = socket.id
    }
  }
  return config
})

// Response interceptor: auto-refresh token on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      try {
        await apiClient.post('/auth/refresh')
        return apiClient(originalRequest)
      } catch {
        if (typeof window !== 'undefined') {
          window.location.href = '/auth'
        }
      }
    }

    return Promise.reject(error)
  },
)

export type ApiError = {
  message: string
  statusCode: number
}
