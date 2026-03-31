'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
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
import { PreferencesDialog } from '@/modules/preferences/preferences-dialog'
import { useThemeStore, type Theme } from '@/stores/useThemeStore'
import { useTheme } from 'next-themes'
import Cookies from 'js-cookie'

interface Props {
  accountUser: AccountUser
  initialSidebarUser: User
  currentWorkspaceData: Workspace
  workspaceProfileData: User | null
  workspaceId: string
  children: React.ReactNode
  initialWidths: {
    sidebarWidth: number
    fileDetailWidth: number
    profilePanelWidth: number
  }
}

export default function WorkspaceShell({
  accountUser,
  initialSidebarUser,
  currentWorkspaceData,
  workspaceProfileData,
  workspaceId,
  children,
  initialWidths,
}: Props) {
  const { theme: storeTheme, setTheme, confirmTheme } = useThemeStore()
  const { resolvedTheme } = useTheme()
  const [hasSynced, setHasSynced] = useState(false)

  const theme = useMemo(() => {
    if (hasSynced) return storeTheme

    if (workspaceProfileData?.theme) {
      try {
        return JSON.parse(workspaceProfileData.theme) as Theme
      } catch (e) {
        return storeTheme
      }
    }
    return storeTheme
  }, [workspaceProfileData?.theme, storeTheme, hasSynced])

  const getSysNavBackground = () => {
    const baseColor = resolvedTheme === 'light'
      ? `color-mix(in srgb, ${theme.systemNav}, white 30%)`
      : `color-mix(in srgb, ${theme.systemNav}, black 65%)`;

    if (theme.isGradient) {
      const blendColor = resolvedTheme === 'light'
        ? `color-mix(in srgb, ${theme.selectedItems}, white 30%)`
        : `color-mix(in srgb, ${theme.selectedItems}, black 65%)`;
      return `linear-gradient(to bottom right, ${baseColor}, ${blendColor})`;
    }
    return baseColor;
  };

  const getWorkspaceSidePanelBackground = () => {
    const baseColor = resolvedTheme === 'light'
      ? `color-mix(in srgb, ${theme.systemNav}, white 50%)`
      : `color-mix(in srgb, ${theme.systemNav}, black 75%)`;

    if (theme.isGradient) {
      const blendColor = resolvedTheme === 'light'
        ? `color-mix(in srgb, ${theme.selectedItems}, white 50%)`
        : `color-mix(in srgb, ${theme.selectedItems}, black 75%)`;
      return `linear-gradient(to bottom, ${baseColor}, ${blendColor})`;
    }
    return baseColor;
  };

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


  useEffect(() => {
    if (workspaceProfileData?.theme) {
      try {
        const parsedTheme = JSON.parse(workspaceProfileData.theme)
        setTheme(parsedTheme)
        confirmTheme()
        setHasSynced(true)
      } catch (e) {
        console.error('Failed to parse theme', e)
      }
    }
  }, [workspaceProfileData?.theme, setTheme, confirmTheme])

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

  // Use values from props as first source of truth to avoid hydration shift.
  const [sidebarWidth, setSidebarWidth] = useState(initialWidths.sidebarWidth)
  const [fileDetailWidth, setFileDetailWidth] = useState(initialWidths.fileDetailWidth)
  const [profilePanelWidth, setProfilePanelWidth] = useState(initialWidths.profilePanelWidth)

  const saveWidthsToCookie = useCallback((sidebar: number, file: number, profile: number) => {
    Cookies.set('panel-widths', JSON.stringify({
      sidebarWidth: sidebar,
      fileDetailWidth: file,
      profilePanelWidth: profile
    }), { expires: 365, path: '/' })
  }, [])
  const isResizing = useRef<'sidebar' | 'file-detail' | 'profile' | null>(null)

  const startResizing = (type: 'sidebar' | 'file-detail' | 'profile') => {
    isResizing.current = type
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const stopResizing = useCallback(() => {
    isResizing.current = null
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [])

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing.current) return

    if (isResizing.current === 'sidebar') {
      const newWidth = e.clientX - 70 
      if (newWidth > 240 && newWidth < 500) {
        setSidebarWidth(newWidth)
        saveWidthsToCookie(newWidth, fileDetailWidth, profilePanelWidth)
      }
    } else if (isResizing.current === 'file-detail') {
      const newWidth = window.innerWidth/window.devicePixelRatio - e.clientX
      if (newWidth > 310 && newWidth < 400) {
        setFileDetailWidth(newWidth)
        saveWidthsToCookie(sidebarWidth, newWidth, profilePanelWidth)
      }
    } else if (isResizing.current === 'profile') {
      const newWidth = window.innerWidth/window.devicePixelRatio - e.clientX
      if (newWidth > 410 && newWidth < 500) {
        setProfilePanelWidth(newWidth)
        saveWidthsToCookie(sidebarWidth, fileDetailWidth, newWidth)
      }
    }
  }, [sidebarWidth, fileDetailWidth, profilePanelWidth, saveWidthsToCookie])

  const displayUser = sidebarUser ?? initialSidebarUser

  return (
    <div className="flex flex-col w-screen h-screen"
      style={{ background: getSysNavBackground() }}
    >
      <Toolbar
        currentWorkspaceData={currentWorkspaceData} />

      <div className="flex h-full "
      >
        <Sidebar
          userData={displayUser}
          currentWorkspaceData={currentWorkspaceData}
          userWorkspacesData={allWorkspaces}
        />

        <main className="flex-1 mr-1 mb-1 overflow-hidden"
        >
          <div className="flex h-full rounded-lg border border-[#462B4A] overflow-hidden">
            {/* Workspace Side Panel */}
            <div
              className="flex flex-col gap-2 h-full px-3 py-2 shrink-0 overflow-hidden"
              style={{
                width: sidebarWidth,
                background: getWorkspaceSidePanelBackground(),
              }}
            >
              <WorkspaceSidePanel
                theme={theme}
                userData={displayUser}
                currentWorkspaceData={currentWorkspaceData}
                userWorkspaceChannels={channels}
              />
            </div>

            {/* Resize Handle for Sidebar */}
            <div
              className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
              onMouseDown={() => startResizing('sidebar')}
            />

            {/* Main Content (Channels/Messages) */}
            <div className="flex-1 min-w-0 h-full bg-white dark:bg-[#1A1D21] py-2 overflow-hidden flex flex-col">
              {children}
            </div>

            {/* File Detail Panel */}
            {isFileDetailOpen && (
              <>
                <div
                  className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
                  onMouseDown={() => startResizing('file-detail')}
                />
                <div
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-hidden"
                  style={{ width: fileDetailWidth }}
                >
                  <FileDetailPanel />
                </div>
              </>
            )}

            {/* Profile Panel */}
            {isProfilePanelOpen && (
              <>
                <div
                  className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
                  onMouseDown={() => startResizing('profile')}
                />
                <div
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-hidden"
                  style={{ width: profilePanelWidth }}
                >
                  <ProfilePanel />
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      <PreferencesDialog />
    </div>
  )
}
