'use client'

import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import {
  acceptInviteApi,
  getEmailInviteApi,
  sendOtpApi,
  verifyOtpApi,
  type AcceptInviteResult,
  type EmailInviteLookupResult,
} from '@/apis'
import { emailInviteKeys, workspaceKeys } from '@/lib/query-keys'

/**
 * Lookup public invite info (workspace name, email, status).
 * Used by landing page để biết hiển thị form / redirect already-accepted.
 */
export function useInviteByToken(token: string) {
  return useQuery<EmailInviteLookupResult>({
    queryKey: emailInviteKeys.detail(token),
    queryFn: () => getEmailInviteApi(token),
    enabled: Boolean(token),
    staleTime: 30 * 1000,
    retry: false,
  })
}

/**
 * Send OTP — gọi khi user vào trang verify lần đầu (và bấm resend).
 * Rate-limit phía server: 1 request / 30s.
 */
export function useSendOtp(token: string) {
  return useMutation({
    mutationFn: () => sendOtpApi(token),
  })
}

/**
 * Verify 6-digit OTP — đặt cờ verified trên Redis (TTL 5 phút).
 * Sau khi verify thành công, FE gọi `useAcceptInvite` để hoàn tất.
 */
export function useVerifyOtp(token: string) {
  return useMutation({
    mutationFn: (code: string) => verifyOtpApi(token, code),
  })
}

/**
 * Accept invite — chèn workspace_member, mark invite accepted.
 * - method='otp': cần có cờ verified trên Redis.
 * - method='oauth': cần có JWT (đã OAuth trước đó).
 */
export function useAcceptInvite(token: string) {
  const queryClient = useQueryClient()
  return useMutation<AcceptInviteResult, Error, { name?: string; timeZone?: string; method: 'otp' | 'oauth' }>({
    mutationFn: payload => acceptInviteApi(token, payload),
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: emailInviteKeys.detail(token) })
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all })
      // Invalidate membership cache cho workspace vừa join
      void result.workspace.id
    },
  })
}
