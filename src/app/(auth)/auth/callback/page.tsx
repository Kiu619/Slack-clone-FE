'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslations } from 'next-intl'
import { toast } from 'sonner'
import axios from 'axios'
import { getUserApi, magicLinkVerifyApi } from '@/apis'
import { authKeys } from '@/lib/query-keys'
import { readRedirectParam } from '@/lib/redirect-utils'
import { FullPageCenterSkeleton } from '@/components/loading-skeletons'
import { notifySignedIn } from '@/lib/auth-coordinator'

const AuthCallbackContent = () => {
  const t = useTranslations("auth")
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      const success = searchParams.get('success')
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const error = searchParams.get('error')
      const queryRedirect = searchParams.get('redirect')

      if (error) {
        toast.error(t('authenticationFailed'))
        router.replace('/auth')
        return
      }

      if (success === 'true') {
        try {
          const user = await getUserApi()
          queryClient.setQueryData(authKeys.me, user)
          notifySignedIn()
          toast.success(t('signedInSuccessfully'))
          const safeRedirect =
            readRedirectParam(queryRedirect) ?? '/'
          router.replace(safeRedirect)
        } catch {
          toast.error(t('authenticationFailed'))
          router.replace('/auth')
        }
        return
      }

      if (token && type === 'magic') {
        try {
          const { user, redirect } = await magicLinkVerifyApi(token)
          queryClient.setQueryData(authKeys.me, user)
          notifySignedIn()
          toast.success(t('signedInSuccessfully'))
          const safeRedirect =
            readRedirectParam(
              redirect ?? queryRedirect ?? undefined,
            ) ?? '/'
          router.replace(safeRedirect)
        } catch (err) {
          const message =
            axios.isAxiosError(err) && err.response?.status === 401
              ? t('magicLinkExpired')
              : t('authenticationFailed')
          toast.error(message)
          router.replace('/auth')
        }
        return
      }

      router.replace('/auth')
    }

    handleCallback()
  }, [searchParams, router, queryClient])

  return (
    <FullPageCenterSkeleton
      titleWidth="w-44"
      subtitleWidth="w-56"
      bodyLines={1}
      actionCount={0}
      showIcon={false}
      className="bg-white"
    />
  )
}

const AuthCallbackPage = () => {
  return (
    <Suspense
      fallback={
        <FullPageCenterSkeleton
          titleWidth="w-44"
          subtitleWidth="w-56"
          bodyLines={1}
          actionCount={0}
          showIcon={false}
          className="bg-white"
        />
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

export default AuthCallbackPage
