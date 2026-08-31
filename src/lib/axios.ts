import axios, { type AxiosError } from 'axios'
import { toast } from 'sonner'
import { getMainGatewaySocket } from '@/hooks/use-socket'
import { useUserStore } from '@/stores/useUserStore'
import { getQueryClient } from '@/providers/query-provider'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
})

/**
 * Maps error codes from backend to user-friendly messages.
 * These are displayed via toast notifications.
 */
const ERROR_CODE_MESSAGES: Record<string, string> = {
  VALIDATION_ERROR: 'Please check your input and try again',
  FORBIDDEN: 'You do not have permission to perform this action',
  UNAUTHORIZED: 'Please log in to continue',
  BAD_REQUEST: 'Invalid request',
  INTERNAL_ERROR: 'Something went wrong on our end',
  THIRD_PARTY_ERROR: 'External service temporarily unavailable',
  CONFLICT: 'Resource conflict detected',
  TOO_MANY_REQUESTS: 'Too many requests. Please try again later',
}

function clearAuthState() {
  useUserStore.getState().clearUser()
  getQueryClient().clear()
}

/**
 * Request interceptor: đính kèm socket.id vào header X-Socket-Id
 *
 * Mục đích: khi REST controller broadcast WebSocket sau khi lưu DB,
 * backend có thể exclude socket của người gửi khỏi broadcast.
 * → Người gửi không nhận WebSocket event cho message của chính mình
 * → Tránh duplicate (optimistic update đã có message rồi)
 */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const socket = getMainGatewaySocket()
    if (socket?.id) {
      config.headers['X-Socket-Id'] = socket.id
    }
  }
  return config
})

// ────────────────────────────────────────────────────────────────────────────
// 401 refresh queue — tránh gọi /auth/refresh nhiều lần song song
// ────────────────────────────────────────────────────────────────────────────

let isRefreshing = false
let refreshFailed = false
let pendingQueue: Array<{
  resolve: (value: unknown) => void
  reject: (reason?: unknown) => void
}> = []

function flushQueue(error: unknown) {
  pendingQueue.forEach(({ reject }) => reject(error))
  pendingQueue = []
}

function redirectToAuth() {
  if (typeof window === 'undefined') return
  // Tránh chạy 2 lần nếu nhiều call 401 cùng lúc
  if ((window as Window & { __slackRedirecting?: boolean }).__slackRedirecting) return
  ;(window as Window & { __slackRedirecting?: boolean }).__slackRedirecting = true

  const currentPath = window.location.pathname + window.location.search
  const redirectUrl =
    currentPath !== '/auth' && currentPath !== '/auth/'
      ? `/auth?redirect=${encodeURIComponent(currentPath)}`
      : '/auth'

  clearAuthState()
  toast.error('Your session has expired. Please sign in again.')
  // Dùng replace để không tạo history entry, tránh back-button bị kẹt ở vòng loop
  window.location.replace(redirectUrl)
}

// Response interceptor: auto-refresh token on 401 + toast on errors
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as (typeof error.config & {
      _retry?: boolean
    }) | undefined
    const status = error.response?.status

    // Refresh call đã fail rồi — không retry, chỉ reject để caller xử lý
    if (status === 401 && refreshFailed) {
      return Promise.reject(error)
    }

    // Handle 401: try token refresh
    if (status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true

      // Có request khác đang refresh — chờ và dùng kết quả
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          pendingQueue.push({ resolve, reject })
        })
          .then(() => apiClient(originalRequest))
          .catch((err) => Promise.reject(err))
      }

      isRefreshing = true
      try {
        await apiClient.post('/auth/refresh')
        isRefreshing = false
        // Resolve tất cả request đang chờ với retry của chúng
        const queue = pendingQueue
        pendingQueue = []
        queue.forEach(({ resolve }) => resolve(undefined))
        return apiClient(originalRequest)
      } catch (refreshError) {
        isRefreshing = false
        refreshFailed = true
        flushQueue(refreshError)
        redirectToAuth()
        return Promise.reject(refreshError)
      }
    }

    // Handle other errors: show toast based on error code
    const errorData = error.response?.data as
      | { code?: string; message?: string }
      | undefined
    const errorCode = errorData?.code
    const errorMessage = errorData?.message

    if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
      toast.error(ERROR_CODE_MESSAGES[errorCode])
    } else if (errorMessage && status !== 401) {
      toast.error(errorMessage)
    }

    return Promise.reject(error)
  },
)

export type ApiError = {
  statusCode: number
  code: string
  message: string
  timestamp?: string
  path?: string
}