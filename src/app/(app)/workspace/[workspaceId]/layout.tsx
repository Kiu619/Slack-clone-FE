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

  const [user, currentWorkspace, allWorkspaces, channels] = await Promise.all([
    getServerUser(),
    getServerWorkspace(workspaceId),
    getServerWorkspaces(),
    getServerChannels(workspaceId),
  ])
  
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
