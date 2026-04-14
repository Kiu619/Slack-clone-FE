/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { useState, useCallback, useRef, useEffect, useLayoutEffect, useMemo } from 'react'
import { useUserStore } from '@/stores/useUserStore'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
import FileDetailPanel from '@/components/attachment-previews/file-detail-panel'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useChannels } from '@/hooks/use-channel'
import type {
  AccountUser,
  ChannelMember,
  ChannelMembersDirectory,
  User,
  Workspace,
  WorkspaceMember,
} from '@/lib/types'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ProfilePanel from '@/modules/profile/profile-panel'
import { useProfilePanelStore } from '@/stores/useProfilePanelStore'
import { authKeys } from '@/lib/query-keys'
import { getUserApi, getWorkspaceProfileApi } from '@/apis'
import { useSocket, useWorkspaceSocket } from '@/hooks/use-socket'
import { useWorkspaceChannelSocket } from '@/hooks/use-channel'
import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'
import { PreferencesDialog } from '@/modules/preferences/preferences-dialog'
import { useThemeStore, type Theme } from '@/stores/useThemeStore'
import { useTheme } from 'next-themes'
import Cookies from 'js-cookie'

/** Merge payload `user_profile_updated` vào row channel member (Members tab). */
function mergeChannelMemberProfile(
  m: ChannelMember,
  data: Record<string, unknown>,
): ChannelMember {
  return {
    ...m,
    ...(data.name !== undefined && { name: data.name as string | null }),
    ...(data.displayName !== undefined && {
      displayName: data.displayName as string | null,
    }),
    ...(data.avatar !== undefined && { avatar: data.avatar as string | null }),
    ...(typeof data.email === 'string' && { email: data.email }),
    ...(data.statusEmoji !== undefined && {
      statusEmoji: data.statusEmoji as string | null,
    }),
    ...(data.statusText !== undefined && {
      statusText: data.statusText as string | null,
    }),
    ...(data.isAway !== undefined && { isAway: data.isAway as boolean }),
  }
}

/** Merge cùng payload cho `GET /workspaces/:id/members` nếu đã cache. */
function mergeWorkspaceMemberProfile(
  m: WorkspaceMember,
  data: Record<string, unknown>,
): WorkspaceMember {
  return {
    ...m,
    ...(data.name !== undefined && { name: data.name as string | null }),
    ...(data.displayName !== undefined && {
      displayName: data.displayName as string | null,
    }),
    ...(data.avatar !== undefined && { avatar: data.avatar as string | null }),
    ...(typeof data.email === 'string' && { email: data.email }),
    ...(data.isAway !== undefined && { isAway: data.isAway as boolean }),
    ...(data.statusEmoji !== undefined && {
      statusEmoji: data.statusEmoji as string | null,
    }),
    ...(data.statusText !== undefined && {
      statusText: data.statusText as string | null,
    }),
    ...(data.statusExpiration !== undefined && {
      statusExpiration:
        data.statusExpiration === null
          ? null
          : (typeof data.statusExpiration === 'string'
              ? data.statusExpiration
              : new Date(data.statusExpiration as string).toISOString()),
    }),
    ...(data.notificationsPausedUntil !== undefined && {
      notificationsPausedUntil:
        data.notificationsPausedUntil === null
          ? null
          : (typeof data.notificationsPausedUntil === 'string'
              ? data.notificationsPausedUntil
              : new Date(
                  data.notificationsPausedUntil as string,
                ).toISOString()),
    }),
  }
}

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
  }, [workspaceProfileData, storeTheme, hasSynced])

  const getSysNavBackground = () => {
    const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sysnav))`;

    if (theme.isGradient) {
      const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sysnav))`;
      return `linear-gradient(to bottom right, ${baseColor}, ${blendColor})`;
    }
    return baseColor;
  };

  const getWorkspaceSidePanelBackground = () => {
    const baseColor = `color-mix(in srgb, ${theme.systemNav}, var(--theme-mix-base) var(--theme-mix-sidepanel))`;

    if (theme.isGradient) {
      const blendColor = `color-mix(in srgb, ${theme.selectedItems}, var(--theme-mix-base) var(--theme-mix-sidepanel))`;
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

  const queryClient = useQueryClient();
  const { isConnected, isProfileConnected, isChannelConnected } = useSocket()

  useWorkspaceChannelSocket(workspaceId, isChannelConnected)

  useWorkspaceSocket(workspaceId, isProfileConnected, {
    onUserProfileUpdated: useCallback((data: Record<string, unknown>) => {
      const userId = data.id as string | undefined
      const updatedWsId = data.workspaceId as string | undefined
      if (!userId || updatedWsId !== workspaceId) return

      // 1. Cập nhật cache Member Status (cho Profile Panel và các chỗ khác)
      queryClient.setQueryData(['workspace-member-status', workspaceId, userId], (old: Record<string, unknown> | undefined) => {
        return old ? { ...old, ...data } : old
      })

      // 2. Nếu là chính mình, invalidate profile cache của workspace hiện tại
      if (userId === account?.id) {
        queryClient.invalidateQueries({
          queryKey: authKeys.workspaceProfile(workspaceId),
        })
      }

      // 3. Cập nhật Avatar/Tên hiển thị trong Message List (Infinite Query)
      queryClient.setQueriesData({ queryKey: ['messages'] }, (oldData: any) => {
        if (!oldData?.pages) return oldData
        return {
          ...oldData,
          pages: oldData.pages.map((page: any) => ({
            ...page,
            messages: page.messages.map((msg: any) =>
              msg.user.id === userId
                ? { ...msg, user: { ...msg.user, ...data } }
                : msg,
            ),
          })),
        }
      })

      // 4. Danh sách members trong channel (Members tab) — tên + avatar + status
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            const k = q.queryKey
            return (
              Array.isArray(k) &&
              k[0] === 'channels' &&
              k[1] === workspaceId &&
              typeof k[2] === 'string' &&
              k[3] === 'members'
            )
          },
        },
        (old: unknown) => {
          if (!old || typeof old !== 'object') return old
          if ('inChannel' in old && 'notInChannel' in old) {
            const d = old as ChannelMembersDirectory
            return {
              inChannel: d.inChannel.map((m) =>
                m.id === userId ? mergeChannelMemberProfile(m, data) : m,
              ),
              notInChannel: d.notInChannel.map((m) =>
                m.id === userId ? mergeChannelMemberProfile(m, data) : m,
              ),
            }
          }
          if (Array.isArray(old)) {
            return (old as ChannelMember[]).map((m) =>
              m.id === userId ? mergeChannelMemberProfile(m, data) : m,
            )
          }
          return old
        },
      )

      // 5. Danh sách members workspace (nếu đã cache)
      queryClient.setQueryData(
        ['workspaces', workspaceId, 'members'],
        (old: WorkspaceMember[] | undefined) => {
          if (!old?.length) return old
          return old.map((m) =>
            m.id === userId ? mergeWorkspaceMemberProfile(m, data) : m,
          )
        },
      )
    }, [workspaceId, account?.id, queryClient]),
  });

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
    Cookies.set(`panel-widths-${workspaceId}`, JSON.stringify({
      sidebarWidth: sidebar,
      fileDetailWidth: file,
      profilePanelWidth: profile
    }), { expires: 365, path: '/' })
  }, [workspaceId])
  const isResizing = useRef<'sidebar' | 'file-detail' | 'profile' | null>(null)

  const handleMouseMoveRef = useRef<(e: MouseEvent) => void>(() => {})
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

  useLayoutEffect(() => {
    handleMouseMoveRef.current = handleMouseMove
  }, [handleMouseMove])

  const stableMouseMove = useCallback((e: MouseEvent) => {
    handleMouseMoveRef.current(e)
  }, [])

  const stopResizingRef = useRef<(() => void) | null>(null)
  const stopResizing = useCallback(() => {
    isResizing.current = null
    document.removeEventListener('mousemove', stableMouseMove)
    const onUp = stopResizingRef.current
    if (onUp) document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = 'default'
    document.body.style.userSelect = 'auto'
  }, [stableMouseMove])

  useLayoutEffect(() => {
    stopResizingRef.current = stopResizing
  }, [stopResizing])

  const startResizing = (type: 'sidebar' | 'file-detail' | 'profile') => {
    isResizing.current = type
    document.addEventListener('mousemove', stableMouseMove)
    document.addEventListener('mouseup', stopResizing)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
  }

  const displayUser = sidebarUser ?? initialSidebarUser

  const { userData: profileUserData, isOpen: isProfileOpen, open: openProfile } = useProfilePanelStore()
  const isFileDetailOpenStore = useFileDetailStore((s) => s.isOpen)
  const isInitialized = useRef(false)

  // Lưu trạng thái vào cookie khi có thay đổi
  useEffect(() => {
    // Chỉ lưu nếu đã khởi tạo xong để tránh việc mount ban đầu (đang false) ghi đè lên cookie cũ (đang true)
    if (!workspaceId || !isInitialized.current) return
    const state = {
      isProfileOpen,
      profileUserId: profileUserData?.id,
      isFileDetailOpen: isFileDetailOpenStore,
    }
    Cookies.set(`panel-state-${workspaceId}`, JSON.stringify(state), { expires: 7 })
  }, [isProfileOpen, profileUserData?.id, isFileDetailOpenStore, workspaceId])

  // Khôi phục trạng thái từ cookie khi mount
  useEffect(() => {
    if (isInitialized.current || !workspaceId) return
    const stateStr = Cookies.get(`panel-state-${workspaceId}`)
    if (stateStr) {
      try {
        const state = JSON.parse(stateStr)
        if (state.isProfileOpen && state.profileUserId) {
          // Re-open profile panel with minimal data (ProfilePanel will fetch the rest)
          openProfile({ 
            userData: { id: state.profileUserId } as any, 
            workspaceId 
          })
        }
        // Lưu ý: FileDetailPanel cần data message/attachment phức tạp nên tạm thời chỉ khôi phục Profile Panel
      } catch (e) {
        console.error('Failed to restore panel state', e)
      }
    }
    isInitialized.current = true
  }, [workspaceId, openProfile])

  return (
    <div className="flex flex-col w-screen h-screen"
      style={{ background: getSysNavBackground() }}
    >
      <Toolbar
        currentWorkspaceData={currentWorkspaceData} />

      <div className="flex h-full overflow-x-hidden"
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
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-y-auto"
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
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-y-auto"
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
