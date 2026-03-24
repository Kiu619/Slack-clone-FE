'use client'

import { useEffect, useMemo } from 'react'
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
import type { AccountUser, User, Workspace } from '@/lib/types'
import { useQuery } from '@tanstack/react-query'
import ProfilePanel from '@/modules/profile/profile-panel'
import { useProfilePanelStore } from '@/stores/useProfilePanelStore'
import { authKeys } from '@/lib/query-keys'
import { getUserApi, getWorkspaceProfileApi } from '@/apis'
import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'

interface Props {
  accountUser: AccountUser
  initialSidebarUser: User
  currentWorkspaceData: Workspace
  workspaceId: string
  children: React.ReactNode
}

export default function WorkspaceShell({
  accountUser,
  initialSidebarUser,
  currentWorkspaceData,
  workspaceId,
  children,
}: Props) {
  const { data: allWorkspaces = [] } = useWorkspaces()
  const { data: channels = [] } = useChannels(workspaceId)

  const { data: account } = useQuery({
    queryKey: authKeys.me,
    queryFn: getUserApi,
    initialData: accountUser,
    staleTime: 5 * 60 * 1000,
  })

  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(workspaceId),
    queryFn: () => getWorkspaceProfileApi(workspaceId),
    staleTime: 60 * 1000,
  })

  const sidebarUser = useMemo(
    () =>
      mergeAccountWithWorkspaceProfile(account ?? accountUser, workspaceProfile),
    [account, accountUser, workspaceProfile],
  )

  const setUser = useUserStore((s) => s.setUser)
  const isFileDetailOpen = useFileDetailStore((s) => s.isOpen)
  const isProfilePanelOpen = useProfilePanelStore((s) => s.isOpen)

  useEffect(() => {
    if (account) setUser(account)
  }, [account, setUser])

  const displayUser = sidebarUser ?? initialSidebarUser

  return (
    <>
      <Toolbar currentWorkspaceData={currentWorkspaceData} />

      <div className="flex h-full">
        <Sidebar
          userData={displayUser}
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
                userData={displayUser}
                currentWorkspaceData={currentWorkspaceData}
                userWorkspaceChannels={channels}
              />
            </ResizablePanel>

            <ResizableHandle />

            <ResizablePanel
              defaultSize={isFileDetailOpen ? 54 : 77}
              minSize={30}
              groupResizeBehavior="preserve-relative-size"
              className="h-full items-center justify-center py-2 bg-[#1A1D21]"
            >
              {children}
            </ResizablePanel>

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

            {isProfilePanelOpen && (
              <>
                <ResizableHandle />
                <ResizablePanel
                  defaultSize={23}
                  minSize="20%"
                  maxSize="35%"
                  className="h-full border-l border-[#797c814d]"
                >
                  <ProfilePanel />
                </ResizablePanel>
              </>
            )}
          </ResizablePanelGroup>
        </main>
      </div>
    </>
  )
}
