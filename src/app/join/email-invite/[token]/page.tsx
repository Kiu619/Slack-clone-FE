'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useInviteByToken } from '@/hooks/use-email-invite'
import { useAuth } from '@/hooks/use-auth'
import { EmailInviteLandingForm } from '@/modules/invite/email-invite-landing'

type ParamsLike = { token: string } | Promise<{ token: string }>

export default function EmailInviteLandingPage({ params }: { params: ParamsLike }) {
  // Next 16 dynamic routes: params là object thuần.
  // Next 15: params là Promise.
  // Chuẩn hoá về Promise rồi dùng React.use() để unwrap — Next 16 chấp nhận
  // cả object lẫn Promise ở param dynamic route; wrap trong Promise.resolve()
  // giúp ta dùng một nhánh duy nhất mà không vi phạm Rules of Hooks.
  const paramsPromise =
    typeof (params as { then?: unknown }).then === 'function'
      ? (params as Promise<{ token: string }>)
      : Promise.resolve(params as { token: string })
  const resolved = use(paramsPromise)
  const token = resolved?.token ?? ''

  return <EmailInviteLandingInner token={token} />
}

function EmailInviteLandingInner({ token }: { token: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const t = useTranslations('joinEmailInvite')
  const { user } = useAuth()

  const mismatch = searchParams.get('mismatch') === '1'
  const provider = searchParams.get('provider') as 'google' | 'github' | null

  const inviteQuery = useInviteByToken(token)

  const invite = useMemo(() => {
    const data = inviteQuery.data
    return data && data.found ? data : null
  }, [inviteQuery.data])

  // Auto redirect khi status không phải pending / expired
  useEffect(() => {
    if (!invite) return

    // Đã accepted → sang trang already-accepted
    if (invite.alreadyAccepted || invite.status === 'accepted') {
      router.replace(
        `/join/email-invite/${token}/already-accepted?workspace=${encodeURIComponent(invite.workspaceName)}&workspaceId=${encodeURIComponent(invite.workspaceId)}`,
      )
      return
    }
    // Revoked / expired → ở lại trang này nhưng UI sẽ hiển thị expired state
  }, [invite, router, token])

  // Nếu user đã login và email match → tự accept luôn (tối ưu happy path).
  // Lưu ý: hook này PHẢI đặt trên mọi early-return để không vi phạm Rules of Hooks.
  useEffect(() => {
    if (!user || !invite) return
    if (user.email?.toLowerCase() === invite.email.toLowerCase()) {
      // Tránh loop: chỉ auto-accept nếu không có mismatch query
      if (!mismatch) {
        // Defer để tránh render side-effect trong effect
        const timer = setTimeout(() => {
          router.replace(`/join/email-invite/${token}/oauth-callback?provider=auto`)
        }, 50)
        return () => clearTimeout(timer)
      }
    }
    return undefined
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, invite, mismatch])

  if (inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        {t('loading')}
      </div>
    )
  }

  if (inviteQuery.isError || !invite) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            {t('invalidTitle')}
          </h1>
          <p className="text-sm text-slate-600">{t('invalidDescription')}</p>
        </div>
      </div>
    )
  }

  if (invite.status === 'expired' || invite.status === 'revoked') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white p-6">
        <div className="w-full max-w-md space-y-4 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            {t('expiredTitle')}
          </h1>
          <p className="text-sm text-slate-600">{t('expiredDescription')}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <EmailInviteLandingForm
        token={token}
        email={invite.email}
        workspaceName={invite.workspaceName}
        showMismatchBanner={mismatch}
        mismatchProvider={
          provider === 'google' || provider === 'github' ? provider : null
        }
      />
    </div>
  )
}
