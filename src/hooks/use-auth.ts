'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { apiClient } from '@/lib/axios'
import { useUserStore } from '@/stores/useUserStore'
import type { User } from '@/lib/types'

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()
  const { setUser, setLoading, clearUser } = useUserStore()

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<User>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<User>('/auth/me')
      return res.data
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
      clearUser()
      queryClient.clear()
      router.push('/auth')
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
