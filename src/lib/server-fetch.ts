/**
 * SERVER-SIDE FETCH UTILITY
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * File này chỉ chạy trên SERVER.
 *
 * `server-only` là package của Next.js đảm bảo file này KHÔNG BAO GIỜ được
 * import trên client. Nếu vô tình import → build error ngay → bắt lỗi sớm.
 *
 * Tại sao cần file này?
 * ─────────────────────
 * Trên client: axios + `withCredentials: true` → browser tự đính cookie.
 * Trên server: không có browser → phải đọc cookie thủ công từ Next.js headers
 * và đính vào request header khi gọi NestJS backend.
 *
 * Có 2 loại function trong file này:
 *
 * 1. getServer*() — trả về data trực tiếp, dùng cho auth guard và render
 * 2. prefetchWorkspaceData() — trả về QueryClient đã được "fill" data,
 *    dùng với HydrationBoundary để hydrate TanStack Query cache trên client
 */

import 'server-only'

import { cookies } from 'next/headers'
import {
  QueryClient,
  dehydrate,
  type DehydratedState,
} from '@tanstack/react-query'
import type { User, Workspace, Channel } from './types'
// Import từ query-keys.ts (isomorphic) thay vì hooks (client-only)
// → tránh lỗi "use client module imported in server-only file"
import { workspaceKeys, channelKeys } from './query-keys'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * getAuthHeaders() — đọc cookie từ request hiện tại và tạo header
 *
 * `cookies()` từ 'next/headers' là Dynamic API của Next.js.
 * Gọi nó làm cho route trở thành "dynamic" (không được cache bởi Next.js).
 * Đây là hành vi đúng vì data của mỗi user là khác nhau.
 */
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

/**
 * serverFetch<T>() — hàm fetch generic cho server
 *
 * `cache: 'no-store'` vì data là user-specific:
 * - Không được cache giữa các user khác nhau
 * - Không được serve data cũ cho cùng một user
 *
 * Return null thay vì throw error để:
 * - Auth error (401/403) → layout redirect về /auth
 * - Not found (404) → layout redirect về /
 * - Network error → layout có thể xử lý gracefully
 */
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
// Dùng cho: auth guard, WorkspaceShell props

export async function getServerUser(): Promise<User | null> {
  return serverFetch<User>('/auth/me')
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
 * prefetchWorkspaceData() — prefetch tất cả data cần thiết cho workspace layout
 *
 * Hàm này dùng kỹ thuật "Server-side prefetching" của TanStack Query:
 *
 * LUỒNG HOẠT ĐỘNG:
 * ─────────────────
 * 1. Tạo QueryClient MỚI trên server (mỗi request tạo một cái riêng)
 * 2. Dùng `queryClient.prefetchQuery()` để fetch data vào server QueryClient
 *    Điều này giống `useQuery` nhưng chạy trên server
 * 3. `dehydrate(queryClient)` serialize cache thành plain object (JSON-safe)
 * 4. Layout truyền dehydrated state xuống `<HydrationBoundary state={...}>`
 * 5. HydrationBoundary restore state vào CLIENT QueryClient trước khi render
 * 6. Khi `useChannels()` được gọi → cache đã có data → KHÔNG fetch lại
 *
 * ĐIỂM KHÁC BIỆT VỚI useEffect + setQueryData:
 * ───────────────────────────────────────────────
 * useEffect:    Component mount → useEffect chạy → set cache
 *               Có race condition: query có thể chạy trước useEffect!
 *
 * HydrationBoundary: cache được restore TRƯỚC KHI component nào mount
 *                    Không có race condition.
 *
 * @param workspaceId - ID của workspace cần prefetch data
 * @param data - data đã fetch từ getServerUser/getServerWorkspace (tái dùng, không fetch lại)
 * @returns DehydratedState — state đã được serialize, an toàn để truyền qua props
 */
export async function prefetchWorkspaceData(
  workspaceId: string,
  data: {
    user: User
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
        // Trên server, không bao giờ retry (chậm + không cần thiết)
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
   *
   * Query keys phải KHỚP CHÍNH XÁC với keys trong useWorkspace, useChannels...
   * → Đó là lý do các key được định nghĩa và export từ hooks (workspaceKeys, channelKeys)
   *   thay vì hardcode ở nhiều nơi.
   */

  // Cache user data với key ['auth', 'me'] — khớp với useAuth() query key
  queryClient.setQueryData(['auth', 'me'], data.user)

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
