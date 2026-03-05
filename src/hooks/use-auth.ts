'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export interface AuthUser {
  userId: string
  email: string
}

export function useAuth() {
  const queryClient = useQueryClient()
  const router = useRouter()

  const {
    data: user,
    isLoading,
    isError,
  } = useQuery<AuthUser>({
    queryKey: ['auth', 'me'],
    queryFn: () => api.get<AuthUser>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/auth/logout'),
    onSuccess: () => {
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
