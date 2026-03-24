import 'server-only'

import { cookies } from 'next/headers'
import {
  QueryClient,
  dehydrate,
  type DehydratedState,
} from '@tanstack/react-query'
import type { AccountUser, User, Workspace, Channel } from './types'
import { workspaceKeys, channelKeys, authKeys } from './query-keys'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

async function getAuthHeaders(): Promise<HeadersInit> {
  const cookieStore = await cookies()
  const accessToken = cookieStore.get('access_token')?.value
  const refreshToken = cookieStore.get('refresh_token')?.value

  const cookieParts: string[] = []
  if (accessToken) cookieParts.push(`access_token=${accessToken}`)
  if (refreshToken) cookieParts.push(`refresh_token=${refreshToken}`)

  return {
    'Content-Type': 'application/json',
    Cookie: cookieParts.join('; '),
  }
}

async function serverFetch<T>(path: string): Promise<T | null> {
  try {
    const headers = await getAuthHeaders()
    const res = await fetch(`${API_URL}${path}`, {
      headers,
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

// ─── Data fetchers (trả về data trực tiếp) ───────────────────────────────────

export async function getServerUser(): Promise<AccountUser | null> {
  return serverFetch<AccountUser>('/auth/me')
}

export async function getServerWorkspaceProfile(
  workspaceId: string,
): Promise<User | null> {
  return serverFetch<User>(
    `/user-profile/me?workspaceId=${encodeURIComponent(workspaceId)}`,
  )
}

export async function getServerWorkspace(
  workspaceId: string,
): Promise<Workspace | null> {
  return serverFetch<Workspace>(`/workspaces/${workspaceId}`)
}

export async function getServerWorkspaces(): Promise<Workspace[]> {
  return (await serverFetch<Workspace[]>('/workspaces')) ?? []
}

export async function getServerChannels(workspaceId: string): Promise<Channel[]> {
  return (await serverFetch<Channel[]>(`/workspaces/${workspaceId}/channels`)) ?? []
}

// ─── HydrationBoundary helpers ────────────────────────────────────────────────

/**
 * @param workspaceId - ID của workspace cần prefetch data
 * @param data - data đã fetch từ getServerUser/getServerWorkspace (tái dùng, không fetch lại)
 * @returns DehydratedState — state đã được serialize, an toàn để truyền qua props
 */
export async function prefetchWorkspaceData(
  workspaceId: string,
  data: {
    user: AccountUser
    workspaceProfile: User | null
    workspace: Workspace
    workspaces: Workspace[]
    channels: Channel[]
  },
): Promise<DehydratedState> {
  /**
   * Tạo QueryClient MỚI — KHÔNG dùng singleton ở đây!
   *
   * Lý do: Đây chạy trên server. Nếu dùng singleton và có 2 user
   * cùng lúc → data của user A có thể leak sang user B.
   * Mỗi request phải có QueryClient riêng.
   */
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

  /**
   * setQueryData() — đặt data vào cache theo query key
   *
   * Tại sao dùng setQueryData thay vì prefetchQuery ở đây?
   * - prefetchQuery sẽ gọi queryFn (fetch lại API)
   * - Ta đã có data từ Promise.all bên ngoài → không cần fetch lại
   * - setQueryData đặt thẳng data vào cache → nhanh hơn
   */

  queryClient.setQueryData(authKeys.me, data.user)
  queryClient.setQueryData(
    authKeys.workspaceProfile(workspaceId),
    data.workspaceProfile,
  )

  // Cache workspace detail — khớp với useWorkspace(workspaceId)
  queryClient.setQueryData(workspaceKeys.detail(workspaceId), data.workspace)

  // Cache danh sách tất cả workspaces — khớp với useWorkspaces()
  queryClient.setQueryData(workspaceKeys.all, data.workspaces)

  // Cache channels của workspace — khớp với useChannels(workspaceId)
  queryClient.setQueryData(channelKeys.all(workspaceId), data.channels)

  /**
   * dehydrate() — serialize QueryClient cache thành plain object
   *
   * "Dehydrate" nghĩa là "loại bỏ nước" — ở đây là "loại bỏ" các thứ
   * không thể serialize (functions, class instances...) chỉ giữ lại data.
   *
   * Kết quả là một plain object JSON-safe có thể:
   * - Được nhúng vào HTML response
   * - Truyền qua Next.js server-client boundary (qua props)
   * - Được "rehydrate" lại thành QueryClient đầy đủ trên client
   *
   * Đây là kỹ thuật tương tự Redux state serialization hoặc
   * `getServerSideProps` trả về props, nhưng cho TanStack Query.
   */
  return dehydrate(queryClient)
}
