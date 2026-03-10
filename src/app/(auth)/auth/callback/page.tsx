'use client'

import { useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { apiClient } from '@/lib/axios'
import axios from 'axios'

const AuthCallbackContent = () => {
  const searchParams = useSearchParams()
  const router = useRouter()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const handleCallback = async () => {
      const success = searchParams.get('success')
      const token = searchParams.get('token')
      const type = searchParams.get('type')
      const error = searchParams.get('error')
      const redirect = searchParams.get('redirect') ?? '/'

      if (error) {
        toast.error('Authentication failed. Please try again.')
        router.replace('/auth')
        return
      }

      if (success === 'true') {
        try {
          await apiClient.get('/auth/me')
          toast.success('Signed in successfully!')
          router.replace(redirect)
        } catch {
          toast.error('Authentication failed. Please try again.')
          router.replace('/auth')
        }
        return
      }

      if (token && type === 'magic') {
        try {
          await apiClient.post('/auth/magic-link/verify', { token })
          toast.success('Signed in successfully!')
          router.replace(redirect)
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
  }, [searchParams, router])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
      <div className="w-8 h-8 border-4 border-[#3b1141] border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-500 text-sm">Verifying your login&hellip;</p>
    </div>
  )
}

const AuthCallbackPage = () => {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex flex-col items-center justify-center bg-white gap-4">
          <div className="w-8 h-8 border-4 border-[#3b1141] border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Loading...</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  )
}

export default AuthCallbackPage
