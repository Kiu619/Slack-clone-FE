import 'server-only'

import { cookies } from 'next/headers'
import {
  QueryClient,
  dehydrate,
  type DehydratedState,
} from '@tanstack/react-query'
import type {
  AccountUser,
  Channel,
  DirectMessageConversation,
  User,
  Workspace,
} from './types'
import { workspaceKeys, channelKeys, authKeys, messageKeys, memberPreferencesKeys } from './query-keys'
import type { MemberPreferencesResponse } from '@/apis'

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

function isRetryableStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
): Promise<Response | null> {
  const backoffs = [0, 100, 300]
  let lastError: unknown = null
  let lastResponse: Response | null = null

  for (const backoff of backoffs) {
    if (backoff > 0) await sleep(backoff)
    try {
      const res = await fetch(url, { ...init, cache: 'no-store' })
      if (!isRetryableStatus(res.status)) return res
      lastResponse = res
    } catch (err) {
      lastError = err
      lastResponse = null
    }
  }

  return lastResponse
}

async function serverFetch<T>(path: string): Promise<T | null> {
  const headers = await getAuthHeaders()

  let res: Response | null = null
  try {
    res = await fetchWithRetry(`${API_URL}${path}`, { headers })
  } catch {
    return null
  }

  if (!res) throw new Error('Authentication service unavailable')

  if (res.status === 401) {
    return null
  } else if (!res.ok) {
    if (res.status >= 500) throw new Error('Authentication service unavailable')
    return null
  }

  try {
    return (await res.json()) as T
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

export async function getServerDirectMessages(
  workspaceId: string,
): Promise<DirectMessageConversation[]> {
  return (
    (await serverFetch<DirectMessageConversation[]>(
      `/workspaces/${workspaceId}/direct-messages`,
    )) ?? []
  )
}

export async function getServerMemberPreferences(
  workspaceId: string,
): Promise<MemberPreferencesResponse | null> {
  return serverFetch<MemberPreferencesResponse | null>(
    `/workspaces/${workspaceId}/member-preferences`,
  )
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
    conversations: DirectMessageConversation[]
    memberPreferences: MemberPreferencesResponse | null
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
  queryClient.setQueryData(
    messageKeys.conversations(workspaceId),
    data.conversations,
  )

  // Cache member preferences for Language & Region autosave
  if (data.memberPreferences) {
    queryClient.setQueryData(
      memberPreferencesKeys.detail(workspaceId),
      data.memberPreferences,
    )
  }

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
