/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { getUserApi, getWorkspaceProfileApi } from '@/apis'
import Sidebar from '@/components/sidebar'
import Toolbar from '@/components/toolbar'
import {
  SidePanelSkeleton,
  WorkspacePanelSkeleton,
} from '@/components/loading-skeletons'
import { useChannels } from '@/hooks/use-channel'
import { useConversations } from '@/hooks/use-conversations'
import { useGlobalSync } from '@/hooks/use-global-sync'
import { useLaterOverdueSummary } from '@/hooks/use-saved-items'
import { useDmUnreadSummary } from '@/hooks/use-conversations'
import { usePrefetchSidebarMutedItems } from '@/hooks/use-prefetch-sidebar-muted-items'
import { useHydrateLanguageRegionStore } from '@/hooks/useHydrateLanguageRegionStore'
import { useMemberPreferences } from '@/hooks/use-member-preferences'
import { useSocket, useWorkspaceSocket } from '@/hooks/use-socket'
import { useWorkspaces } from '@/hooks/use-workspace'
import { useWorkspacePanelResize } from '@/hooks/use-workspace-panel-resize'
import { useUnreadNotificationsCount } from '@/hooks/use-notification-summary'
import { getDmDisplayName } from '@/lib/dm-members'
import { mergeAccountWithWorkspaceProfile } from '@/lib/merge-user'
import { getContrastTextColor } from "@/lib/color-contrast";
import { authKeys, channelKeys, huddleKeys, isChannelMembersQueryKey, messageKeys, workspaceKeys } from '@/lib/query-keys'
import type { HuddlePageItem, HuddleSessionSnapshot, HuddleStateSnapshot, HuddleTarget, RecentHuddlesResponse, WorkspaceHuddlesResponse } from '@/lib/huddle'
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
import WorkspaceSidePanel from '@/modules/workspace/workspace-side-panel/workspace-side-panel'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import { useMainPanelStore } from '@/stores/useMainPanelStore'
import { useNewMessageStore } from '@/stores/useNewMessageStore'
import { useProfilePanelStore } from '@/stores/useProfilePanelStore'
import { useThemeStore, type Theme } from '@/stores/useThemeStore'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useUserStore } from '@/stores/useUserStore'
import { useGlobalSearchStore } from '@/stores/useGlobalSearchStore'
import { mergeUserForDisplay } from '@/stores/useWorkspaceMemberStore'
import { useWorkspaceMemberStore } from '@/stores/useWorkspaceMemberStore'
import { useWorkspacePresenceStore } from '@/stores/useWorkspacePresenceStore'
import { useCurrentHuddleStore } from '@/stores/useCurrentHuddleStore'
import { useWorkspaceHuddlesStore } from '@/stores/useWorkspaceHuddlesStore'
import { ActiveHuddleIndicator } from '@/components/active-huddle-indicator'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import Cookies from 'js-cookie'
import dynamic from 'next/dynamic'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useShallow } from 'zustand/react/shallow'
import { useAppTranslation } from '@/hooks/use-translation'

const ActivitySidePanel = dynamic(
  () => import('../activity/activity-side-panel'),
  {
    ssr: false,
    loading: () => <SidePanelSkeleton titleWidth="w-28" rowCount={6} />,
  },
)

const DMSidePanel = dynamic(() => import('../direct-messages/dms-side-panel'), {
  ssr: false,
  loading: () => <SidePanelSkeleton titleWidth="w-24" rowCount={6} />,
})

const LaterSidePanel = dynamic(() => import('../later/later-side-panel'), {
  ssr: false,
  loading: () => <SidePanelSkeleton titleWidth="w-24" rowCount={6} />,
})

const ThreadPanel = dynamic(() => import('../threads/thread-panel'), {
  ssr: false,
  loading: () => (
    <WorkspacePanelSkeleton titleWidth="w-28" rowCount={4} includeComposer />
  ),
})

const NewMessageComposer = dynamic(
  () => import('./new-message-composer'),
  {
    ssr: false,
    loading: () => (
      <WorkspacePanelSkeleton titleWidth="w-40" rowCount={3} includeComposer />
    ),
  },
)

const FileDetailPanel = dynamic(
  () => import('@/components/attachment-previews/file-detail-panel'),
  {
    ssr: false,
    loading: () => <SidePanelSkeleton titleWidth="w-24" rowCount={5} />,
  },
)

const ProfilePanel = dynamic(
  () => import('@/modules/profile/profile-panel'),
  {
    ssr: false,
    loading: () => <SidePanelSkeleton titleWidth="w-28" rowCount={6} />,
  },
)

const PreferencesDialog = dynamic(
  () =>
    import('@/modules/preferences/preferences-dialog').then(
      (mod) => mod.PreferencesDialog,
    ),
  {
    ssr: false,
    loading: () => null,
  },
)

const ChannelView = dynamic(() => import('@/modules/channels/channel-view'), {
  ssr: false,
  loading: () => <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />,
})

const DMView = dynamic(() => import('@/modules/direct-messages/dm-view'), {
  ssr: false,
  loading: () => <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />,
})

const PAGE_ONLY_TITLE_MAP: Record<string, string> = {
  activity: 'pageTitles.activity',
  dms: 'pageTitles.dms',
  drafts: 'pageTitles.drafts',
  files: 'pageTitles.files',
  later: 'pageTitles.later',
  'new-message': 'pageTitles.newMessage',
  search: 'pageTitles.search',
  threads: 'pageTitles.threads',
}

const SETTINGS_TAB_TITLE_MAP: Record<string, string> = {
  account: 'pageTitles.account',
  about: 'pageTitles.aboutWorkspace',
  customize: 'pageTitles.customize',
  invitations: 'pageTitles.invitations',
  members: 'pageTitles.members',
  profiles: 'pageTitles.profiles',
  roles: 'pageTitles.rolesAndPermissions',
  security: 'pageTitles.security',
  'settings-permissions': 'pageTitles.settingsAndPermissions',
}

function getWorkspaceRouteInfo(pathname: string) {
  const parts = pathname.split('/').filter(Boolean)
  const workspaceIndex = parts.indexOf('workspace')

  if (workspaceIndex < 0) return { section: null, itemId: null }

  return {
    section: parts[workspaceIndex + 2] ?? null,
    itemId: parts[workspaceIndex + 3] ?? null,
  }
}

function getPageOnlyTitle(pathname: string, searchParams: URLSearchParams, t: ReturnType<typeof useAppTranslation>) {
  const { section } = getWorkspaceRouteInfo(pathname)
  if (!section) return null

  if (section === 'drafts') {
    return searchParams.get('tab') === 'scheduled' ? t("pageTitles.scheduled") : t("pageTitles.drafts")
  }

  if (section === 'settings') {
    const { itemId } = getWorkspaceRouteInfo(pathname)
    const key = itemId ? SETTINGS_TAB_TITLE_MAP[itemId] ?? 'pageTitles.settings' : 'pageTitles.settings'
    return t(key as never)
  }

  const key = PAGE_ONLY_TITLE_MAP[section]
  return key ? t(key as never) : null
}

function getDirectOpenView(pathname: string) {
  const { section, itemId } = getWorkspaceRouteInfo(pathname)
  if (!section || !itemId) return null
  if (section === 'channel') return { type: 'channel' as const, id: itemId }
  if (section === 'dm') return { type: 'dm' as const, id: itemId }
  return null
}

function formatNewItemsLabel(count: number, t?: ReturnType<typeof useAppTranslation>) {
  if (count <= 0) return null
  if (t) return t("newItemsLabel", { count })
  return `${count} new item${count === 1 ? '' : 's'}`
}

async function buildBadgeFaviconHref(count: number) {
  const baseHref = '/logo.svg'
  if (count <= 0) return baseHref
  const iconSize = 64
  const badgeOuterRadius = 7
  const badgeInnerRadius = 1

  const canvas = document.createElement('canvas')
  canvas.width = iconSize
  canvas.height = iconSize
  const ctx = canvas.getContext('2d')
  if (!ctx) return baseHref

  const image = new Image()
  image.src = baseHref

  await new Promise<void>((resolve) => {
    image.onload = () => resolve()
    image.onerror = () => resolve()
  })

  ctx.clearRect(0, 0, iconSize, iconSize)

  if (image.complete && image.naturalWidth > 0) {
    ctx.drawImage(image, 0, 0, iconSize, iconSize)
  } else {
    ctx.fillStyle = '#111'
    ctx.fillRect(0, 0, iconSize, iconSize)
  }

  // Chỉ cần một chấm nhỏ báo hiệu có activity mới
  const badgeCenterX = iconSize - badgeOuterRadius - 2
  const badgeCenterY = badgeOuterRadius + 2

  ctx.beginPath()
  ctx.arc(
    badgeCenterX,
    badgeCenterY,
    badgeOuterRadius,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = '#e01e5a'
  ctx.fill()

  ctx.beginPath()
  ctx.arc(
    badgeCenterX,
    badgeCenterY,
    badgeInnerRadius,
    0,
    Math.PI * 2,
  )
  ctx.fillStyle = '#ffffff'
  ctx.fill()

  return canvas.toDataURL('image/png')
}

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
    ...(data.membershipStatus !== undefined && {
      membershipStatus: data.membershipStatus as WorkspaceMember['membershipStatus'],
    }),
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
  initialTheme: Theme
  workspaceId: string
  children: React.ReactNode
  initialWidths: WorkspacePanelInitialWidths
}

export default function WorkspaceShell({
  accountUser,
  initialSidebarUser,
  currentWorkspaceData,
  workspaceProfileData,
  initialTheme,
  workspaceId,
  children,
  initialWidths,
}: Props) {
  const t = useAppTranslation("workspaceShell")

  const pathname = usePathname()
  const searchParams = useSearchParams()
  const router = useRouter()
  const isSettingsPage = pathname.includes('/settings')
  const isDMsPage = pathname.includes('/dms')
  const isFilesPage = pathname.includes("/files");
  const isActivityPage = pathname.includes("/activity");
  const isLaterPage = pathname.includes("/later");
  const isSearchPage = pathname.includes("/search");
  const isHuddlesPage = pathname.includes("/huddles");

  const storeTheme = useThemeStore((s) => s.theme)
  const setTheme = useThemeStore((s) => s.setTheme)
  const confirmTheme = useThemeStore((s) => s.confirmTheme)
  const [hasSynced, setHasSynced] = useState(false)
  const theme = useMemo(() => {
    if (hasSynced) return storeTheme
    return initialTheme
  }, [initialTheme, storeTheme, hasSynced])

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
  const selectedItemTextColor = getContrastTextColor(theme.selectedItems);

  const { data: allWorkspaces = [] } = useWorkspaces()
  const { data: channels = [] } = useChannels(workspaceId)
  const { data: conversations = [] } = useConversations(workspaceId)
  const { data: memberPrefs, isLoading: memberPrefsLoading } = useMemberPreferences(workspaceId)

  // Hydrate the language/region store from server cache on first load.
  // This ensures I18nProvider reads the correct locale immediately (no flash).
  useHydrateLanguageRegionStore({
    workspaceId,
    serverPrefs: memberPrefs,
    isLoading: memberPrefsLoading,
  })
  const { count: dmUnreadCount } = useDmUnreadSummary(workspaceId)
  const { unreadCount: activityUnreadCount } = useUnreadNotificationsCount()
  const { overdueCount: laterOverdueCount } = useLaterOverdueSummary()
  const isCreatingNewMessage = useNewMessageStore((s) => s.isCreating)
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  )
  const mainPanelView = useMainPanelStore((s) => s.view)
  const mainPanelViewPathname = useMainPanelStore((s) => s.viewPathname)

  usePrefetchSidebarMutedItems({
    workspaceId,
    channels,
    enabled:
      !isSettingsPage &&
      !isDMsPage &&
      !isFilesPage &&
      !isActivityPage &&
      !isLaterPage &&
      !isHuddlesPage &&
      !isSearchPage,
  })

  const { data: account } = useQuery({
    queryKey: authKeys.me,
    queryFn: getUserApi,
    initialData: accountUser,
    staleTime: 5 * 60 * 1000,
  })

  const queryClient = useQueryClient();
  const { isMainGatewayConnected } = useSocket()
  const currentUserId = account?.id ?? accountUser.id
  const newItemsCount =
    (dmUnreadCount ?? 0) +
    (activityUnreadCount ?? 0) +
    (laterOverdueCount ?? 0)
  const faviconOriginalHrefRef = useRef<string | null>(null)
  const faviconBadgeHrefRef = useRef<string | null>(null)

  const documentTitle = useMemo(() => {
    if (isCreatingNewMessage) {
      const badgeLabel = formatNewItemsLabel(newItemsCount, t)
      const baseTitle = `${currentWorkspaceData.name}${badgeLabel ? ` - ${badgeLabel}` : ''} - Slack`
      return `New message - ${baseTitle}`
    }

    const directOpenView = getDirectOpenView(pathname)
    const mainPanelViewIsCurrent =
      mainPanelView.type !== 'route' && mainPanelViewPathname === pathname
    const currentPanelOpenView = mainPanelViewIsCurrent
      ? mainPanelView.type === 'channel'
        ? { type: 'channel' as const, id: mainPanelView.channelId }
        : { type: 'dm' as const, id: mainPanelView.conversationId }
      : null
    const activeOpenView = directOpenView ?? currentPanelOpenView

    if (activeOpenView?.type === 'channel') {
      const channelName =
        channels.find((channel) => channel.id === activeOpenView.id)?.name ??
        'Channel'
      const badgeLabel = formatNewItemsLabel(newItemsCount, t)
      return badgeLabel
        ? `${channelName} (Channel) - ${currentWorkspaceData.name} - ${badgeLabel} - Slack`
        : `${channelName} (Channel) - ${currentWorkspaceData.name} - Slack`
    }

    if (activeOpenView?.type === 'dm') {
      const conversation =
        conversations.find((item) => item.id === activeOpenView.id) ?? null
      const conversationName = conversation
        ? getDmDisplayName(
            conversation.members,
            currentUserId,
            (member) =>
              mergeUserForDisplay(member, memberOverlayMap[member.id]),
          )
        : 'DM'
      const badgeLabel = formatNewItemsLabel(newItemsCount, t)
      return badgeLabel
        ? `${conversationName} (DM) - ${currentWorkspaceData.name} - ${badgeLabel} - Slack`
        : `${conversationName} (DM) - ${currentWorkspaceData.name} - Slack`
    }

  const pagePrefix = getPageOnlyTitle(pathname, searchParams, t)
    const badgeLabel = formatNewItemsLabel(newItemsCount, t)
    const baseTitle = `${currentWorkspaceData.name}${badgeLabel ? ` - ${badgeLabel}` : ''} - Slack`
    return pagePrefix ? `${pagePrefix} - ${baseTitle}` : baseTitle
  }, [
    isCreatingNewMessage,
    pathname,
    searchParams,
    mainPanelView,
    mainPanelViewPathname,
    channels,
    conversations,
    currentWorkspaceData.name,
    currentUserId,
    memberOverlayMap,
    newItemsCount,
    t,
  ])

  useEffect(() => {
    document.title = documentTitle
  }, [documentTitle])

  useEffect(() => {
    let cancelled = false
    const updateFavicon = async () => {
      const links = Array.from(
        document.querySelectorAll<HTMLLinkElement>("link[rel*='icon']"),
      )
      if (links.length > 0 && !faviconOriginalHrefRef.current) {
        faviconOriginalHrefRef.current = links[0]?.href ?? null
      }

      const originalHref = faviconOriginalHrefRef.current ?? '/favicon.ico'

      if (newItemsCount <= 0) {
        if (faviconBadgeHrefRef.current) {
          for (const link of links) link.href = originalHref
          faviconBadgeHrefRef.current = null
        }
        return
      }

      const badgeHref = await buildBadgeFaviconHref(newItemsCount)
      if (cancelled) return

      faviconBadgeHrefRef.current = badgeHref
      if (links.length === 0) {
        const link = document.createElement('link')
        link.rel = 'icon'
        link.href = badgeHref
        document.head.appendChild(link)
        return
      }

      for (const link of links) {
        link.href = badgeHref
      }
    }

    void updateFavicon()

    return () => {
      cancelled = true
    }
  }, [newItemsCount])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase()
      if ((event.metaKey || event.ctrlKey) && key === 'k') {
        event.preventDefault()
        useGlobalSearchStore.getState().openSearch()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const redirectToDeactivatedNotice = useCallback(() => {
    useMainPanelStore.getState().reset()
    useThreadPanelStore.getState().close()
    useFileDetailStore.getState().close()
    useProfilePanelStore.getState().close()
    router.replace(`/deactivated?workspaceId=${workspaceId}`)
  }, [router, workspaceId])

  const invalidateDmMembershipCaches = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: messageKeys.conversations(workspaceId),
    })
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey
        return (
          Array.isArray(k) &&
          k[0] === 'dm-conversations' &&
          (k[1] === workspaceId || k[1] === 'detail')
        )
      },
    })
    void queryClient.invalidateQueries({
      queryKey: workspaceKeys.recents(workspaceId),
    })
  }, [queryClient, workspaceId])

  useGlobalSync(workspaceId)

  useWorkspaceSocket(workspaceId, isMainGatewayConnected, {
    onUserProfileUpdated: useCallback((data: Record<string, unknown>) => {
      const userId = data.id as string | undefined
      const updatedWsId = data.workspaceId as string | undefined
      if (!userId || updatedWsId !== workspaceId) return

      if (
        userId === currentUserId &&
        data.membershipStatus === 'deactivated'
      ) {
        redirectToDeactivatedNotice()
        return
      }

      useWorkspaceMemberStore.getState().patchFromSocket(workspaceId, data)

      // 1. Cập nhật cache Member Status (cho Profile Panel và các chỗ khác)
      queryClient.setQueryData(['workspace-member-status', workspaceId, userId], (old: Record<string, unknown> | undefined) => {
        return old ? { ...old, ...data } : old
      })

      // 2. Nếu là chính mình, invalidate profile cache của workspace hiện tại
      if (userId === currentUserId) {
        queryClient.invalidateQueries({
          queryKey: authKeys.workspaceProfile(workspaceId),
        })
      }

      // Message list / thread panel: dùng useWorkspaceMemberStore + merge trong MessageItem (không quét infinite query)

      // 4. Danh sách members trong channel (Members tab) — tên + avatar + status
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            return isChannelMembersQueryKey(q.queryKey, workspaceId)
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

      if (data.membershipStatus !== undefined) {
        invalidateDmMembershipCaches()
      }
    }, [workspaceId, currentUserId, queryClient, redirectToDeactivatedNotice, invalidateDmMembershipCaches]),
    onHuddleState: useCallback(
      (data: {
        reason: string
        target: { workspaceId: string; entityType: string; entityId: string }
        state: HuddleStateSnapshot
        session: HuddleSessionSnapshot | null
      }) => {
        if (data.target.workspaceId !== workspaceId) return
        if (data.target.entityType !== 'channel' && data.target.entityType !== 'dm') return

        const entityType = data.target.entityType as 'channel' | 'dm'

        // Resolve entityLabel from channels/conversations already in memory
        // Mirrors the resolution done server-side in getWorkspaceHuddles()
        const resolveEntityLabel = (
          et: 'channel' | 'dm',
          entityId: string,
        ) => {
          if (et === 'channel') {
            const channel = channels.find((c) => c.id === entityId)
            return channel ? `#${channel.name}` : `#${entityId}`
          }
          const conversation = conversations.find((c) => c.id === entityId)
          if (!conversation) return entityId
          const otherMember = conversation.members.find(
            (m) => m.id !== currentUserId,
          )
          if (!otherMember) return 'Yourself'
          const merged = mergeUserForDisplay(
            otherMember,
            memberOverlayMap[otherMember.id],
          )
          return (
            merged.displayName?.trim() ||
            merged.name?.trim() ||
            entityId
          )
        }

        // Update Zustand store FIRST - this is the primary source of truth for UI
        const target: HuddleTarget = {
          workspaceId: data.target.workspaceId,
          entityType,
          entityId: data.target.entityId,
        }
        useWorkspaceHuddlesStore.getState().setHuddle(
          data.target.workspaceId,
          entityType,
          data.target.entityId,
          target,
          data.state,
        )

        // Then update TanStack Query cache (for components that might still use it)
        queryClient.setQueryData(
          huddleKeys.state(
            data.target.workspaceId,
            entityType,
            data.target.entityId,
          ),
          data.state,
        )

        // Track current user's active huddle for the indicator bar
        const current = useCurrentHuddleStore.getState().currentHuddle
        const isCurrentEntity =
          current &&
          current.target.workspaceId === data.target.workspaceId &&
          current.target.entityType === entityType &&
          current.target.entityId === data.target.entityId

        if (data.state.activeSession) {
          const isCurrentUserInHuddle = data.state.activeSession.participants.some(
            (p) => p.userId === currentUserId && p.leftAt === null,
          )

          if (isCurrentUserInHuddle) {
            let label = entityType === 'channel' ? `#${data.target.entityId}` : data.target.entityId
            if (entityType === 'channel') {
              const channel = channels.find((c) => c.id === data.target.entityId)
              if (channel) label = `#${channel.name}`
            } else {
              const conversation = conversations.find((c) => c.id === data.target.entityId)
              if (conversation) {
                const otherMember = conversation.members.find((m) => m.id !== currentUserId)
                if (otherMember) {
                  label = otherMember.displayName || otherMember.name || data.target.entityId
                }
              }
            }

            useCurrentHuddleStore.getState().setCurrentHuddle({
              target: {
                workspaceId: data.target.workspaceId,
                entityType,
                entityId: data.target.entityId,
              },
              label,
              topic: data.state.activeSession?.topic ?? null,
            })
          } else if (isCurrentEntity) {
            // User left the huddle or huddle ended
            useCurrentHuddleStore.getState().clearCurrentHuddle()
          }
        } else if (isCurrentEntity) {
          // Huddle ended (activeSession became null)
          useCurrentHuddleStore.getState().clearCurrentHuddle()
        }

        // Update recentHuddles cache for real-time UI updates
        // Only affects queries with key: ['huddles', workspaceId, 'recent', ...]
        queryClient.setQueriesData(
          {
            predicate: (q) => {
              const k = q.queryKey
              return (
                Array.isArray(k) &&
                k[0] === 'huddles' &&
                k[2] === workspaceId &&
                k[3] === 'recent'
              )
            },
          },
          (old: RecentHuddlesResponse | undefined) => {
            if (!old) return old

            // Handle topic_update: update topic in cached recent huddles
            if (data.reason === 'topic_update' && data.session) {
              return {
                ...old,
                recent: old.recent.map((h) =>
                  h.id === data.session!.id
                    ? { ...h, topic: data.session!.topic }
                    : h
                ),
              }
            }

            // Handle huddle ended (activeSession became null, session has endedAt)
            // Add the ended session to recent list if not already there
            if (
              !data.state.activeSession &&
              data.session &&
              data.session.endedAt
            ) {
              const existsInRecent = old.recent.some(
                (h) => h.id === data.session!.id
              )
              if (existsInRecent) return old

              const endedSession = data.session
              const now = new Date().toISOString()
              const newRecentItem: HuddlePageItem = {
                id: endedSession.id,
                workspaceId: endedSession.workspaceId,
                entityType: endedSession.entityType as 'channel' | 'dm',
                entityId: endedSession.entityId,
                entityLabel: resolveEntityLabel(
                  endedSession.entityType as 'channel' | 'dm',
                  endedSession.entityId,
                ),
                status: 'ended',
                topic: endedSession.topic ?? null,
                startedAt: endedSession.startedAt,
                endedAt: endedSession.endedAt ?? now,
                durationSeconds: endedSession.endedAt
                  ? Math.floor(
                      (new Date(endedSession.endedAt).getTime() -
                        new Date(endedSession.startedAt).getTime()) /
                        1000
                    )
                  : 0,
                participantCount: endedSession.participantCount,
                replyCount: 0,
                feedMessageId: null,
                participants: endedSession.participants,
              }

              return {
                ...old,
                recent: [newRecentItem, ...old.recent],
                pagination: {
                  ...old.pagination,
                  totalRecent: old.pagination.totalRecent + 1,
                },
              }
            }

            return old
          },
        )

        // Update workspaceHuddles cache (active huddles list) for real-time UI updates
        queryClient.setQueriesData(
          {
            predicate: (q) => {
              const k = q.queryKey
              return (
                Array.isArray(k) &&
                k[0] === 'huddles' &&
                k[1] === 'workspace' &&
                k[2] === workspaceId &&
                k[3] !== 'recent'
              )
            },
          },
          (old: WorkspaceHuddlesResponse | undefined) => {
            if (!old || !Array.isArray(old.active)) return old

            const entityType = data.target.entityType as 'channel' | 'dm'
            const stateSessionId = data.state.activeSession?.id ?? data.session?.id
            const matchedByEntity = old.active.find(
              (h) => h.entityType === entityType && h.entityId === data.target.entityId,
            )
            const targetHuddleId = stateSessionId ?? matchedByEntity?.id
            if (!targetHuddleId) return old

            // Handle topic_update for existing active huddles
            if (data.reason === 'topic_update' && targetHuddleId) {
              return {
                ...old,
                active: old.active.map((h: HuddlePageItem) =>
                  h.id === targetHuddleId
                    ? { ...h, topic: data.state.activeSession?.topic ?? h.topic }
                    : h,
                ),
              }
            }

            if (data.state.activeSession) {
              // Huddle is still active - update or add
              const existingIndex = old.active.findIndex((h) => h.id === targetHuddleId)

              if (existingIndex !== -1) {
                // UPDATE existing huddle with new participant data
                return {
                  ...old,
                  active: old.active.map((h: HuddlePageItem) =>
                    h.id === targetHuddleId
                      ? {
                          ...h,
                          topic: data.state.activeSession!.topic ?? h.topic,
                          durationSeconds: Math.floor(
                            (Date.now() - new Date(data.state.activeSession!.startedAt).getTime()) / 1000,
                          ),
                          participantCount: data.state.activeSession!.participantCount,
                          replyCount: h.replyCount, // Keep existing replyCount (backend doesn't broadcast it)
                          participants: data.state.activeSession!.participants,
                        }
                      : h,
                  ),
                }
              }

              // New huddle - add to active list
              const newActiveItem: HuddlePageItem = {
                id: data.state.activeSession.id,
                workspaceId: data.target.workspaceId,
                entityType,
                entityId: data.target.entityId,
                entityLabel: resolveEntityLabel(entityType, data.target.entityId),
                status: 'active',
                topic: data.state.activeSession.topic ?? null,
                startedAt: data.state.activeSession.startedAt,
                endedAt: null,
                durationSeconds: Math.floor(
                  (Date.now() - new Date(data.state.activeSession.startedAt).getTime()) / 1000,
                ),
                participantCount: data.state.activeSession.participantCount,
                replyCount: 0,
                feedMessageId: data.state.activeSession.feedMessageId,
                participants: data.state.activeSession.participants,
              }

              return {
                ...old,
                active: [newActiveItem, ...old.active],
                pagination: {
                  ...old.pagination,
                  totalActive: (old.pagination.totalActive ?? 0) + 1,
                },
              }
            } else if (!data.state.activeSession) {
              // Huddle ended - remove from active
              return {
                ...old,
                active: old.active.filter((h: HuddlePageItem) => h.id !== targetHuddleId),
                pagination: {
                  ...old.pagination,
                  totalActive: Math.max(0, (old.pagination.totalActive ?? 0) - 1),
                },
              }
            }

            return old
          },
        )
      },
      [queryClient, workspaceId, currentUserId, channels, conversations, memberOverlayMap],
    ),
    onEntitySync: useCallback((data: { domain: string; action: string; payload: Record<string, unknown> }) => {
      if (data.domain !== 'USER') return
      const payloadWs = data.payload.workspaceId as string | undefined
      const userId = data.payload.id as string | undefined
      if (!payloadWs || payloadWs !== workspaceId || !userId) return

      if (data.action === 'DELETE') {
        queryClient.setQueriesData(
          {
            predicate: (q) => {
              const k = q.queryKey
              return Array.isArray(k) && k[0] === 'workspaces' && k[1] === workspaceId && k[2] === 'members-page'
            },
          },
          (old: unknown) => {
            if (!old || typeof old !== 'object' || !('items' in old)) return old
            const page = old as { items: WorkspaceMember[]; total?: number }
            return {
              ...page,
              total: typeof page.total === 'number' ? Math.max(0, page.total - 1) : page.total,
              items: page.items.filter((m) => m.id !== userId),
            }
          },
        )
        queryClient.setQueryData(
          ['workspaces', workspaceId, 'members'],
          (old: WorkspaceMember[] | undefined) =>
            old?.filter((m) => m.id !== userId) ?? old,
        )
        void queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members'] })
        void queryClient.invalidateQueries({ queryKey: ['workspaces', workspaceId, 'members-page'] })
        void queryClient.invalidateQueries({ queryKey: ['workspaces'] })
        void queryClient.invalidateQueries({ queryKey: channelKeys.all(workspaceId) })
        void queryClient.invalidateQueries({ queryKey: ['dm-conversations', workspaceId] })
        void queryClient.invalidateQueries({ queryKey: workspaceKeys.recents(workspaceId) })
        void queryClient.invalidateQueries({
          predicate: (q) => {
            return isChannelMembersQueryKey(q.queryKey, workspaceId)
          },
        })
        void queryClient.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey
            return (
              Array.isArray(k) &&
              k[0] === 'dm-conversations' &&
              (k[1] === workspaceId || k[1] === 'detail')
            )
          },
        })
        return
      }

      if (data.action !== 'UPDATE') return

      if (
        userId === currentUserId &&
        data.payload.membershipStatus === 'deactivated'
      ) {
        redirectToDeactivatedNotice()
        return
      }

      useWorkspaceMemberStore.getState().patchFromSocket(workspaceId, data.payload)
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            const k = q.queryKey
            return Array.isArray(k) && k[0] === 'workspaces' && k[1] === workspaceId && k[2] === 'members-page'
          },
        },
        (old: unknown) => {
          if (!old || typeof old !== 'object' || !('items' in old)) return old
          const page = old as { items: WorkspaceMember[] }
          return {
            ...page,
            items: page.items.map((m) =>
              m.id === userId ? mergeWorkspaceMemberProfile(m, data.payload) : m,
            ),
          }
        },
      )
      if (data.payload.membershipStatus !== undefined) {
        invalidateDmMembershipCaches()
      }
    }, [workspaceId, currentUserId, queryClient, redirectToDeactivatedNotice, invalidateDmMembershipCaches]),
    onWorkspacePresenceSnapshot: useCallback((data: { workspaceId: string; connectedUserIds: string[] }) => {
      if (data.workspaceId !== workspaceId) return
      useWorkspacePresenceStore.getState().setWorkspaceSnapshot(
        workspaceId,
        data.connectedUserIds ?? [],
      )
    }, [workspaceId]),
    onWorkspacePresenceUpdated: useCallback((data: { workspaceId: string; userId: string; isConnected: boolean }) => {
      if (data.workspaceId !== workspaceId) return
      useWorkspacePresenceStore.getState().setUserPresence(
        workspaceId,
        data.userId,
        data.isConnected,
      )
    }, [workspaceId]),
  });

  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(workspaceId),
    queryFn: () => getWorkspaceProfileApi(workspaceId),
    staleTime: 60 * 1000,
  })
  useEffect(() => {
    if (workspaceProfileData?.theme) {
      try {
        const parsedTheme = JSON.parse(workspaceProfileData.theme) as Theme
        const currentTheme = useThemeStore.getState().theme
        if (JSON.stringify(currentTheme) !== JSON.stringify(parsedTheme)) {
          setTheme(parsedTheme)
          confirmTheme()
        }
      } catch (error) {
        console.error('Failed to parse theme', error)
      }
    }

    queueMicrotask(() => setHasSynced(true))
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
  const resetMainPanel = useMainPanelStore((s) => s.reset)



  useEffect(() => {
    if (!account) return
    const nextUser = mergeAccountWithWorkspaceProfile(account, workspaceProfile)
    const currentUser = useUserStore.getState().user
    if (JSON.stringify(currentUser) === JSON.stringify(nextUser)) return
    setUser(nextUser)
  }, [account, workspaceProfile, setUser])

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
    <div className="flex flex-col w-screen h-screen overflow-hidden"
      style={{
        background: getSysNavBackground(),
        ["--color-selection-hover-foreground" as string]: selectedItemTextColor,
        ["--color-workspace-text-active" as string]: selectedItemTextColor,
      }}
    >
      {!isSettingsPage && (
        <Toolbar
          workspaceId={workspaceId}
          currentWorkspaceData={currentWorkspaceData}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden"
      >
        {!isSettingsPage && (
          <Sidebar
            userData={displayUser}
            currentWorkspaceData={currentWorkspaceData}
            userWorkspacesData={allWorkspaces}
          />
        )}

        <main className="min-h-0 flex-1 min-w-0 mr-1 mb-1 overflow-hidden"
        >
          <div className={isSettingsPage ? "flex h-full min-h-0 overflow-hidden" : "flex h-full min-h-0 rounded-lg border border-[#462B4A] overflow-hidden"}>
            {!isSettingsPage && !isSearchPage && !isFilesPage && (
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
                    />
                  )}
                  {isActivityPage && (
                    <ActivitySidePanel
                      theme={theme}
                      currentWorkspaceData={currentWorkspaceData}
                    />
                  )}
                  {!isDMsPage && !isLaterPage && !isFilesPage && !isActivityPage && !isSearchPage && (
                    <WorkspaceSidePanel
                      theme={theme}
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
            <div className={isSettingsPage ? "flex-1 min-w-0 min-h-0 h-full overflow-hidden flex flex-col" : "flex-1 min-w-0 min-h-0 h-full bg-white dark:bg-[#1A1D21] py-2 overflow-hidden flex flex-col"}>
              {isSearchPage ? (
                children
              ) : isCreatingNewMessage ? (
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
      <ActiveHuddleIndicator />
      <PreferencesDialog />
    </div>
  )
}
