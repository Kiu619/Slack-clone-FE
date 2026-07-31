import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { HydrationBoundary } from '@tanstack/react-query'
import {
  getServerUser,
  getServerWorkspaceProfile,
  getServerWorkspace,
  getServerWorkspaces,
  getServerChannels,
  getServerDirectMessages,
  prefetchWorkspaceData,
} from '@/lib/server-fetch'
import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'
import { parsePanelWidthsCookie } from '@/lib/workspace-panel-widths'
import WorkspaceShell from '@/modules/workspace/workspace-shell'
import { FontInjector } from '@/components/font-injector'
import { ThemeScope } from '@/components/theme-scope'
import { EmojiSyncListener } from '@/components/emoji-sync-listener'
import { defaultTheme, type Theme } from '@/stores/useThemeStore'

interface WorkspaceLayoutProps {
  children: React.ReactNode
  params: Promise<{ workspaceId: string }>
}

export default async function WorkspaceLayout({
  children,
  params,
}: WorkspaceLayoutProps) {
  const { workspaceId } = await params

  const [account, workspaceProfile, currentWorkspace, allWorkspaces, channels, conversations] =
    await Promise.all([
      getServerUser(),
      getServerWorkspaceProfile(workspaceId),
      getServerWorkspace(workspaceId),
      getServerWorkspaces(),
      getServerChannels(workspaceId),
      getServerDirectMessages(workspaceId),
    ])

  if (!account) {
    redirect(`/auth?redirect=/workspace/${workspaceId}`)
  }

  const user = mergeAccountWithWorkspaceProfile(account, workspaceProfile)
  if (!user) {
    redirect(`/auth?redirect=/workspace/${workspaceId}`)
  }

  if (!currentWorkspace) {
    redirect('/')
  }

  let initialTheme: Theme = defaultTheme
  if (workspaceProfile?.theme) {
    try {
      initialTheme = JSON.parse(workspaceProfile.theme) as Theme
    } catch {
      initialTheme = defaultTheme
    }
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
    user: account,
    workspaceProfile,
    workspace: currentWorkspace,
    workspaces: allWorkspaces,
    channels,
    conversations,
  })

  const cookieStore = await cookies()
  const widthsCookie = cookieStore.get(`panel-widths-${workspaceId}`)?.value
  const initialWidths = parsePanelWidthsCookie(widthsCookie)

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
      <ThemeScope scope={workspaceId} initialTheme={initialTheme}>
        <WorkspaceShell
          accountUser={account}
          initialSidebarUser={user}
          currentWorkspaceData={currentWorkspace}
          workspaceId={workspaceId}
          workspaceProfileData={workspaceProfile}
          initialTheme={initialTheme}
          initialWidths={initialWidths}
        >
          <FontInjector />
          <EmojiSyncListener workspaceId={workspaceId} />
          {children}
        </WorkspaceShell>
      </ThemeScope>
    </HydrationBoundary>
  )
}
