'use client'

/**
 * WORKSPACE SHELL — Client Component sau khi tối ưu
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * SAU KHI TỐI ƯU: Giảm số lượng props bằng cách đọc từ TanStack Query cache.
 *
 * TRƯỚC (nhiều props từ server):
 *   <WorkspaceShell
 *     userData={user}
 *     currentWorkspaceData={currentWorkspace}
 *     userWorkspacesData={allWorkspaces}    ← không cần pass nếu có cache
 *     userWorkspaceChannels={channels}      ← không cần pass nếu có cache
 *   >
 *
 * SAU (chỉ props thực sự cần thiết):
 *   <WorkspaceShell
 *     userData={user}                       ← cần để pass vào Sidebar/UserSidebar
 *     currentWorkspaceData={workspace}      ← cần cho Toolbar (tên workspace)
 *     workspaceId={workspaceId}             ← cần để hooks biết fetch cái gì
 *   >
 *
 * Tại sao có thể bỏ userWorkspacesData và userWorkspaceChannels?
 * ──────────────────────────────────────────────────────────────
 * HydrationBoundary đã restore cache TRƯỚC khi component này render.
 * Khi WorkspaceSidePanel và Sidebar gọi useChannels() / useWorkspaces(),
 * chúng đọc từ cache → có data ngay → không fetch lại, không loading.
 *
 * Tuy nhiên, userData và currentWorkspaceData vẫn cần pass qua props vì:
 * - Toolbar cần tên workspace để hiển thị ngay (không muốn hook call overhead)
 * - Sidebar và UserSidebar cần user info
 * - Đây là "initial render props" — render đúng ngay từ SSR
 *
 * PATTERN: "Props cho render đầu, Cache cho updates sau"
 * ───────────────────────────────────────────────────────
 * Lần render đầu (SSR → hydrate): dùng props → UI đúng ngay
 * Các update sau (tạo channel, đổi workspace...): hooks đọc cache → UI reactive
 */

import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useChannels } from '@/hooks/use-channel'
import type { User, Workspace } from '@/lib/types'

interface Props {
  /**
   * userData và currentWorkspaceData vẫn cần qua props vì:
   * 1. Cần cho initial SSR render (trước khi JS hydrate)
   * 2. Tránh gọi thêm hooks ở đây chỉ để lấy 2 giá trị này
   */
  userData: User
  currentWorkspaceData: Workspace
  /**
   * workspaceId cần để gọi useChannels(workspaceId)
   * Không truyền channels array vì hook sẽ đọc từ cache
   */
  workspaceId: string
  children: React.ReactNode
}

export default function WorkspaceShell({
  userData,
  currentWorkspaceData,
  workspaceId,
  children,
}: Props) {
  /**
   * Đọc workspaces và channels từ TanStack Query cache.
   *
   * Tại sao KHÔNG có loading state ở đây?
   * ───────────────────────────────────────
   * HydrationBoundary đã fill cache TRƯỚC khi component này mount.
   * → Khi useWorkspaces() và useChannels() được gọi lần đầu:
   *   - data: đã có (từ cache)
   *   - isLoading: false ngay lập tức
   *   → Không có loading flash, không có skeleton
   *
   * Nếu cache bị xóa (gcTime hết hạn) hoặc bị invalidate:
   * → isLoading = true → hooks tự fetch lại → UI hiển thị [] trong lúc chờ
   * → Đây là hành vi mong muốn: tự heal, không cần loading manual
   */
  const { data: allWorkspaces = [] } = useWorkspaces()
  const { data: channels = [] } = useChannels(workspaceId)

  return (
    <>
      {/*
       * Toolbar nhận currentWorkspaceData qua props (từ server)
       * Không dùng hook ở đây vì toolbar chỉ cần tên workspace
       * và ta muốn nó render đúng ngay từ SSR
       */}
      <Toolbar currentWorkspaceData={currentWorkspaceData} />

      <div className="flex h-full">
        {/*
         * Sidebar nhận allWorkspaces từ hook (cache hit)
         * Nếu user tạo workspace mới → useCreateWorkspace invalidate cache
         * → useWorkspaces() refetch → Sidebar tự cập nhật
         */}
        <Sidebar
          userData={userData}
          currentWorkspaceData={currentWorkspaceData}
          userWorkspacesData={allWorkspaces}
        />

        <main className="flex-1 mr-1 mb-1">
          {/*
           * ResizablePanelGroup cần JS (drag handlers) → đây là lý do
           * WorkspaceShell là Client Component, không thể là Server Component
           */}
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full rounded-lg border border-[#462B4A] md:min-w-[450px] w-full"
          >
            <ResizablePanel
              defaultSize={23}
              className="flex flex-col gap-2 h-full px-3 py-2 bg-[#231226]"
            >
              {/*
               * WorkspaceSidePanel nhận channels từ hook (cache hit)
               * Channels.tsx bên trong cũng gọi useChannels() → cùng cache key
               * → Không có duplicate fetch
               */}
              <WorkspaceSidePanel
                userData={userData}
                currentWorkspaceData={currentWorkspaceData}
                userWorkspaceChannels={channels}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/*
             * {children} slot — điểm kỳ diệu của hybrid pattern
             *
             * WorkspaceShell là Client Component nhưng children này
             * được TRUYỀN từ WorkspaceLayout (Server Component) qua props.
             * → children KHÔNG bị force thành Client Component
             * → channel page CÓ THỂ là Server Component nếu muốn
             *
             * Đây gọi là "composition pattern" hay "children as slots"
             */}
            <ResizablePanel
              defaultSize={77}
              className="h-full items-center justify-center py-2 bg-[#1A1D21]"
            >
              {children}
            </ResizablePanel>
          </ResizablePanelGroup>
        </main>
      </div>
    </>
  )
}
