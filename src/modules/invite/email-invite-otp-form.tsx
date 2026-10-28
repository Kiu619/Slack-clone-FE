'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp'
import {
  useAcceptInvite,
  useSendOtp,
  useVerifyOtp,
} from '@/hooks/use-email-invite'

interface EmailInviteOtpFormProps {
  token: string
  email: string
  workspaceName: string
}

/**
 * OTP form — 6 ô số, auto-submit khi đủ.
 * Resend cooldown 30s.
 * Sau khi verify OK → auto POST /accept → redirect /workspace/[id].
 */
export function EmailInviteOtpForm({
  token,
  email,
  workspaceName,
}: EmailInviteOtpFormProps) {
  const t = useTranslations('joinEmailInvite')
  const router = useRouter()
  const [code, setCode] = useState('')
  const [resendCooldown, setResendCooldown] = useState(0)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  const sendOtp = useSendOtp(token)
  const verifyOtp = useVerifyOtp(token)
  const acceptInvite = useAcceptInvite(token)

  // Tự động gửi OTP khi vào trang
  useEffect(() => {
    sendOtp.mutate(undefined, {
      onSuccess: () => setResendCooldown(30),
      onError: err => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || t('sendCodeFailed'))
        setErrorMsg(msg || t('sendCodeFailed'))
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Countdown resend
  useEffect(() => {
    if (resendCooldown <= 0) return
    const id = setInterval(() => {
      setResendCooldown(prev => (prev > 0 ? prev - 1 : 0))
    }, 1000)
    return () => clearInterval(id)
  }, [resendCooldown])

  const handleSubmitCode = async (nextCode: string) => {
    if (nextCode.length !== 6 || verifyOtp.isPending || acceptInvite.isPending) {
      return
    }
    setErrorMsg(null)
    try {
      await verifyOtp.mutateAsync(nextCode)
    } catch (err) {
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      if (status === 403) {
        setLocked(true)
        setErrorMsg(t('tooManyAttempts'))
      } else {
        setErrorMsg(msg || t('verifyFailed'))
      }
      setCode('')
      return
    }

    // Verify OK → accept invite
    let storedName: string | null = null
    try {
      storedName = sessionStorage.getItem(`email-invite-name:${token}`)
    } catch {}
    try {
      const result = await acceptInvite.mutateAsync({
        name: storedName ?? undefined,
        method: 'otp',
        timeZone:
          typeof Intl !== 'undefined'
            ? Intl.DateTimeFormat().resolvedOptions().timeZone
            : undefined,
      })
      // Clear stored name
      try {
        sessionStorage.removeItem(`email-invite-name:${token}`)
      } catch {}
      toast.success(
        result.alreadyMember
          ? `You're already a member of ${workspaceName}.`
          : `Joined ${workspaceName}!`,
      )
      router.replace(`/workspace/${result.workspace.id}/`)
    } catch (err) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      toast.error(msg || t('acceptFailed'))
      setErrorMsg(msg || t('acceptFailed'))
      setCode('')
    }
  }

  const handleResend = () => {
    if (resendCooldown > 0) return
    sendOtp.mutate(undefined, {
      onSuccess: () => setResendCooldown(30),
      onError: err => {
        const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        toast.error(msg || t('sendCodeFailed'))
      },
    })
  }

  return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b1141]">
          <span className="text-xl font-bold text-white">SC</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {t('verifyTitle', { email })}
        </h1>
      </div>

      <div className="flex justify-center">
        <InputOTP
          maxLength={6}
          value={code}
          onChange={setCode}
          onComplete={handleSubmitCode}
          disabled={
            locked ||
            verifyOtp.isPending ||
            acceptInvite.isPending ||
            sendOtp.isPending
          }
          autoFocus
          inputMode="numeric"
          pattern="[0-9]*"
        >
          <InputOTPGroup>
            <InputOTPSlot index={0} />
            <InputOTPSlot index={1} />
            <InputOTPSlot index={2} />
            <InputOTPSlot index={3} />
            <InputOTPSlot index={4} />
            <InputOTPSlot index={5} />
          </InputOTPGroup>
        </InputOTP>
      </div>

      {(verifyOtp.isPending || acceptInvite.isPending) && (
        <p className="text-sm text-slate-500">{t('verifySubmitting')}</p>
      )}

      {errorMsg && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700"
        >
          {errorMsg}
        </div>
      )}

      <div className="text-sm text-slate-600">
        {resendCooldown > 0 ? (
          <span>{t('resendIn', { seconds: resendCooldown })}</span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sendOtp.isPending || locked}
            className="font-medium text-[#3b1141] hover:underline disabled:cursor-not-allowed disabled:opacity-60"
          >
            {t('resendCode')}
          </button>
        )}
      </div>
    </div>
  )
}
