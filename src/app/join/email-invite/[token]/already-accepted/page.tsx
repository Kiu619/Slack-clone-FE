'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'

export default function EmailInviteAlreadyAcceptedPage() {
  const searchParams = useSearchParams()
  const t = useTranslations('joinEmailInvite')
  const workspace = searchParams.get('workspace') ?? ''
  const workspaceId = searchParams.get('workspaceId') ?? ''

  // Nếu BE cung cấp workspaceId → cho user đi thẳng vào workspace đã accept.
  // Fallback: URL cũ không có workspaceId → về trang chủ.
  const ctaHref = workspaceId ? `/workspace/${workspaceId}/` : '/'
  const ctaLabel = workspaceId ? t('goToWorkspace') : t('goToHome')

  return (
    <div className="flex min-h-screen items-center justify-center bg-white p-6">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-xl bg-green-100">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-green-600"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-slate-900">
          {t('alreadyAcceptedTitle')}
        </h1>
        <p className="text-sm text-slate-600">
          {workspace
            ? t('alreadyAcceptedDescription', { workspace })
            : t('alreadyAcceptedDescription', {
                workspace: 'this workspace',
              })}
        </p>
        <Button asChild className="w-full">
          <Link href={ctaHref}>{ctaLabel}</Link>
        </Button>
      </div>
    </div>
  )
}
