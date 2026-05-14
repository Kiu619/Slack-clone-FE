/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
'use client'

import { getUserApi, getWorkspaceProfileApi } from '@/apis'
import FileDetailPanel from '@/components/attachment-previews/file-detail-panel'
import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
import { useChannels } from '@/hooks/use-channel'
import { useGlobalSync } from '@/hooks/use-global-sync'
import { useSocket, useWorkspaceSocket } from '@/hooks/use-socket'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useWorkspacePanelResize } from '@/hooks/use-workspace-panel-resize'
import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'
import { authKeys } from '@/lib/query-keys'
import type {
  AccountUser,
  ChannelMember,
  ChannelMembersDirectory,
  User,
  Workspace,
  WorkspaceMember,
} from '@/lib/types'
import {
  getWorkspaceSidePanelIdFromPathname,
  type WorkspacePanelInitialWidths,
} from '@/lib/workspace-panel-widths'
import ChannelView from '@/modules/channels/channel-view'
import DMView from '@/modules/direct-messages/dm-view'
import { PreferencesDialog } from '@/modules/preferences/preferences-dialog'
import ProfilePanel from '@/modules/profile/profile-panel'
import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import { useMainPanelStore } from '@/stores/useMainPanelStore'
import { useNewMessageStore } from '@/stores/useNewMessageStore'
import { useProfilePanelStore } from '@/stores/useProfilePanelStore'
import { useThemeStore, type Theme } from '@/stores/useThemeStore'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useUserStore } from '@/stores/useUserStore'
import { useWorkspaceMemberStore } from '@/stores/useWorkspaceMemberStore'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import ActivitySidePanel from '../activity/activity-side-panel'
import FilesSidePanel from '../all-files/files-side-panel'
import DMSidePanel from '../direct-messages/dms-side-panel'
import LaterSidePanel from '../later/later-side-panel'
import ThreadPanel from '../threads/thread-panel'
import NewMessageComposer from './new-message-composer'

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
  initialWidths: WorkspacePanelInitialWidths
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
  const pathname = usePathname()
  const isDMsPage = pathname.includes('/dms')
  const isFilesPage = pathname.includes("/files");
  const isActivityPage = pathname.includes("/activity");
  const isLaterPage = pathname.includes("/later");
  const isSearchPage = pathname.includes("/search");

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
  const { isMainGatewayConnected } = useSocket()

  useGlobalSync(workspaceId)

  useWorkspaceSocket(workspaceId, isMainGatewayConnected, {
    onUserProfileUpdated: useCallback((data: Record<string, unknown>) => {
      const userId = data.id as string | undefined
      const updatedWsId = data.workspaceId as string | undefined
      if (!userId || updatedWsId !== workspaceId) return

      useWorkspaceMemberStore.getState().patchFromSocket(workspaceId, data)

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

      // Message list / thread panel: dùng useWorkspaceMemberStore + merge trong MessageItem (không quét infinite query)

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
  const isThreadPanelOpen = useThreadPanelStore((s) => s.isOpen)
  const isCreatingNewMessage = useNewMessageStore((s) => s.isCreating)
  const { view: mainPanelView, reset: resetMainPanel, setActiveSavedItemId } = useMainPanelStore()



  useEffect(() => {
    if (account) setUser(account)
  }, [account, setUser])

  // Reset main panel view khi user tự navigate qua sidebar (pathname thay đổi)
  useEffect(() => {
    resetMainPanel()
  }, [pathname, resetMainPanel])

  const activeSidePanelId = getWorkspaceSidePanelIdFromPathname(pathname)

  const sidebarPanelRef = useRef<HTMLDivElement>(null)
  const fileDetailPanelRef = useRef<HTMLDivElement>(null)
  const profilePanelRef = useRef<HTMLDivElement>(null)
  const panelResizeRefs = useMemo(
    () => ({
      sidebar: sidebarPanelRef,
      fileDetail: fileDetailPanelRef,
      profile: profilePanelRef,
    }),
    [],
  )

  const {
    sidebarWidth,
    fileDetailWidth,
    profilePanelWidth,
    startResizing,
    dragResizeKind,
  } = useWorkspacePanelResize({
    workspaceId,
    initialWidths,
    activeSidePanelId,
    panelRefs: panelResizeRefs,
  })

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
        workspaceId={workspaceId}
        currentWorkspaceData={currentWorkspaceData}
      />

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
            {!isSearchPage && (
              <>
            {/* Workspace Side Panel */}
            <div
              ref={sidebarPanelRef}
              className="flex flex-col gap-2 h-full px-3 py-2 shrink-0 overflow-hidden"
              style={{
                ...(dragResizeKind !== 'sidebar' ? { width: sidebarWidth } : {}),
                background: getWorkspaceSidePanelBackground(),
              }}
            >
              {isDMsPage && (
                <DMSidePanel
                  theme={theme}
                  currentWorkspaceData={currentWorkspaceData}
                />
              )}
              {isLaterPage && (
                <LaterSidePanel
                  theme={theme}
                  currentWorkspaceData={currentWorkspaceData}
                />
              )}
              {isFilesPage && (
                <FilesSidePanel
                  theme={theme}
                />
              )}
              {isActivityPage && (
                <ActivitySidePanel
                  theme={theme}
                  currentWorkspaceData={currentWorkspaceData}
                />
              )}
              {!isDMsPage && !isLaterPage && !isFilesPage && !isActivityPage && (
                <WorkspaceSidePanel
                  theme={theme}
                  userData={displayUser}
                  currentWorkspaceData={currentWorkspaceData}
                  userWorkspaceChannels={channels}
                />
              )}
            </div>

            {/* Resize Handle for Sidebar */}
            <div
              className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
              onMouseDown={() => startResizing('sidebar')}
            />
              </>
            )}

            {/* Main Content (Channels/Messages) */}
            <div className="flex-1 min-w-0 h-full bg-white dark:bg-[#1A1D21] py-2 overflow-hidden flex flex-col">
              {isCreatingNewMessage ? (
                <NewMessageComposer workspaceId={workspaceId} />
              ) : mainPanelView.type === 'channel' ? (
                <ChannelView
                  channelId={mainPanelView.channelId}
                  workspaceId={workspaceId}
                />
              ) : mainPanelView.type === 'dm' ? (
                <DMView
                  conversationId={mainPanelView.conversationId}
                  workspaceId={workspaceId}
                />
              ) : (
                children
              )}
            </div>

            {/* File Detail Panel */}
            {isFileDetailOpen && (
              <>
                <div
                  className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
                  onMouseDown={() => startResizing('file-detail')}
                />
                <div
                  ref={fileDetailPanelRef}
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-y-auto"
                  style={{
                    ...(dragResizeKind !== 'file-detail' ? { width: fileDetailWidth } : {}),
                  }}
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
                  ref={profilePanelRef}
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-y-auto"
                  style={{
                    ...(dragResizeKind !== 'profile' ? { width: profilePanelWidth } : {}),
                  }}
                >
                  <ProfilePanel />
                </div>
              </>
            )}

            {/* Thread Panel */}
            {isThreadPanelOpen && (
              <>
                <div
                  className="w-0.5 hover:w-1 cursor-col-resize hover:bg-sky-500/50 transition-colors z-10"
                  onMouseDown={() => startResizing('profile')}
                />
                <div
                  ref={profilePanelRef}
                  className="h-full border-l border-[#797c814d] shrink-0 overflow-y-auto"
                  style={{
                    ...(dragResizeKind !== 'profile' ? { width: profilePanelWidth } : {}),
                  }}
                >
                  <ThreadPanel workspaceId={workspaceId} />
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
