'use client'

import MessageItem from '@/components/message-item'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from '@/components/ui/skeleton'
import { useAddReaction, useToggleLaterMessage, useTogglePin } from '@/hooks/use-messages'
import { markChannelAsReadApi, markDmConversationAsReadApi } from '@/apis'
import { useChannelMessages } from '@/hooks/use-channel-messages'
import { useLaterSavedMessageIds } from '@/hooks/use-saved-items'
import { usePrefetchPdfAttachments } from '@/hooks/use-prefetch-pdf-attachments'
import { useMessageStore } from '@/stores/useMessageStore'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useMessageFocusStore } from '@/stores/useMessageFocusStore'
import type { DirectMessageConversation, Message, User } from '@/lib/types'
import { openHuddlePreviewWindow } from '@/lib/open-huddle-preview-window'
import { format, isSameDay, isThisYear, isToday, isYesterday, startOfDay, subWeeks, subMonths } from 'date-fns'
import { enUS, vi } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect } from 'react'
import { IoChevronDownOutline } from "react-icons/io5"
import { useVirtualizer } from '@tanstack/react-virtual'
import JumpToSpecificDateDialog from './dialogs/jump-to-specific-date-dialog'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { messageKeys } from '@/lib/query-keys'
import { toast } from 'sonner'
import DMIntro from '@/modules/direct-messages/dm-intro'
import { useLanguage, useMessageList, useDateFormat } from '@/hooks/use-translation'
import type { Language } from '@/stores/useLanguageRegionStore'

const TOP_LOAD_THRESHOLD_PX = 50
const BOTTOM_LOAD_THRESHOLD_PX = 48

interface MessageListProps {
  channelId?: string
  conversationId?: string
  currentUserId: string
  workspaceId: string
  isConnected: boolean
  onEditMessage?: (message: Message) => void
  onDeleteMessage?: (messageId: string) => void
  onSaveForLater?: (messageId: string) => void
  onJoinHuddle?: (message: Message) => void
  fromPublicChannel?: boolean
  isMember?: boolean
  channelPostingSettings?: {
    allowThreads: boolean
    allowMentions: boolean
    mode: 'everyone' | 'admin_only' | 'admins_plus_specific_people'
    specificUserIds: string[]
  } | null
  unreadBoundaryAt?: string | null
  unreadCount?: number
}

type ListItem =
  | { type: 'message'; message: Message; isCompact: boolean }
  | { type: 'date'; date: Date }
  | { type: 'new-divider'; anchorMessageId: string }
  | { type: 'welcome'; members?: User[]; isGroup?: boolean; createdAt?: string; workspaceId?: string; channelName?: string }

// Pagination states and Virtualizer types removed in favor of @tanstack/react-virtual

const getItemKey = (item: ListItem) => {
  if (!item) return null
  if (item.type === 'message') return item.message.id
  if (item.type === 'date') return `date-${item.date.getTime()}`
  if (item.type === 'new-divider') return `new-divider-${item.anchorMessageId}`
  if (item.type === 'welcome') return 'welcome'
  return null
}

function DateSeparator({ date, onJump, onJumpToMostRecent, onOpenJumpDialog, onJumpToBeginning, createdAt }: { date: Date, onJump: (date: Date) => void, onJumpToMostRecent: () => void, onOpenJumpDialog: () => void, onJumpToBeginning: () => void, createdAt?: string }) {
  const [open, setOpen] = useState(false)
  const language = useLanguage()
  const dateFormat = useDateFormat()
  const t = useMessageList()

  const dateLocale = language === 'vi' ? vi : enUS

  let label: string
  const todayLabel = t("jumpTo.today") || t("common.today") || "Today"
  const yesterdayLabel = t("jumpTo.yesterday") || t("common.yesterday") || "Yesterday"

  if (isToday(date)) label = todayLabel
  else if (isYesterday(date)) label = yesterdayLabel
  else {
    // Format based on dateFormat preference: en_US = MMMM do, vi_VN = do MMMM
    if (dateFormat === 'vi_VN') {
      if (isThisYear(date)) label = format(date, 'do MMMM', { locale: dateLocale })
      else label = format(date, 'do MMMM, yyyy', { locale: dateLocale })
    } else {
      if (isThisYear(date)) label = format(date, 'MMMM do', { locale: dateLocale })
      else label = format(date, 'MMMM do, yyyy', { locale: dateLocale })
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 my-2">
      <div className="w-full h-[0.5px] bg-[#DDDDDD] dark:bg-[#35373B] relative">
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 cursor-pointer absolute right-[50%] translate-x-1/2 bottom-[50%] translate-y-1/2 px-4 py-1 rounded-full bg-white dark:bg-[#1A1D21] border border-[#797c814d] text-[13px] font-bold">
              {label}
              <IoChevronDownOutline size={10} />
            </button>
          </PopoverTrigger>
          <PopoverContent withOverlay>
            <div className="flex flex-col py-2">
              <span className="mx-4 text-[12px] text-[#8e9297]">{t("jumpTo.title")}</span>
              <div onClick={() => { setOpen(false); onJumpToMostRecent() }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">{t("jumpTo.mostRecent")}</div>
              <div onClick={() => { setOpen(false); onJump(subWeeks(new Date(), 1)) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">{t("jumpTo.lastWeek")}</div>
              <div onClick={() => { setOpen(false); onJump(subMonths(new Date(), 1)) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">{t("jumpTo.lastMonth")}</div>
              {createdAt && <div onClick={() => { setOpen(false); onJumpToBeginning() }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">{t("jumpTo.theVeryBeginning")}</div>}
              <Separator className="my-2" />
              <div onClick={() => { setOpen(false); onOpenJumpDialog() }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">{t("jumpTo.specificDate")}</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

function isMessageOnDate(message: Message | undefined, date: Date): boolean {
  if (!message) return false
  return isSameDay(new Date(message.createdAt), date)
}

function findDateAnchorIndex(items: ListItem[], date: Date): number {
  const separatorIndex = items.findIndex(
    (item) => item.type === 'date' && isSameDay(item.date, date),
  )
  if (separatorIndex >= 0) return separatorIndex

  return items.findIndex(
    (item) => item.type === 'message' && isMessageOnDate(item.message, date),
  )
}

function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex gap-3">
          <Skeleton className="w-9 h-9 rounded-lg shrink-0 bg-[#2a2d31]" />
          <div className="flex-1 space-y-2">
            <div className="flex gap-2">
              <Skeleton className="h-3.5 w-24 bg-[#2a2d31]" />
              <Skeleton className="h-3.5 w-16 bg-[#2a2d31]" />
            </div>
            <Skeleton className="h-4 bg-[#2a2d31]" style={{ width: `${40 + i * 12}%` }} />
            {i % 3 === 0 && <Skeleton className="h-4 w-2/3 bg-[#2a2d31]" />}
          </div>
        </div>
      ))}
    </div>
  )
}

function ChannelWelcome({ channelName, members, isGroup, createdAt, workspaceId }: {
  channelName?: string
  members?: User[]
  isGroup?: boolean
  createdAt?: string
  workspaceId?: string
}) {
  const t = useMessageList()

  if (members?.length && typeof isGroup === 'boolean' && createdAt && workspaceId) {
    return <DMIntro members={members} isGroup={isGroup} createdAt={createdAt} workspaceId={workspaceId} />
  }
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="text-center text-[#797c81]">
        <div className="text-4xl mb-3">#</div>
        <h3 className="text-xl font-bold mb-1">{t("welcome.channelTitle")}</h3>
        <p className="text-sm">{t("welcome.channelDescription", { channelName: channelName || "" })}</p>
      </div>
    </div>
  )
}

function shouldCompact(prev: Message, curr: Message): boolean {
  if (prev.user.id !== curr.user.id) return false
  const prevTime = new Date(prev.createdAt).getTime()
  const currTime = new Date(curr.createdAt).getTime()
  return currTime - prevTime < 5 * 60 * 1000
}

function buildListItemsFromMessages(messages: Message[], hasOlder: boolean): ListItem[] {
  const items: ListItem[] = []
  let lastDate: Date | null = null

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const msgDate = new Date(msg.createdAt)

    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      if (!(i === 0 && hasOlder)) {
        items.push({ type: 'date', date: startOfDay(msgDate) })
      }
      lastDate = startOfDay(msgDate)
    }

    const prevMsg = i > 0 ? messages[i - 1] : null
    items.push({ type: 'message', message: msg, isCompact: prevMsg ? shouldCompact(prevMsg, msg) : false })
  }

  return items
}

function buildRenderedListItems({
  messages,
  isInitialized,
  hasOlder,
  members,
  isGroup,
  createdAt,
  workspaceId,
  channelName,
  unreadBoundaryAt,
  stickyUnreadBoundaryAt,
  unreadCount,
  stickyUnreadCountSnapshot,
  currentUserId,
}: {
  messages: Message[]
  isInitialized: boolean
  hasOlder: boolean
  members?: User[]
  isGroup?: boolean
  createdAt?: string
  workspaceId?: string
  channelName?: string
  unreadBoundaryAt?: string | null
  stickyUnreadBoundaryAt: string | null
  unreadCount?: number
  stickyUnreadCountSnapshot: number
  currentUserId: string
}): ListItem[] {
  if (!isInitialized && messages.length === 0) {
    return []
  }

  const items = buildListItemsFromMessages(messages, hasOlder)
  const effectiveUnreadBoundaryAt = stickyUnreadBoundaryAt ?? unreadBoundaryAt ?? null
  let firstUnreadMessage: Message | undefined
  const effectiveUnreadCount = Math.max(
    unreadCount ?? 0,
    stickyUnreadCountSnapshot,
  )
  if (effectiveUnreadCount > 0 && effectiveUnreadBoundaryAt) {
    firstUnreadMessage = messages.find(
      (m) =>
        m.user.id !== currentUserId &&
        new Date(m.createdAt).getTime() >
          new Date(effectiveUnreadBoundaryAt).getTime(),
    )
  } else if (effectiveUnreadCount > 0) {
    const nonSelfMessages = messages.filter((m) => m.user.id !== currentUserId)
    if (nonSelfMessages.length > 0) {
      const idx = Math.max(0, nonSelfMessages.length - effectiveUnreadCount)
      firstUnreadMessage = nonSelfMessages[idx]
    }
  }
  if (firstUnreadMessage) {
    const unreadMessageIndex = items.findIndex(
      (item) => item.type === 'message' && item.message.id === firstUnreadMessage.id,
    )
    if (unreadMessageIndex >= 0) {
      items.splice(unreadMessageIndex, 0, {
        type: 'new-divider',
        anchorMessageId: firstUnreadMessage.id,
      })
    }
  }
  if (!hasOlder && isInitialized) {
    items.unshift({ type: 'welcome' as const, members, isGroup, createdAt, workspaceId, channelName })
  }

  return items
}

function NewDivider() {
  const t = useMessageList()

  return (
    <div
      className="flex w-full items-center justify-end gap-2 border-t-2 border-[#ff5a2b] px-0 py-1"
      aria-label="New unread messages"
    >
      <span className="px-2 text-sm font-bold leading-none text-[#ff5a2b]">
        {t("newDivider.label")}
      </span>
    </div>
  )
}

export default function MessageList({
  channelId,
  conversationId,
  currentUserId,
  workspaceId,
  isConnected,
  onEditMessage,
  onDeleteMessage,
  onSaveForLater,
  onJoinHuddle,
  members,
  isGroup,
  createdAt,
  fromPublicChannel,
  isMember,
  channelPostingSettings,
  unreadBoundaryAt,
  unreadCount,
}: MessageListProps & { members?: User[]; isGroup?: boolean; createdAt?: string; channelName?: string }) {
  const [openJumpToSpecificDateDialog, setOpenJumpToSpecificDateDialog] = useState(false)
  const [stickyUnreadBoundaryAt, setStickyUnreadBoundaryAt] = useState<string | null>(null)
  const [stickyUnreadCountSnapshot, setStickyUnreadCountSnapshot] = useState<number>(0)
  const queryClient = useQueryClient()

  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(null)

  const target = channelId ? { channelId } : { conversationId }
  const targetId = (channelId || conversationId) as string

  const {
    messages,
    hasOlder,
    hasNewer,
    isLoadingOlder,
    isLoadingNewer,
    isInitialized,
    fetchOlderPage,
    fetchNewer,
    jumpToDate,
    jumpToBeginning,
    jumpToMostRecent,
  } = useChannelMessages(target, currentUserId, isConnected)

  const messageIdsForLater = useMemo(
    () => messages.map((m) => m.id),
    [messages],
  )
  const { savedMessageIdSet, remindAtByMessageId } = useLaterSavedMessageIds(
    workspaceId,
    messageIdsForLater,
  )

  const { mutate: toggleLaterMessage } = useToggleLaterMessage(workspaceId)

  const handleSaveForLater = useCallback(
    (messageId: string) => {
      if (onSaveForLater) {
        onSaveForLater(messageId)
        return
      }
      toggleLaterMessage(messageId)
    },
    [onSaveForLater, toggleLaterMessage],
  )

  const { focusedMessageId, setFocusedMessageId } = useMessageFocusStore()
  const [internalFocusedId, setInternalFocusedId] = useState<string | null>(null)
  const [isJumping, setIsJumping] = useState(false)
  
  type JumpState =
    | {
        mode: 'date'
        targetDate: Date
        phase: 'loading-window' | 'expanding-older' | 'ready-to-scroll'
      }
    | {
        mode: 'beginning'
        targetDate: Date
        phase: 'loading-window' | 'expanding-older' | 'ready-to-scroll'
      }
    | {
        mode: 'recent'
        targetDate: Date
        phase: 'loading-window' | 'ready-to-scroll'
      }
      
  const [jumpState, setJumpState] = useState<JumpState | null>(null)
  const [isJumpWindowReady, setIsJumpWindowReady] = useState(false)
  
  const isPrependingRef = useRef(false)
  const anchorRef = useRef<{ key: string, expectedStart: number } | null>(null)
  const restoreSnapshotRef = useRef<{ scrollTop: number; scrollHeight: number; clientHeight: number } | null>(null)
  const restorePendingRef = useRef(false)
  const isRestoringRef = useRef(false)
  const isNearTopRef = useRef(false)
  const hasOlderRef = useRef(hasOlder)
  const isLoadingOlderRef = useRef(isLoadingOlder)
  const isJumpingRef = useRef(isJumping)

  const { mutate: addReaction } = useAddReaction(targetId)
  const { mutate: togglePin } = useTogglePin(targetId)
  const openThread = useThreadPanelStore((s) => s.open)
  const t = useMessageList()

  const lastTargetIdRef = useRef(targetId)
  const hasRenderedTimelineRef = useRef(false)

  const clearOlderLoadState = useCallback(() => {
    restorePendingRef.current = false
    isPrependingRef.current = false
    isRestoringRef.current = false
    anchorRef.current = null
    restoreSnapshotRef.current = null
  }, [])

  const canLoadOlder = useCallback(() => {
    const scroller = scrollContainerRef.current
    return !!scroller &&
      hasOlderRef.current &&
      !isLoadingOlderRef.current &&
      !isJumpingRef.current &&
      !isPrependingRef.current &&
      !isRestoringRef.current
  }, [])

  const listItems = useMemo(() => {
    return buildRenderedListItems({
      messages,
      isInitialized,
      hasOlder,
      members,
      isGroup,
      createdAt,
      workspaceId,
      unreadBoundaryAt,
      stickyUnreadBoundaryAt,
      unreadCount,
      stickyUnreadCountSnapshot,
      currentUserId,
    })
  }, [messages, isInitialized, hasOlder, members, isGroup, createdAt, workspaceId, unreadBoundaryAt, stickyUnreadBoundaryAt, unreadCount, stickyUnreadCountSnapshot, currentUserId])

  const virtualizer = useVirtualizer({
    count: listItems.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 80,
    overscan: 15,
    getItemKey: (index) => getItemKey(listItems[index]) || index,
  })

  useEffect(() => {
    if (listItems.length > 0) {
      hasRenderedTimelineRef.current = true
    }
  }, [listItems.length, targetId])

  usePrefetchPdfAttachments([{ messages, nextCursor: null, hasMore: false }])

  const dividerIndex = listItems.findIndex((item) => item.type === 'new-divider')
  const hasServerUnread = (unreadCount ?? 0) > 0
  const latestMessageTsRef = useRef<number>(0)
  const readAckTsRef = useRef<number>(0)

  const markTargetAsRead = useMutation({
    mutationFn: ({
      targetType,
      targetId,
    }: {
      targetType: 'channel' | 'conversation'
      targetId: string
    }) =>
      targetType === 'channel'
        ? markChannelAsReadApi(targetId)
        : markDmConversationAsReadApi(targetId),
    onMutate: ({ targetType, targetId }) => {
      if (!workspaceId) return
      const nowIso = new Date().toISOString()
      let shouldDecrementSummary = false

      if (targetType === 'conversation') {
        queryClient.setQueriesData<DirectMessageConversation[] | undefined>(
          {
            queryKey: messageKeys.conversations(workspaceId),
            exact: false,
          },
          (old) => {
            if (!old?.length) return old
            return old.map((conv) => {
              if (conv.id !== targetId) return conv
              const prevUnread = conv.unreadCount ?? 0
              if (prevUnread > 0) shouldDecrementSummary = true
              return {
                ...conv,
                unreadCount: 0,
                lastReadAt: nowIso,
              }
            })
          },
        )

        queryClient.setQueryData<DirectMessageConversation | undefined>(
          messageKeys.conversationDetail(targetId),
          (old) => {
            if (!old) return old
            return {
              ...old,
              unreadCount: 0,
              lastReadAt: nowIso,
            }
          },
        )

        if (shouldDecrementSummary) {
          queryClient.setQueryData<{ count: number } | undefined>(
            messageKeys.conversationsUnreadSummary(workspaceId),
            (old) => ({
              count: Math.max(0, (old?.count ?? 0) - 1),
            }),
          )
        }
      }
      if (targetType === 'channel') {
        queryClient.setQueryData<{
          channels: { id: string; unreadCount: number }[]
          conversations: { id: string; unreadCount: number }[]
        } | undefined>(['workspace-unread-counts', workspaceId], (old) => {
          if (!old) return old
          return {
            ...old,
            channels: old.channels.map((row) =>
              row.id === targetId ? { ...row, unreadCount: 0 } : row,
            ),
          }
        })
      }
    },
    onSuccess: () => {
      if (workspaceId) {
        void queryClient.invalidateQueries({
          queryKey: ['workspace-unread-counts', workspaceId],
        })
        void queryClient.invalidateQueries({
          queryKey: messageKeys.conversations(workspaceId),
          exact: false,
        })
        void queryClient.invalidateQueries({
          queryKey: messageKeys.conversationDetail(targetId),
        })
        void queryClient.invalidateQueries({
          queryKey: messageKeys.conversationsUnreadSummary(workspaceId),
        })
      }
    },
  })

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setStickyUnreadBoundaryAt(null)
      setStickyUnreadCountSnapshot(0)
      readAckTsRef.current = 0
    }, 0)

    return () => window.clearTimeout(timeoutId)
  }, [conversationId, channelId])

  useEffect(() => {
    if (!stickyUnreadBoundaryAt && unreadBoundaryAt) {
      const timeoutId = window.setTimeout(() => {
        setStickyUnreadBoundaryAt(unreadBoundaryAt)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [stickyUnreadBoundaryAt, unreadBoundaryAt])

  useEffect(() => {
    if (stickyUnreadCountSnapshot === 0 && (unreadCount ?? 0) > 0) {
      const timeoutId = window.setTimeout(() => {
        setStickyUnreadCountSnapshot(unreadCount ?? 0)
      }, 0)

      return () => window.clearTimeout(timeoutId)
    }
  }, [stickyUnreadCountSnapshot, unreadCount])

  useEffect(() => {
    const latest = messages[messages.length - 1]
    latestMessageTsRef.current = latest ? new Date(latest.createdAt).getTime() : 0
  }, [messages])

  useEffect(() => {
    const targetType = channelId ? 'channel' : conversationId ? 'conversation' : null
    const targetId = channelId ?? conversationId ?? null
    if (!targetType || !targetId || !hasServerUnread) return
    const currentLatestTs = latestMessageTsRef.current
    if (currentLatestTs <= readAckTsRef.current) return
    readAckTsRef.current = currentLatestTs
    markTargetAsRead.mutate({ targetType, targetId })
  }, [channelId, conversationId, hasServerUnread, markTargetAsRead])

  const stopJump = useCallback(() => {
    setIsJumpWindowReady(false)
    setJumpState(null)
    setIsJumping(false)
  }, [])

  // Pagination Triggering
  const handleLoadOlderMessages = useCallback(async () => {
    if (!canLoadOlder()) return

    const scroller = scrollContainerRef.current
    if (!scroller) return

    const virtualItems = virtualizer.getVirtualItems()
    const firstVisible = virtualItems.find((virtualItem) => {
      const item = listItems[virtualItem.index]
      return !!item && !!getItemKey(item)
    })

    if (firstVisible) {
      const item = listItems[firstVisible.index]
      const key = item ? getItemKey(item) : null
      anchorRef.current = key
        ? {
            key,
            expectedStart: firstVisible.start,
          }
        : null
    } else {
      anchorRef.current = null
    }

    restoreSnapshotRef.current = {
      scrollTop: scroller.scrollTop,
      scrollHeight: scroller.scrollHeight,
      clientHeight: scroller.clientHeight,
    }

    isPrependingRef.current = true
    isRestoringRef.current = true
    restorePendingRef.current = false

    try {
      const page = await fetchOlderPage()
      if (!page) {
        clearOlderLoadState()
        return
      }

      restorePendingRef.current = true
      useMessageStore.getState().prependMessages(
        targetId,
        page.messages,
        page.nextCursor,
        page.hasOlder,
      )
    } catch(e) {
      console.error(e)
      clearOlderLoadState()
    }
  }, [canLoadOlder, clearOlderLoadState, fetchOlderPage, listItems, targetId, virtualizer])

  const isFetchingNewerRef = useRef(false)
  const handleLoadNewerMessages = useCallback(async () => {
    if (!hasNewer || isLoadingNewer || isJumpingRef.current || isFetchingNewerRef.current) return
    isFetchingNewerRef.current = true
    try {
      await fetchNewer()
    } finally {
      isFetchingNewerRef.current = false
    }
  }, [fetchNewer, hasNewer, isLoadingNewer])

  // Virtual item based pagination removed, using scrollTop in handleScroll instead

  // Scroll Position Restoration (CORE FIX)
  useLayoutEffect(() => {
    if (!isPrependingRef.current || !restorePendingRef.current) return
    let frameId: number | null = null

    const finishRestore = () => {
      restorePendingRef.current = false
      clearOlderLoadState()
    }

    const settleRestore = () => {
      if (!isPrependingRef.current || !restorePendingRef.current) return

      const scroller = scrollContainerRef.current
      const snapshot = restoreSnapshotRef.current
      if (!scroller || (!anchorRef.current && !snapshot)) {
        finishRestore()
        return
      }

      if (anchorRef.current) {
        const anchorIndex = listItems.findIndex((item) => getItemKey(item) === anchorRef.current!.key)
        if (anchorIndex !== -1) {
          const offsetTuple = virtualizer.getOffsetForIndex(anchorIndex, 'start')
          if (offsetTuple) {
            const newStart = offsetTuple[0]
            const delta = newStart - anchorRef.current.expectedStart
            if (delta !== 0) {
              scroller.scrollTop += delta
              anchorRef.current.expectedStart = newStart
              frameId = window.requestAnimationFrame(settleRestore)
              return
            }

            finishRestore()
            return
          }
        }
      }

      if (snapshot) {
        const expectedScrollTop = Math.max(
          0,
          snapshot.scrollTop + (scroller.scrollHeight - snapshot.scrollHeight),
        )
        if (Math.abs(scroller.scrollTop - expectedScrollTop) > 1) {
          scroller.scrollTop = expectedScrollTop
          frameId = window.requestAnimationFrame(settleRestore)
          return
        }

        finishRestore()
        return
      }

      finishRestore()
    }

    settleRestore()
    return () => {
      if (frameId != null) {
        window.cancelAnimationFrame(frameId)
      }
    }
  }, [clearOlderLoadState, listItems, virtualizer])

  // Reset state on target change
  const [newMessageCount, setNewMessageCount] = useState(0)
  const isNearBottomRef = useRef(true)
  const isFirstRenderRef = useRef(true)
  const lastLatestMessageIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (lastTargetIdRef.current === targetId) return
    lastTargetIdRef.current = targetId
    hasRenderedTimelineRef.current = false
    setIsJumpWindowReady(false)
    setJumpState(null)
    setIsJumping(false)
    setNewMessageCount(0)
    isNearTopRef.current = false
    isNearBottomRef.current = true
    clearOlderLoadState()
    isFirstRenderRef.current = true
    lastLatestMessageIdRef.current = null
  }, [clearOlderLoadState, targetId])

  useEffect(() => {
    hasOlderRef.current = hasOlder
  }, [hasOlder])

  useEffect(() => {
    isLoadingOlderRef.current = isLoadingOlder
  }, [isLoadingOlder])

  useEffect(() => {
    isJumpingRef.current = isJumping
  }, [isJumping])

  // Handle new messages and auto-scroll
  useEffect(() => {
    const latest = messages[messages.length - 1]
    if (latest && lastLatestMessageIdRef.current && latest.id !== lastLatestMessageIdRef.current) {
      if (!isFetchingNewerRef.current && !isPrependingRef.current) {
        if (!isNearBottomRef.current) {
           setNewMessageCount(prev => prev + 1)
        } else {
           const timer = setTimeout(() => {
              virtualizer.scrollToIndex(listItems.length - 1, { align: 'end' })
           }, 10)
           return () => clearTimeout(timer)
        }
      }
    }
    lastLatestMessageIdRef.current = latest?.id || null
  }, [messages, listItems.length, virtualizer])

  const scrollToBottom = useCallback(() => {
    virtualizer.scrollToIndex(listItems.length - 1, { align: 'end' })
    setNewMessageCount(0)
  }, [listItems.length, virtualizer])

  const handleScroll = useCallback(() => {
    const scroller = scrollContainerRef.current
    if (!scroller) return

    const distanceFromTop = scroller.scrollTop
    isNearTopRef.current = distanceFromTop <= TOP_LOAD_THRESHOLD_PX

    const distanceFromBottom = scroller.scrollHeight - scroller.clientHeight - scroller.scrollTop

    if (distanceFromTop <= TOP_LOAD_THRESHOLD_PX && canLoadOlder()) {
      void handleLoadOlderMessages()
    }
    
    if (distanceFromBottom <= BOTTOM_LOAD_THRESHOLD_PX && hasNewer && !isLoadingNewer) {
      handleLoadNewerMessages()
    }

    const isNearBottom = distanceFromBottom < 100
    isNearBottomRef.current = isNearBottom
    if (isNearBottom && newMessageCount > 0) {
      setNewMessageCount(0)
    }
  }, [
    canLoadOlder,
    handleLoadOlderMessages,
    newMessageCount,
    hasNewer,
    isLoadingNewer,
    handleLoadNewerMessages
  ])

  const handleWheel = useCallback((event: { deltaY: number }) => {
    if (event.deltaY >= 0) return
    const scroller = scrollContainerRef.current
    if (!scroller) return

    isNearTopRef.current = scroller.scrollTop <= TOP_LOAD_THRESHOLD_PX
    if (!isNearTopRef.current) return
    if (!canLoadOlder()) return

    void handleLoadOlderMessages()
  }, [canLoadOlder, handleLoadOlderMessages])

  // Initial scroll positioning
  useLayoutEffect(() => {
    if (isInitialized && listItems.length > 0 && isFirstRenderRef.current) {
      isFirstRenderRef.current = false
      if (dividerIndex >= 0) {
        virtualizer.scrollToIndex(Math.max(0, dividerIndex - 1), { align: 'start' })
      } else {
        virtualizer.scrollToIndex(listItems.length - 1, { align: 'end' })
      }
    }
  }, [isInitialized, listItems.length, dividerIndex, virtualizer])

  // Jump logic
  useEffect(() => {
    if (!jumpState || jumpState.phase !== 'loading-window') return
    if (!isJumpWindowReady) return
    if (!isInitialized || listItems.length === 0) return

    if (jumpState.mode === 'beginning' || jumpState.mode === 'recent') {
      queueMicrotask(() => {
        setJumpState({
          ...jumpState,
          phase: 'ready-to-scroll',
        })
      })
      return
    }

    if (jumpState.mode === 'date') {
      const anchorIndex = findDateAnchorIndex(listItems, jumpState.targetDate)
      if (anchorIndex === -1) {
        toast.error('Không thể xác định vị trí của ngày đã chọn')
        queueMicrotask(() => {
          stopJump()
        })
        return
      }
    }

    queueMicrotask(() => {
      setJumpState({
        ...jumpState,
        phase: 'expanding-older',
      })
    })
  }, [isInitialized, isJumpWindowReady, jumpState, listItems, stopJump])

  useEffect(() => {
    if (!jumpState || jumpState.phase !== 'expanding-older') return
    if (listItems.length === 0) return
    
    // With current API, fetchOlder from jump doesn't exist, we rely on jumpToDate loading everything needed
    queueMicrotask(() => {
      setJumpState((currentState) =>
        currentState
          ? {
              ...currentState,
              phase: 'ready-to-scroll',
            }
          : currentState,
      )
    })
  }, [jumpState, listItems])

  useEffect(() => {
    if (!jumpState || jumpState.phase !== 'ready-to-scroll') return
    if (listItems.length === 0) return

    const targetIndex =
      jumpState.mode === 'beginning'
        ? 0
        : jumpState.mode === 'recent'
          ? Math.max(0, listItems.length - 1)
        : findDateAnchorIndex(listItems, jumpState.targetDate)

    if (targetIndex < 0) {
      toast.error('Không thể xác định vị trí của ngày đã chọn')
      queueMicrotask(() => {
        stopJump()
      })
      return
    }

    const frame = window.requestAnimationFrame(() => {
      virtualizer.scrollToIndex(targetIndex, { align: 'start' })
      stopJump()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [jumpState, listItems, stopJump, virtualizer])

  const handleJumpToDateAction = useCallback(async (date: Date) => {
    const targetDate = startOfDay(date)
    setIsJumping(true)
    setIsJumpWindowReady(false)
    setJumpState({
      mode: 'date',
      targetDate,
      phase: 'loading-window',
    })

    const success = await jumpToDate(targetDate)
    if (!success) {
      stopJump()
      return
    }
    setIsJumpWindowReady(true)
  }, [jumpToDate, stopJump])

  const handleJumpToBeginningAction = useCallback(async () => {
    if (!createdAt) return

    const targetDate = startOfDay(new Date(createdAt))
    setIsJumping(true)
    setIsJumpWindowReady(false)
    setJumpState({
      mode: 'beginning',
      targetDate,
      phase: 'loading-window',
    })

    const success = await jumpToBeginning(createdAt)
    if (!success) {
      stopJump()
      return
    }
    setIsJumpWindowReady(true)
  }, [createdAt, jumpToBeginning, stopJump])

  const handleJumpToMostRecentAction = useCallback(async () => {
    setIsJumping(true)
    setIsJumpWindowReady(false)
    setJumpState({
      mode: 'recent',
      targetDate: new Date(),
      phase: 'loading-window',
    })

    const success = await jumpToMostRecent()
    if (!success) {
      stopJump()
      return
    }
    setIsJumpWindowReady(true)
  }, [jumpToMostRecent, stopJump])

  // Focus message
  useEffect(() => {
    if (focusedMessageId && listItems.length > 0) {
      const index = listItems.findIndex(item => item.type === 'message' && item.message.id === focusedMessageId)
      if (index !== -1) {
        const startTimer = window.setTimeout(() => {
          setInternalFocusedId(focusedMessageId)
          setIsJumping(true)
          virtualizer.scrollToIndex(index, { align: 'center' })
        }, 0)
        const timer = window.setTimeout(() => {
          setInternalFocusedId(null)
          setIsJumping(false)
        }, 1500)
        return () => {
          window.clearTimeout(startTimer)
          window.clearTimeout(timer)
        }
      }
    }
  }, [focusedMessageId, listItems, virtualizer])

  const handleReact = useCallback(
    (messageId: string, emoji: string) => addReaction({ messageId, emoji, userId: currentUserId }),
    [addReaction, currentUserId],
  )

  const handleReply = useCallback(
    (message: Message, highlightedMessageId?: string) => openThread(message, highlightedMessageId),
    [openThread],
  )

  const handleJoinHuddle = useCallback(
    (message: Message) => {
      if (onJoinHuddle) {
        onJoinHuddle(message)
        return
      }
      const targetEntityType = channelId ? 'channel' : 'dm'
      const targetEntityId = channelId || conversationId
      if (!targetEntityId) return
      const huddleLabel =
        (message.huddleSnapshot as { entityLabel?: string | null } | null)
          ?.entityLabel?.trim() ||
        message.channelName ||
        'Huddle'

      openHuddlePreviewWindow({
        workspaceId,
        entityType: targetEntityType,
        entityId: targetEntityId,
        label: huddleLabel,
        mode: 'join',
      })
    },
    [channelId, conversationId, onJoinHuddle, workspaceId],
  )

  const shouldShowInitialSkeleton =
    !hasRenderedTimelineRef.current &&
    !isInitialized &&
    messages.length === 0

  if (shouldShowInitialSkeleton) return <MessageSkeleton />

  if (listItems.length === 0) return <ChannelWelcome workspaceId={workspaceId} />

  return (
    <div className="flex-1 overflow-hidden flex flex-col relative">
      {isLoadingOlder && (
        <div className="pointer-events-none absolute left-0 right-0 top-0 z-10 flex h-8 items-center justify-center" aria-live="polite">
          <span className="text-[12px] text-[#797c81] animate-pulse">{t("loadingOlderMessages")}</span>
        </div>
      )}

      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        onWheel={handleWheel}
        className="flex-1 overflow-y-auto outline-none"
        style={{ overflowAnchor: 'none' }}
      >
        <div style={{ height: virtualizer.getTotalSize(), position: 'relative', width: '100%' }}>
          {virtualizer.getVirtualItems().map((virtualRow) => {
            const item = listItems[virtualRow.index]

            let content;
            if (item.type === 'welcome') {
              content = (
                <ChannelWelcome
                  channelName={item.channelName}
                  members={item.members}
                  isGroup={item.isGroup}
                  createdAt={item.createdAt}
                  workspaceId={item.workspaceId}
                />
              )
            } else if (item.type === 'date') {
              content = (
                <DateSeparator
                  date={item.date}
                  onJump={handleJumpToDateAction}
                  onJumpToMostRecent={handleJumpToMostRecentAction}
                  onJumpToBeginning={handleJumpToBeginningAction}
                  onOpenJumpDialog={() => setOpenJumpToSpecificDateDialog(true)}
                  createdAt={createdAt}
                />
              )
            } else if (item.type === 'new-divider') {
              content = <NewDivider />
            } else {
              content = (
                <MessageItem
                  messageId={item.message.id}
                  message={item.message}
                  currentUserId={currentUserId}
                  workspaceId={workspaceId}
                  isCompact={item.isCompact}
                  isHovered={hoveredMessageId === item.message.id || emojiPickerMessageId === item.message.id}
                  onHoverChange={(id, hovered) => setHoveredMessageId(hovered ? id : null)}
                  emojiPickerOpen={emojiPickerMessageId === item.message.id}
                  onEmojiPickerOpenChange={(id, open) => setEmojiPickerMessageId(open ? id : null)}
                  onReact={handleReact}
                  onPin={(id) => togglePin(id)}
                  onEdit={onEditMessage}
                  onDelete={onDeleteMessage}
                  onReply={handleReply}
                  onJoinHuddle={handleJoinHuddle}
                  onSaveForLater={handleSaveForLater}
                  isSavedForLater={savedMessageIdSet.has(item.message.id)}
                  savedLaterRemindAtIso={remindAtByMessageId.get(item.message.id)}
                  isInsideThreadPanel={false}
                  isFocused={focusedMessageId === item.message.id}
                  isTemporaryHighlight={internalFocusedId === item.message.id}
                  onFocus={(id) => !id && setFocusedMessageId(null)}
                  fromPublicChannel={fromPublicChannel}
                  isMember={isMember}
                  canReplyInThread={
                    !channelPostingSettings
                      ? true
                      : channelPostingSettings.allowThreads ||
                        channelPostingSettings.mode === 'everyone'
                  }
                />
              )
            }

            return (
              <div
                key={virtualRow.key}
                data-index={virtualRow.index}
                ref={virtualizer.measureElement}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
              >
                {content}
              </div>
            )
          })}
        </div>
      </div>

      {isLoadingNewer && (
        <div className="pointer-events-none absolute left-0 right-0 bottom-0 z-10 flex h-8 items-center justify-center" aria-live="polite">
          <span className="text-[12px] text-[#797c81] animate-pulse">{t("loadingNewerMessages")}</span>
        </div>
      )}

      {newMessageCount > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
           <button
             onClick={scrollToBottom}
             className="px-4 py-1.5 bg-[#1d9bd1] text-white rounded-full text-[13px] font-bold shadow-lg flex items-center gap-1.5 hover:bg-[#1A8BBF] transition"
           >
             {t("newMessage", { count: newMessageCount })}
             <IoChevronDownOutline size={14} />
           </button>
        </div>
      )}

      <JumpToSpecificDateDialog
        open={openJumpToSpecificDateDialog}
        onOpenChange={setOpenJumpToSpecificDateDialog}
        onJump={handleJumpToDateAction}
        targetCreatedAt={createdAt}
      />
    </div>
  )
}
