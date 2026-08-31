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

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser, setLoading, clearUser } = useUserStore()

  const {
    data: user,
    isLoading,
    isError,
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
    mutationFn: () => apiClient.post('/auth/logout'),
    onSuccess: () => {
      forceLightTheme()
      clearUser()
      queryClient.clear()
      router.replace('/auth')
    },
    onError: () => {
      clearUser()
      queryClient.clear()
      router.replace('/auth')
    },
  })

  return {
    user,
    isLoading,
    isAuthenticated: !isError && !!user,
    logout: logoutMutation.mutate,
    isLoggingOut: logoutMutation.isPending,
  }
}
