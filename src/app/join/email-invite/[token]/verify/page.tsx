'use client'

import { useRouter } from 'next/navigation'
import { use, useEffect, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import { useInviteByToken } from '@/hooks/use-email-invite'
import { EmailInviteOtpForm } from '@/modules/invite/email-invite-otp-form'

type ParamsLike = { token: string } | Promise<{ token: string }>

export default function EmailInviteVerifyPage({ params }: { params: ParamsLike }) {
  // Next 16: params là object. Next 15: params là Promise.
  // Chuẩn hoá về Promise rồi unwrap bằng React.use().
  const paramsPromise =
    typeof (params as { then?: unknown }).then === 'function'
      ? (params as Promise<{ token: string }>)
      : Promise.resolve(params as { token: string })
  const resolved = use(paramsPromise)
  const token = resolved?.token ?? ''
  return <EmailInviteVerifyInner token={token} />
}

function EmailInviteVerifyInner({ token }: { token: string }) {
  const router = useRouter()
  const t = useTranslations('joinEmailInvite')

  const inviteQuery = useInviteByToken(token)
  const invite = useMemo(() => {
    const data = inviteQuery.data
    return data && data.found ? data : null
  }, [inviteQuery.data])

  // Nếu token invalid hoặc đã accepted → redirect
  useEffect(() => {
    if (!invite) return
    if (invite.alreadyAccepted || invite.status === 'accepted') {
      router.replace(
        `/join/email-invite/${token}/already-accepted?workspace=${encodeURIComponent(invite.workspaceName)}&workspaceId=${encodeURIComponent(invite.workspaceId)}`,
      )
    } else if (invite.status === 'expired' || invite.status === 'revoked') {
      router.replace(`/join/email-invite/${token}`)
    }
  }, [invite, router, token])

  if (inviteQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white text-sm text-slate-500">
        {t('loading')}
      </div>
    )
  }

  if (!invite) {
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <EmailInviteOtpForm
        token={token}
        email={invite.email}
        workspaceName={invite.workspaceName}
      />
    </div>
  )
}
