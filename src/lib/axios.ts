import axios from 'axios'
import { toast } from 'sonner'
import { getMainGatewaySocket } from '@/hooks/use-socket'

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

// Response interceptor: auto-refresh token on 401 + toast on errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const originalRequest = error.config

    // Handle 401: try token refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true

      apiClient.post('/auth/refresh')
        .then(() => apiClient(originalRequest))
        .catch(() => {
          if (typeof window !== 'undefined') {
            window.location.href = '/auth'
          }
        })

      return Promise.reject(error)
    }

    // Handle other errors: show toast based on error code
    const errorData = error.response?.data
    const errorCode = errorData?.code
    const errorMessage = errorData?.message

    // Show toast for non-401 errors
    if (errorCode && ERROR_CODE_MESSAGES[errorCode]) {
      toast.error(ERROR_CODE_MESSAGES[errorCode])
    } else if (errorMessage && error.response?.status !== 401) {
      // Fallback: show the message from backend if available
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
