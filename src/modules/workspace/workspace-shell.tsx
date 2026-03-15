'use client'

import { useEffect } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable'
import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
import FileDetailPanel from '@/components/attachment-previews/file-detail-panel'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useChannels } from '@/hooks/use-channel'
import type { User, Workspace } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'

interface Props {
  userData: User
  currentWorkspaceData: Workspace
  workspaceId: string
  children: React.ReactNode
}

export default function WorkspaceShell({
  userData,
  currentWorkspaceData,
  workspaceId,
  children,
}: Props) {
  const { data: allWorkspaces = [] } = useWorkspaces()
  const { data: channels = [] } = useChannels(workspaceId)
  const { data: user } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      const res = await apiClient.get<User>('/auth/me')
      return res.data
    },
    initialData: userData,
    staleTime: 5 * 60 * 1000,
  })
  const setUser = useUserStore((s) => s.setUser)
  const isFileDetailOpen = useFileDetailStore((s) => s.isOpen)

  useEffect(() => {
    if (user) setUser(user)
  }, [user, setUser])

  return (
    <>
      <Toolbar currentWorkspaceData={currentWorkspaceData} />

      <div className="flex h-full">
        <Sidebar
          userData={user}
          currentWorkspaceData={currentWorkspaceData}
          userWorkspacesData={allWorkspaces}
        />

        <main className="flex-1 mr-1 mb-1">
          <ResizablePanelGroup
            orientation="horizontal"
            className="h-full rounded-lg border border-[#462B4A] md:min-w-[450px] w-full"
          >
            <ResizablePanel
              defaultSize={23}
              minSize="320px"
              maxSize="35%"
              className="flex flex-col gap-2 h-full px-3 py-2 bg-[#231226] min-w-[320px]"
            >
              <WorkspaceSidePanel
                userData={user}
                currentWorkspaceData={currentWorkspaceData}
                userWorkspaceChannels={channels}
              />
            </ResizablePanel>

            <ResizableHandle />

            {/* Main content */}
            <ResizablePanel
              defaultSize={isFileDetailOpen ? 54 : 77}
              minSize={30}
              groupResizeBehavior="preserve-relative-size"
              className="h-full items-center justify-center py-2 bg-[#1A1D21]"
            >
              {children}
            </ResizablePanel>

            {/* File detail panel — chỉ render khi mở */}
            {isFileDetailOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize={23}
                  minSize="20%"
                  maxSize="35%"
                  className="h-full border-l border-[#797c814d]"
                >
                  <FileDetailPanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </main>
      </div>
    </>
  )
}
