'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import axios from 'axios'
import { useUserStore } from '@/stores/useUserStore'
import { getUserApi, magicLinkVerifyApi } from '@/apis'
import { authKeys } from '@/lib/query-keys'
import { readRedirectParam } from '@/lib/redirect-utils'
import { FullPageCenterSkeleton } from '@/components/loading-skeletons'

const AuthCallbackContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const setUser = useUserStore((s) => s.setUser)
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
        toast.error('Authentication failed. Please try again.')
        router.replace('/auth')
        return
      }

      if (success === 'true') {
        try {
          const user = await getUserApi()
          setUser(user)
          queryClient.setQueryData(authKeys.me, user)
          toast.success('Signed in successfully!')
          const safeRedirect =
            readRedirectParam(queryRedirect) ?? '/'
          router.replace(safeRedirect)
        } catch {
          toast.error('Authentication failed. Please try again.')
          router.replace('/auth')
        }
        return
      }

      if (token && type === 'magic') {
        try {
          const { user, redirect } = await magicLinkVerifyApi(token)
          setUser(user)
          queryClient.setQueryData(authKeys.me, user)
          toast.success('Signed in successfully!')
          const safeRedirect =
            readRedirectParam(
              redirect ?? queryRedirect ?? undefined,
            ) ?? '/'
          router.replace(safeRedirect)
        } catch (err) {
          const message =
            axios.isAxiosError(err) && err.response?.status === 401
              ? 'Magic link has expired. Please request a new one.'
              : 'Authentication failed. Please try again.'
          toast.error(message)
          router.replace('/auth')
        }
        return
      }

      router.replace('/auth')
    }

    handleCallback()
  }, [searchParams, router, setUser, queryClient])

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
