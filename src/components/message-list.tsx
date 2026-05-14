'use client'

import MessageItem from '@/components/message-item'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from '@/components/ui/skeleton'
import { useAddReaction, useToggleLaterMessage, useTogglePin } from '@/hooks/use-messages'
import { useChannelMessages } from '@/hooks/use-channel-messages'
import { useLaterSavedMessageIds } from '@/hooks/use-saved-items'
import { usePrefetchPdfAttachments } from '@/hooks/use-prefetch-pdf-attachments'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useMessageFocusStore } from '@/stores/useMessageFocusStore'
import type { Message, User } from '@/lib/types'
import { format, isSameDay, isThisYear, isToday, isYesterday, startOfDay, subDays, subWeeks, subMonths } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IoChevronDownOutline } from "react-icons/io5"
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'
import JumpToSpecificDateDialog from './dialogs/jump-to-specific-date-dialog'

interface MessageListProps {
  channelId?: string
  conversationId?: string
  currentUserId: string
  workspaceId: string
  isConnected: boolean
  onEditMessage?: (message: Message) => void
  onDeleteMessage?: (messageId: string) => void
  onSaveForLater?: (messageId: string) => void
  fromPublicChannel?: boolean
  isMember?: boolean
}

type ListItem =
  | { type: 'message'; message: Message; isCompact: boolean }
  | { type: 'date'; date: Date }
  | { type: 'welcome'; conversationId?: string; members?: any[]; isGroup?: boolean; createdAt?: string }

const getItemKey = (item: ListItem) => {
  if (!item) return null
  if (item.type === 'message') return item.message.id
  if (item.type === 'date') return `date-${item.date.getTime()}`
  if (item.type === 'welcome') return 'welcome'
  return null
}

function DateSeparator({ date, onJump, onOpenJumpDialog, onJumpToBeginning, createdAt }: { date: Date, onJump: (date: Date) => void, onOpenJumpDialog: () => void, onJumpToBeginning: () => void, createdAt?: string }) {
  const [open, setOpen] = useState(false)

  let label: string
  if (isToday(date)) label = 'Today'
  else if (isYesterday(date)) label = 'Yesterday'
  else if (isThisYear(date)) label = format(date, 'MMMM do', { locale: enUS })
  else label = format(date, 'MMMM do, yyyy', { locale: enUS })

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
              <span className="mx-4 text-[12px] text-[#8e9297]">Jump to...</span>
              <div onClick={() => { setOpen(false); onJump(new Date()) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Today</div>
              <div onClick={() => { setOpen(false); onJump(subDays(new Date(), 1)) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Yesterday</div>
              <div onClick={() => { setOpen(false); onJump(subWeeks(new Date(), 1)) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Last week</div>
              <div onClick={() => { setOpen(false); onJump(subMonths(new Date(), 1)) }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Last month</div>
              {createdAt && <div onClick={() => { setOpen(false); onJumpToBeginning() }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">The very beginning</div>}
              <Separator className="my-2" />
              <div onClick={() => { setOpen(false); onOpenJumpDialog() }} className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Jump to a specific date</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
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

function ChannelWelcome({ channelId, conversationId, members, isGroup, createdAt, workspaceId }: {
  channelId?: string
  conversationId?: string
  members?: any[]
  isGroup?: boolean
  createdAt?: string
  workspaceId?: string
}) {
  if (members?.length) {
    const DMIntro = require("@/modules/direct-messages/dm-intro").default
    return <DMIntro members={members} isGroup={isGroup} createdAt={createdAt} workspaceId={workspaceId} />
  }
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="text-center text-[#797c81]">
        <div className="text-4xl mb-3">#</div>
        <h3 className="text-xl font-bold mb-1">Đây là đầu kênh</h3>
        <p className="text-sm">Đây là khởi đầu của kênh này. Hãy gửi tin nhắn đầu tiên!</p>
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

function buildListItemsFromMessages(messages: Message[]): ListItem[] {
  const items: ListItem[] = []
  let lastDate: Date | null = null

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i]
    const msgDate = new Date(msg.createdAt)

    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      items.push({ type: 'date', date: startOfDay(msgDate) })
      lastDate = startOfDay(msgDate)
    }

    const prevMsg = i > 0 ? messages[i - 1] : null
    items.push({ type: 'message', message: msg, isCompact: prevMsg ? shouldCompact(prevMsg, msg) : false })
  }

  return items
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
  members,
  isGroup,
  createdAt,
  fromPublicChannel,
  isMember,
}: MessageListProps & { members?: User[]; isGroup?: boolean; createdAt?: string }) {
  const [openJumpToSpecificDateDialog, setOpenJumpToSpecificDateDialog] = useState(false)

  const virtuosoRef = useRef<VirtuosoHandle>(null)
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
    fetchOlder,
    fetchNewer,
    jumpToDate,
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

  const { mutate: addReaction } = useAddReaction(targetId)
  const { mutate: togglePin } = useTogglePin(targetId)
  const openThread = useThreadPanelStore((s) => s.open)

  // Anchoring state
  const lastTargetIdRef = useRef(targetId)
  const prevFirstKeyRef = useRef<string | null>(null)
  const firstItemIndexRef = useRef(10000)

  // Jump tracking
  const jumpTargetRef = useRef<{ date: Date, align: 'center' | 'end' } | null>(null)

  if (lastTargetIdRef.current !== targetId) {
    lastTargetIdRef.current = targetId
    firstItemIndexRef.current = 10000
    prevFirstKeyRef.current = null
  }

  const { listItems, firstItemIndex } = useMemo(() => {
    if (!isInitialized && messages.length === 0) {
      return { listItems: [], firstItemIndex: firstItemIndexRef.current }
    }

    const items = buildListItemsFromMessages(messages)
    if (!hasOlder && isInitialized) {
      items.unshift({ type: 'welcome' as const, conversationId, members, isGroup, createdAt })
    }

    const currentFirstKey = getItemKey(items[0])
    let newFirstItemIndex = firstItemIndexRef.current

    if (!prevFirstKeyRef.current) {
      newFirstItemIndex = 10000
    } else if (prevFirstKeyRef.current !== currentFirstKey) {
      const anchorIndex = items.findIndex(item => getItemKey(item) === prevFirstKeyRef.current)
      
      if (anchorIndex > 0) {
        newFirstItemIndex = firstItemIndexRef.current - anchorIndex
        firstItemIndexRef.current = newFirstItemIndex
      }
    }

    prevFirstKeyRef.current = currentFirstKey
    return { listItems: items, firstItemIndex: newFirstItemIndex }
  }, [messages, isInitialized, hasOlder, conversationId, members, isGroup, createdAt])

  usePrefetchPdfAttachments([{ messages, nextCursor: null, hasMore: false }])

  const initialTopMostItemIndex = listItems.length > 0 ? listItems.length - 1 : 0

  // Effect to handle scrolling after Jump or Focus
  useEffect(() => {
    if (jumpTargetRef.current && isInitialized && listItems.length > 0) {
      const { align } = jumpTargetRef.current
      jumpTargetRef.current = null
      
      const index = align === 'end' ? listItems.length - 1 : 0
      
      // Give a tiny bit of time for Virtuoso to register the new data
      setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index, align })
        setTimeout(() => setIsJumping(false), 500)
      }, 50)
    }
  }, [messages, isInitialized, listItems.length])

  const handleJumpToDateAction = useCallback(async (date: Date) => {
    setIsJumping(true)
    const success = await jumpToDate(date)
    if (success) {
      prevFirstKeyRef.current = null
      firstItemIndexRef.current = 10000
      jumpTargetRef.current = { 
        date, 
        align: isToday(date) ? 'end' : 'center' 
      }
    } else {
      setIsJumping(false)
    }
  }, [jumpToDate])

  const handleJumpToBeginningAction = useCallback(async () => {
    if (createdAt) {
      await handleJumpToDateAction(new Date(createdAt))
    }
  }, [createdAt, handleJumpToDateAction])

  useEffect(() => {
    if (focusedMessageId && listItems.length > 0) {
      const index = listItems.findIndex(item => item.type === 'message' && item.message.id === focusedMessageId)
      if (index !== -1) {
        setInternalFocusedId(focusedMessageId)
        setIsJumping(true)
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({ index, align: 'center' })
        }, 500)
        const timer = setTimeout(() => {
          setInternalFocusedId(null)
          setIsJumping(false)
        }, 1500)
        return () => clearTimeout(timer)
      }
    }
  }, [focusedMessageId, listItems, firstItemIndex])

  const handleReact = useCallback(
    (messageId: string, emoji: string) => addReaction({ messageId, emoji, userId: currentUserId }),
    [addReaction, currentUserId],
  )

  const handleReply = useCallback(
    (message: Message, highlightedMessageId?: string) => openThread(message, highlightedMessageId),
    [openThread],
  )

  const stableComponents = useMemo(
    () => ({
      Header: () => <div className="h-8" />,
      Footer: () => <div className="h-8" />,
    }),
    [],
  )

  if (!isInitialized && messages.length === 0) return <MessageSkeleton />

  if (listItems.length === 0) return <ChannelWelcome channelId={targetId} />

  return (
    <div className="flex-1 overflow-hidden flex flex-col">
      <div className="h-8 flex items-center justify-center shrink-0">
        {isLoadingOlder && (
          <span className="text-[12px] text-[#797c81] animate-pulse">Loading older messages...</span>
        )}
      </div>

      <Virtuoso
        ref={virtuosoRef}
        data={listItems}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={initialTopMostItemIndex}
        components={stableComponents}
        alignToBottom={!isJumping && !hasNewer}
        followOutput={(!isJumping && !hasNewer) ? (isAtBottom) => isAtBottom : false}
        atTopThreshold={40}
        atBottomThreshold={40}
        increaseViewportBy={{ top: 300, bottom: 300 }}
        atTopStateChange={(atTop) => {
          if (atTop && hasOlder && !isLoadingOlder && !isJumping) {
            fetchOlder()
          }
        }}
        atBottomStateChange={(atBottom) => {
          if (atBottom && hasNewer && !isLoadingNewer && !isJumping) {
            fetchNewer()
          }
        }}
        style={{ flex: 1, overflowAnchor: 'none' }}
        computeItemKey={(_, item) => getItemKey(item) || 'unknown'}
        itemContent={(_, item) => {
          if (item.type === 'welcome') {
            return (
              <ChannelWelcome
                channelId={channelId}
                conversationId={item.conversationId}
                members={item.members}
                isGroup={item.isGroup}
                createdAt={item.createdAt}
              />
            )
          }
          if (item.type === 'date') {
            return (
              <DateSeparator
                date={item.date}
                onJump={handleJumpToDateAction}
                onJumpToBeginning={handleJumpToBeginningAction}
                onOpenJumpDialog={() => setOpenJumpToSpecificDateDialog(true)}
                createdAt={createdAt}
              />
            )
          }
          return (
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
              onSaveForLater={handleSaveForLater}
              isSavedForLater={savedMessageIdSet.has(item.message.id)}
              savedLaterRemindAtIso={remindAtByMessageId.get(item.message.id)}
              isInsideThreadPanel={false}
              isFocused={focusedMessageId === item.message.id}
              isTemporaryHighlight={internalFocusedId === item.message.id}
              onFocus={(id) => !id && setFocusedMessageId(null)}
              fromPublicChannel={fromPublicChannel}
              isMember={isMember}
            />
          )
        }}
      />

      <div className="h-8 flex items-center justify-center shrink-0">
        {isLoadingNewer && (
          <span className="text-[12px] text-[#797c81] animate-pulse">Loading newer messages...</span>
        )}
      </div>

      <JumpToSpecificDateDialog
        open={openJumpToSpecificDateDialog}
        onOpenChange={setOpenJumpToSpecificDateDialog}
        onJump={handleJumpToDateAction}
        targetCreatedAt={createdAt}
      />
    </div>
  )
}
