'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { use, useEffect, useMemo, useRef } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { apiClient } from '@/lib/axios'
import { useAcceptInvite, useInviteByToken } from '@/hooks/use-email-invite'
import { useAuth } from '@/hooks/use-auth'
import { notifySignedIn } from '@/lib/auth-coordinator'

type ParamsLike = { token: string } | Promise<{ token: string }>

/**
 * OAuth callback page — đích đến khi BE redirect từ Google/GitHub callback
 * sau khi OAuth thành công và có cookie `pending_invite_token`.
 *
 * Logic:
 *   1. Lấy token từ URL params, fetch invite info.
 *   2. Lấy user hiện tại (JWT cookies đã được set bởi BE callback).
 *   3. Nếu user.email === invite.email → POST /accept (method=oauth) → redirect workspace.
 *   4. Nếu mismatch → POST /auth/sign-out → redirect về landing với ?mismatch=1.
 *   5. Nếu invite đã accepted → sang trang already-accepted.
 */
export default function EmailInviteOauthCallbackPage({ params }: { params: ParamsLike }) {
  // Next 16: params là object. Next 15: params là Promise.
  // Chuẩn hoá về Promise rồi unwrap bằng React.use().
  const paramsPromise =
    typeof (params as { then?: unknown }).then === 'function'
      ? (params as Promise<{ token: string }>)
      : Promise.resolve(params as { token: string })
  const resolved = use(paramsPromise)
  const token = resolved?.token ?? ''
  return <EmailInviteOauthCallbackInner token={token} />
}

function EmailInviteOauthCallbackInner({ token }: { token: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('joinEmailInvite')
  const signedInNotified = useRef(false)

  const provider =
    (searchParams.get('provider') as 'google' | 'github' | 'auto' | null) ?? 'auto'

  const { user, isLoading: userLoading, refetch: refetchUser } = useAuth()
  const inviteQuery = useInviteByToken(token)
  const acceptInvite = useAcceptInvite(token)

  const invite = useMemo(() => {
    const data = inviteQuery.data
    return data && data.found ? data : null
  }, [inviteQuery.data])

  useEffect(() => {
    if (userLoading || inviteQuery.isLoading || acceptInvite.isPending) return
    if (!invite) return

    // Đã accepted → redirect already-accepted
    if (invite.alreadyAccepted || invite.status === 'accepted') {
      router.replace(
        `/join/email-invite/${token}/already-accepted?workspace=${encodeURIComponent(invite.workspaceName)}&workspaceId=${encodeURIComponent(invite.workspaceId)}`,
      )
      return
    }

    // User chưa login → redirect về landing (FE cần chờ OAuth callback set cookie rồi fetch /auth/me)
    if (!user) {
      // Một số trường hợp user state chưa load kịp sau OAuth → refetch
      refetchUser()
      const timeout = setTimeout(() => {
        if (!user) {
          router.replace(`/join/email-invite/${token}`)
        }
      }, 3000)
      return () => clearTimeout(timeout)
    }

    // OAuth callback vừa tạo cookie/session; báo cho các tab và socket dùng
    // cùng coordinator biết rằng đây là một phiên đăng nhập mới.
    if (!signedInNotified.current) {
      signedInNotified.current = true
      notifySignedIn()
    }

    const userEmail = (user.email ?? '').toLowerCase()
    const inviteEmail = invite.email.toLowerCase()

    // Mismatch → logout + redirect back với ?mismatch=1
    if (userEmail !== inviteEmail) {
      ;(async () => {
        try {
          await apiClient.post('/auth/sign-out')
        } catch {
          // ignore — vẫn redirect
        }
        const params = new URLSearchParams({ mismatch: '1' })
        if (provider === 'google' || provider === 'github') {
          params.set('provider', provider)
        }
        router.replace(`/join/email-invite/${token}?${params}`)
      })()
      return
    }

    // Match → accept invite (OAuth)
    ;(async () => {
      try {
        const result = await acceptInvite.mutateAsync({
          method: 'oauth',
          timeZone:
            typeof Intl !== 'undefined'
              ? Intl.DateTimeFormat().resolvedOptions().timeZone
              : undefined,
        })
        toast.success(
          result.alreadyMember
            ? `You're already a member of ${invite.workspaceName}.`
            : `Joined ${invite.workspaceName}!`,
        )
        router.replace(`/workspace/${result.workspace.id}/`)
      } catch (err) {
        const msg =
          (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || t('acceptFailed'))
        // Fallback về landing
        router.replace(`/join/email-invite/${token}`)
      }
    })()
  }, [
    user,
    userLoading,
    invite,
    inviteQuery.isLoading,
    acceptInvite,
    router,
    token,
    provider,
    refetchUser,
    t,
  ])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
      {acceptInvite.isPending || inviteQuery.isLoading || userLoading
        ? t('verifySubmitting')
        : t('loading')}
    </div>
  )
}
