'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { apiClient } from '@/lib/axios'
import { useUserStore } from '@/stores/useUserStore'
import type { AccountUser } from '@/lib/types'
import { getUserApi } from '@/apis'
import { authKeys } from '@/lib/query-keys'
import { forceLightTheme } from '@/lib/theme-utils'
import { notifySignedOut, onAuthEvent, startAuthCoordinator } from '@/lib/auth-coordinator'

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser, setLoading, clearUser } = useUserStore()

  useEffect(() => {
    startAuthCoordinator()
    return onAuthEvent((event) => {
      if (event === 'expired' || event === 'signed-out') {
        clearUser()
        queryClient.clear()
        if (!window.location.pathname.startsWith('/auth')) router.replace('/auth')
      }
    })
  }, [clearUser, queryClient, router])

  const {
    data: user,
    isLoading,
    isError,
    refetch: refetchUser,
  } = useQuery<AccountUser>({
    queryKey: authKeys.me,
    queryFn: async () => {
      const user = await getUserApi()
      return user
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (isLoading) {
      setLoading(true)
    } else if (isError || !user) {
      clearUser()
    } else {
      setUser(user)
    }
  }, [user, isLoading, isError, setUser, clearUser, setLoading])

  const logoutMutation = useMutation({
    mutationFn: () => apiClient.post('/auth/sign-out'),
    onSuccess: () => {
      forceLightTheme()
      clearUser()
      queryClient.clear()
      notifySignedOut()
      router.replace('/auth')
    },
    onError: () => {
      clearUser()
      queryClient.clear()
      notifySignedOut()
      router.replace('/auth')
    },
  })

  return {
    user,
    isLoading,
    isAuthenticated: !isError && !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
    refetch: refetchUser,
  }
}
