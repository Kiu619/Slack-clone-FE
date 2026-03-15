import { apiClient } from "@/lib/axios"
import { User } from "@/lib/types"

// User
export const getUserApi = async () => {
  const res = await apiClient.get<User>('/auth/me')
  return res.data
}

export const magicLinkVerifyApi = async (token: string) => {
  const res = await apiClient.post<{ user: User }>('/auth/magic-link/verify', { token })
  return res.data.user
}