'use client'

/**
 * QUERY PROVIDER — Cấu hình TanStack Query toàn cục
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * TanStack Query (React Query) là thư viện quản lý server state:
 * - Cache data từ API để tránh fetch lại không cần thiết
 * - Tự động refetch khi data cũ (stale)
 * - Hỗ trợ background refetch, retry, optimistic updates
 *
 * HydrationBoundary là gì?
 * ─────────────────────────
 * Khi dùng Server Components, data được fetch trên server.
 * Nhưng TanStack Query cache sống trên CLIENT (browser).
 * HydrationBoundary là cơ chế "truyền" data từ server vào client cache
 * một cách an toàn, KHÔNG có race condition.
 *
 * Luồng:
 *   1. Server: `const queryClient = new QueryClient()`
 *   2. Server: `await queryClient.prefetchQuery(...)` → data vào server cache
 *   3. Server: `dehydrate(queryClient)` → serialize cache thành JSON
 *   4. Server → Client: JSON được nhúng vào HTML response
 *   5. Client: `HydrationBoundary` đọc JSON → restore vào client cache
 *   6. Client: `useChannels()` → cache hit ngay → KHÔNG fetch lại
 *
 * Tại sao tốt hơn `useEffect + setQueryData` (cách cũ)?
 * ──────────────────────────────────────────────────────
 * useEffect chạy SAU khi component mount. Trong khoảng thời gian
 * từ mount đến khi useEffect chạy, cache chưa có data → hooks có thể fetch.
 * HydrationBoundary restore cache TRƯỚC KHI bất kỳ component nào mount
 * → Không có race condition.
 */

import {
  QueryClient,
  QueryClientProvider,
  isServer,
} from '@tanstack/react-query'

/**
 * makeQueryClient() — tạo QueryClient với cấu hình tối ưu
 *
 * Tại sao là function thay vì `new QueryClient()` trực tiếp?
 * → Để cấu hình riêng biệt cho server và client.
 * → Tránh share state giữa các request trên server (security issue!).
 */
function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        /**
         * staleTime: 30 giây
         *
         * Data được coi là "fresh" trong 30s sau khi fetch.
         * Trong khoảng này, TanStack Query KHÔNG refetch dù component re-mount.
         *
         * Tại sao 30s?
         * - Với SSR + HydrationBoundary, data đã có từ server
         * - Khi JS hydrate xong, nếu staleTime = 0 → fetch ngay lập tức (lãng phí)
         * - 30s đủ để user tương tác ban đầu, sau đó data sẽ được refresh
         *
         * Các query cụ thể (useChannels, useWorkspace) có thể override giá trị này.
         */
        staleTime: 30 * 1000,

        /**
         * gcTime (garbage collection time): 5 phút
         *
         * Sau khi không có component nào subscribe, data sẽ bị xóa khỏi cache
         * sau 5 phút. Mặc định là 5 phút, giữ nguyên ở đây để rõ ràng.
         */
        gcTime: 5 * 60 * 1000,

        /**
         * retry: 1
         *
         * Nếu query fail, thử lại 1 lần trước khi báo lỗi.
         * Mặc định là 3 — quá nhiều cho app này vì auth errors không cần retry.
         */
        retry: 1,

        /**
         * refetchOnWindowFocus: false
         *
         * Mặc định TanStack Query refetch khi user focus lại tab.
         * Với một app như Slack (luôn mở), điều này gây quá nhiều requests.
         * Tắt đi, để các query quan trọng tự cấu hình nếu cần.
         */
        refetchOnWindowFocus: false,
      },
    },
  })
}

/**
 * Browser QueryClient — singleton để share giữa các component
 *
 * Tại sao singleton trên client?
 * → Toàn bộ app share một cache → data đồng nhất, tránh fetch trùng
 *
 * Tại sao KHÔNG singleton trên server?
 * → Mỗi request là một user khác nhau → không được share cache
 * → Nếu share → data leak giữa các user (security bug nghiêm trọng!)
 */
let browserQueryClient: QueryClient | undefined = undefined

function getQueryClient() {
  if (isServer) {
    /**
     * SERVER: tạo QueryClient mới cho MỖI request
     * isServer từ TanStack Query tự detect môi trường
     */
    return makeQueryClient()
  }

  /**
   * CLIENT: dùng singleton — tạo một lần, tái sử dụng mãi
   * `??=` là nullish assignment: chỉ assign nếu browserQueryClient là null/undefined
   */
  browserQueryClient ??= makeQueryClient()
  return browserQueryClient
}

interface Props {
  children: React.ReactNode
}

export function QueryProvider({ children }: Props) {
  /**
   * QUAN TRỌNG: Không dùng `useState` để lưu queryClient ở đây.
   *
   * Lý do: Nếu dùng useState, React có thể suspend component trong quá trình
   * hydration và tạo QueryClient mới → mất data đã được hydrate từ server.
   *
   * Thay vào đó, dùng getQueryClient() singleton ở trên.
   * Ref: https://tanstack.com/query/latest/docs/framework/react/guides/ssr
   */
  const queryClient = getQueryClient()

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}
