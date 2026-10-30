import axios, { type AxiosError } from 'axios'
import { toast } from 'sonner'
import { getMainGatewaySocket } from '@/hooks/use-socket'
import { useUserStore } from '@/stores/useUserStore'
import { getQueryClient } from '@/providers/query-provider'
import { refreshAuth, startAuthCoordinator } from './auth-coordinator'

export const apiClient = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

const excluded = ['/auth/refresh', '/auth/sign-out', '/auth/logout', '/auth/magic-link/', '/auth/google/', '/auth/github/']

function redirectToAuth() {
  if (typeof window === 'undefined') return
  const marker = window as Window & { __slackRedirecting?: boolean }
  if (marker.__slackRedirecting || window.location.pathname.startsWith('/auth')) return
  marker.__slackRedirecting = true
  useUserStore.getState().clearUser()
  getQueryClient().clear()
  toast.error('Your session has expired. Please sign in again.')
  const current = window.location.pathname + window.location.search
  window.location.replace(`/auth?redirect=${encodeURIComponent(current)}`)
}

apiClient.interceptors.request.use((config) => {
  startAuthCoordinator()
  if (typeof window !== 'undefined') {
    const socket = getMainGatewaySocket()
    if (socket?.id) config.headers['X-Socket-Id'] = socket.id
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const request = error.config as (typeof error.config & { _retry?: boolean }) | undefined
    const path = request?.url ?? ''
    if (error.response?.status !== 401 || !request || request._retry || excluded.some((item) => path.includes(item))) {
      return Promise.reject(error)
    }
    request._retry = true
    const result = await refreshAuth()
    if (result === 'success') return apiClient(request)
    if (result === 'expired') redirectToAuth()
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
