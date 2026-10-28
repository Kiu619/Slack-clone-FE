'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  initGithubOAuthApi,
  initGoogleOAuthApi,
} from '@/apis'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'

interface EmailInviteLandingFormProps {
  token: string
  email: string
  workspaceName: string
  showMismatchBanner?: boolean
  mismatchProvider?: 'google' | 'github' | null
}

/**
 * Form nhập first/last name + 2 nút OAuth.
 *
 * Luồng:
 *   - Nhập tên + Continue → FE điều hướng sang `/verify` (FE sẽ tự gọi sendOtp).
 *   - Bấm Google/GitHub → POST /auth/{provider}/init với `inviteToken`.
 *     → BE đặt cookie pending_invite_token + redirect sang OAuth provider.
 *     → OAuth callback về `/oauth-callback?provider=...`.
 *
 * Nếu có query `?mismatch=1` thì hiển thị banner đỏ (ảnh 6) — không render form name.
 */
export function EmailInviteLandingForm({
  token,
  email,
  workspaceName,
  showMismatchBanner,
  mismatchProvider,
}: EmailInviteLandingFormProps) {
  const t = useTranslations('joinEmailInvite')
  const router = useRouter()
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [oauthLoading, setOauthLoading] = useState<'google' | 'github' | null>(
    null,
  )
  const [, startTransition] = useTransition()

  const trimmed = name.trim()
  const canSubmit =
    trimmed.length >= 1 &&
    trimmed.length <= 60 &&
    /^[a-zA-ZÀ-ỹ\s'-]+$/.test(trimmed)

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!canSubmit) {
      setError('Please enter a valid name (letters only, 1–60 characters).')
      return
    }
    // Lưu tên vào sessionStorage để /verify page dùng lại
    try {
      sessionStorage.setItem(
        `email-invite-name:${token}`,
        trimmed,
      )
    } catch {}
    startTransition(() => {
      router.push(`/join/email-invite/${token}/verify`)
    })
  }

  const handleOAuth = async (provider: 'google' | 'github') => {
    setError(null)
    setOauthLoading(provider)
    try {
      if (provider === 'google') {
        await initGoogleOAuthApi({ inviteToken: token })
      } else {
        await initGithubOAuthApi({ inviteToken: token })
      }
      // Navigate sang OAuth — server sẽ set cookie pending_invite_token
      // rồi redirect sang Google/GitHub. Window.location để cookie
      // được attach kịp trước khi redirect.
      window.location.href =
        provider === 'google'
          ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/auth/google`
          : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'}/auth/github`
    } catch (err) {
      setOauthLoading(null)
      const msg =
        provider === 'google'
          ? t('couldNotStartGoogle')
          : t('couldNotStartGithub')
      toast.error(msg)
      setError(msg)
      console.error(err)
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[#3b1141]">
          <span className="text-xl font-bold text-white">SC</span>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {t('titleWorkspace', { workspace: workspaceName })}
        </h1>
        <p className="text-sm text-slate-600">
          {t('invitedAs', { email })}
        </p>
      </div>

      {/* Mismatch banner */}
      {showMismatchBanner && (
        <div
          role="alert"
          className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <div className="font-semibold">{t('mismatchTitle')}</div>
          <div className="mt-1">
            {t('mismatchDescription', { inviteEmail: email })}
          </div>
        </div>
      )}

      {/* Form nhập tên */}
      {!showMismatchBanner && (
        <form onSubmit={handleContinue} className="space-y-3" noValidate>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-700">
              {t('firstLastName')}
            </span>
            <Input
              autoFocus
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Your name"
              maxLength={60}
              aria-invalid={!!error}
              aria-describedby="email-invite-name-error"
            />
          </label>
          {error && (
            <p id="email-invite-name-error" className="text-sm text-red-600">
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="w-full"
            disabled={!canSubmit}
          >
            {t('continue')}
          </Button>
          <p className="text-center text-xs text-slate-500">{t('terms')}</p>
        </form>
      )}

      {/* OAuth buttons */}
      <div className="space-y-2">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth('google')}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === 'google'
            ? t('verifySubmitting')
            : t('continueWithGoogle')}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => handleOAuth('github')}
          disabled={oauthLoading !== null}
        >
          {oauthLoading === 'github'
            ? t('verifySubmitting')
            : t('continueWithGithub')}
        </Button>
      </div>

      {mismatchProvider && (
        <div className="text-center text-xs text-slate-500">
          {mismatchProvider === 'google'
            ? t('continueWithGoogle')
            : t('continueWithGithub')}
        </div>
      )}

      {user && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-center text-xs text-slate-600">
          Currently signed in as <strong>{user.email}</strong>. If this isn't
          the address that received the invitation, sign out first.
        </div>
      )}
    </div>
  )
}
