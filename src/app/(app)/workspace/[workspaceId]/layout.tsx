/**
 * WORKSPACE LAYOUT — Server Component với HydrationBoundary
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * PHIÊN BẢN NÀY dùng HydrationBoundary thay vì WorkspaceDataProvider.
 *
 * Sự khác biệt so với version trước:
 * ─────────────────────────────────────
 *
 * Trước (WorkspaceDataProvider + useEffect):
 *   Server fetch → props → WorkspaceDataProvider → useEffect → setQueryData
 *   Vấn đề: useEffect chạy sau mount → race condition tiềm ẩn
 *
 * Bây giờ (HydrationBoundary + dehydrate):
 *   Server fetch → dehydrate → HydrationBoundary → cache restored trước render
 *   Không có race condition vì cache có data TRƯỚC KHI bất kỳ query nào chạy.
 *
 * CẤU TRÚC CÂY COMPONENT:
 * ──────────────────────────
 *
 *   WorkspaceLayout (SERVER)
 *   │   ↑ fetch data song song
 *   │   ↑ server-side auth guard (redirect nếu không auth)
 *   │
 *   └── HydrationBoundary (CLIENT, từ @tanstack/react-query)
 *       │   ↑ nhận dehydratedState (plain JSON từ server)
 *       │   ↑ restore vào TanStack Query client cache
 *       │   ↑ xảy ra TRƯỚC khi bất kỳ hook nào chạy
 *       │
 *       └── WorkspaceShell (CLIENT)
 *           │   ↑ nhận data từ server qua props để render lần đầu
 *           │   ↑ từ lần thứ 2 trở đi: đọc từ TanStack cache
 *           │
 *           ├── Toolbar, Sidebar, WorkspaceSidePanel (CLIENT)
 *           │       ↑ dùng useWorkspace(), useChannels() → cache hit
 *           │
 *           └── {children} — CÓ THỂ là Server hoặc Client Component
 *                   ↑ channel page, DM page, etc.
 */

import { redirect } from 'next/navigation'
import { HydrationBoundary } from '@tanstack/react-query'
import {
  getServerUser,
  getServerWorkspace,
  getServerWorkspaces,
  getServerChannels,
  prefetchWorkspaceData,
} from '@/lib/server-fetch'
import WorkspaceShell from '@/modules/workspace/workspace-shell'

interface WorkspaceLayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = await params

  /**
   * BƯỚC 1: Fetch data song song trên server
   *
   * Promise.all chạy tất cả 4 requests đồng thời.
   * Tổng thời gian = max(t1, t2, t3, t4) thay vì t1 + t2 + t3 + t4.
   *
   * Lưu ý: getServerUser() và getServerWorkspace() cần kết quả để
   * làm auth guard, nên ta fetch cả 4 song song luôn.
   * Nếu user không auth → channels fetch sẽ fail → trả về [] (không vấn đề).
   */
  const [user, currentWorkspace, allWorkspaces, channels] = await Promise.all([
    getServerUser(),
    getServerWorkspace(workspaceId),
    getServerWorkspaces(),
    getServerChannels(workspaceId),
  ])

  /**
   * BƯỚC 2: Server-side auth guards
   *
   * redirect() là Server Action — ném exception đặc biệt được Next.js xử lý.
   * Browser nhận HTTP 307 redirect, không bao giờ thấy trang workspace.
   *
   * Thứ tự check quan trọng:
   * 1. Check user trước (auth) — lỗi phổ biến nhất
   * 2. Check workspace sau (authorization) — user có thể auth nhưng không có quyền
   */
  if (!user) {
    redirect(`/auth?redirect=/workspace/${workspaceId}`)
  }

  if (!currentWorkspace) {
    redirect('/')
  }

  /**
   * BƯỚC 3: Tạo dehydrated TanStack Query state
   *
   * prefetchWorkspaceData() tạo QueryClient server-side, điền data vào,
   * rồi serialize thành plain object với dehydrate().
   *
   * Data này sẽ được nhúng vào HTML response và HydrationBoundary
   * sẽ restore nó vào client QueryClient khi JS chạy.
   *
   * Tại sao truyền data vào thay vì để prefetchWorkspaceData tự fetch?
   * → Tránh fetch lại! Ta đã có data từ Promise.all ở trên.
   *   Truyền vào để chỉ serialize, không fetch thêm lần nào.
   */
  const dehydratedState = await prefetchWorkspaceData(workspaceId, {
    user,
    workspace: currentWorkspace,
    workspaces: allWorkspaces,
    channels,
  })

  /**
   * BƯỚC 4: Render với HydrationBoundary
   *
   * HydrationBoundary từ @tanstack/react-query là Client Component
   * nhưng được instantiate ở đây trong Server Component.
   *
   * Khi browser nhận HTML và React bắt đầu hydrate:
   *   1. HydrationBoundary đọc `state` prop (dehydrated JSON)
   *   2. Gọi `hydrate(queryClient, state)` — restore cache
   *   3. Sau đó mới render children
   *   → Tất cả useQuery() trong children thấy cache đã có data
   *
   * WorkspaceShell chỉ nhận props cho lần render đầu tiên (SSR).
   * Sau khi hydrate, các hooks trong Channels.tsx đọc từ cache.
   */
  return (
    <HydrationBoundary state={dehydratedState}>
      <WorkspaceShell
        userData={user}
        currentWorkspaceData={currentWorkspace}
        workspaceId={workspaceId}
      >
        {children}
      </WorkspaceShell>
    </HydrationBoundary>
  )
}
