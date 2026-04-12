'use client'

import MessageItem from '@/components/message-item'
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from '@/components/ui/skeleton'
import { useAddReaction, useMessages } from '@/hooks/use-messages'
import { usePrefetchPdfAttachments } from '@/hooks/use-prefetch-pdf-attachments'
import type { Message } from '@/lib/types'
import { format, isSameDay, isThisYear, isToday, isYesterday } from 'date-fns'
import { enUS } from 'date-fns/locale'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IoChevronDownOutline } from "react-icons/io5"
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso'

interface MessageListProps {
  channelId: string
  currentUserId: string
  workspaceId: string
  isConnected: boolean
  onEditMessage?: (message: Message) => void
  onDeleteMessage?: (messageId: string) => void
  onReplyMessage?: (message: Message) => void
}

function DateSeparator({ date }: { date: Date }) {
  let label: string
  if (isToday(date)) label = 'Today'
  else if (isYesterday(date)) label = 'Yesterday'
  else if (isThisYear(date)) label = format(date, 'EEEE, MMMM d, yyyy', { locale: enUS })
  else label = format(date, 'EEEE, MMMM d, yyyy', { locale: enUS })

  return (
    <div className="flex items-center gap-3 px-4 py-3 my-2 ">
      <div className="w-full h-[0.5px] bg-[#DDDDDD] dark:bg-[#35373B] relative">
        <Popover>
          <PopoverTrigger asChild>
            <button className="flex items-center gap-2 cursor-pointer absolute right-[50%] translate-x-1/2 bottom-[50%] translate-y-1/2 px-4 py-1 rounded-full bg-white dark:bg-[#1A1D21] border border-[#797c814d] text-[13px] font-bold">{label}
              <IoChevronDownOutline size={10} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            withOverlay
          >
            <div className="flex flex-col py-2">
              <span className="mx-4 text-[12px] text-[#8e9297]">Jump to...</span>
              <div className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Today</div>
              <div className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Yesterday</div>
              <div className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Last week</div>
              <div className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">Last month</div>
              <div className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm">The very beginning</div>

              <Separator className="my-2" />

              <div className="px-4 py-1 hover:bg-selection-hover cursor-pointer text-sm">Jump to a specific date</div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}

/** Skeleton khi đang load lần đầu */
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
            <Skeleton className={`h-4 bg-[#2a2d31]`} style={{ width: `${40 + i * 12}%` }} />
            {i % 3 === 0 && <Skeleton className="h-4 w-2/3 bg-[#2a2d31]" />}
          </div>
        </div>
      ))}
    </div>
  )
}

/** Header chào mừng khi đã load hết messages (đầu lịch sử) */
function ChannelWelcome({ channelId }: { channelId: string }) {
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="text-center text-[#797c81]">
        <div className="text-4xl mb-3">#</div>
        <h3 className="text-xl font-bold mb-1">
          Đây là đầu kênh
        </h3>
        <p className="text-sm">
          Đây là khởi đầu của kênh này. Hãy gửi tin nhắn đầu tiên!
        </p>
      </div>
    </div>
  )
}

function shouldCompact(prev: Message, curr: Message): boolean {
  if (prev.user.id !== curr.user.id) return false
  const prevTime = new Date(prev.createdAt).getTime()
  const currTime = new Date(curr.createdAt).getTime()
  return currTime - prevTime < 5 * 60 * 1000 // 5 phút
}

type ListItem =
  | { type: 'message'; message: Message; isCompact: boolean }
  | { type: 'date'; date: Date }
  | { type: 'welcome' }

function buildListItems(pages: { messages: Message[] }[]): ListItem[] {
  // Flatten tất cả messages, cũ nhất trước (bỏ tin `system` — carrier upload vào folder)
  const allMessages = pages
    .flatMap((p) => p.messages)
    .reverse() // pages[0] = mới → reverse để cũ lên trên
    .filter((m) => m.type !== 'system')

  const items: ListItem[] = []
  let lastDate: Date | null = null

  for (let i = 0; i < allMessages.length; i++) {
    const msg = allMessages[i]
    const msgDate = new Date(msg.createdAt)

    // Thêm date separator khi sang ngày mới
    if (!lastDate || !isSameDay(lastDate, msgDate)) {
      items.push({ type: 'date', date: msgDate })
      lastDate = msgDate
    }

    const prevMsg = i > 0 ? allMessages[i - 1] : null
    const isCompact = prevMsg ? shouldCompact(prevMsg, msg) : false

    items.push({ type: 'message', message: msg, isCompact })
  }

  return items
}

export default function MessageList({
  channelId,
  currentUserId,
  workspaceId,
  isConnected,
  onEditMessage,
  onDeleteMessage,
  onReplyMessage,
}: MessageListProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(
    null,
  )
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(channelId, isConnected)

  const { mutate: addReaction } = useAddReaction(channelId)

  usePrefetchPdfAttachments(data?.pages)

  /** Flatten pages → list items có date separators */
  const listItems = useMemo<ListItem[]>(() => {
    if (!data?.pages.length) return []

    const items = buildListItems(data.pages)
    // Thêm welcome ở đầu nếu đã load hết
    if (!hasNextPage) {
      items.unshift({ type: 'welcome' })
    }
    return items
  }, [data, hasNextPage])

  /** firstItemIndex — giữ scroll position khi prepend (load tin nhắn cũ hơn) */
  const prevLengthRef = useRef<number | null>(null)
  const prevPagesRef = useRef<number | null>(null)
  const [firstItemIndex, setFirstItemIndex] = useState(10000)

  useEffect(() => {
    const currTotal = listItems.length
    const currPages = data?.pages.length || 0

    const prevTotal = prevLengthRef.current
    const prevPages = prevPagesRef.current

    // Cập nhật firstItemIndex CHỈ khi load thêm trang mới (prepend)
    if (prevPages !== null && currPages > prevPages && prevTotal !== null) {
      const diff = currTotal - prevTotal
      setFirstItemIndex((f) => f - diff)
    }

    prevLengthRef.current = currTotal
    prevPagesRef.current = currPages
  }, [listItems.length, data?.pages.length])

  /** Index cho initial scroll to bottom — dùng tọa độ của Virtuoso (firstItemIndex + len - 1) */
  const initialTopMostItemIndex = useMemo(() => {
    return firstItemIndex + listItems.length - 1
  }, [firstItemIndex, listItems.length])

  /** Callback khi scroll lên đầu → load thêm messages cũ */
  const handleStartReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleReact = useCallback(
    (messageId: string, emoji: string) => {
      addReaction({ messageId, emoji, userId: currentUserId })
    },
    [addReaction, currentUserId],
  )

  /** Header loader — nằm trong Virtuoso để tránh làm list nhảy khi xuất hiện/biến mất */
  const components = useMemo(
    () => ({
      Header: () =>
        isFetchingNextPage ? (
          <div className="flex justify-center py-2">
            <div className="text-[12px] text-[#797c81] animate-pulse">
              Loading...
            </div>
          </div>
        ) : (
          <div className="h-4" />
        ),
    }),
    [isFetchingNextPage],
  )

  if (isLoading) {
    return <MessageSkeleton />
  }

  if (listItems.length === 0) {
    return <ChannelWelcome channelId={channelId} />
  }

  return (
    <div className="flex-1 overflow-hidden">
      <Virtuoso
        ref={virtuosoRef}
        data={listItems}
        firstItemIndex={firstItemIndex}
        initialTopMostItemIndex={initialTopMostItemIndex}
        components={components}
        alignToBottom={true}
        // increaseViewportBy={{ top: 1000, bottom: 400 }}
        followOutput={(isAtBottom) => (isAtBottom ? 'smooth' : false)}
        atTopThreshold={200}
        startReached={handleStartReached}
        style={{ height: '100%' }}
        computeItemKey={(_, item) =>
          item.type === 'message'
            ? item.message.id
            : item.type === 'date'
              ? `date-${item.date.getTime()}`
              : 'welcome'
        }
        itemContent={(_, item) => {
          if (item.type === 'welcome') {
            return <ChannelWelcome channelId={channelId} />
          }

          if (item.type === 'date') {
            return <DateSeparator date={item.date} />
          }

          return (
            <MessageItem
              message={item.message}
              currentUserId={currentUserId}
              workspaceId={workspaceId}
              isCompact={item.isCompact}
              isHovered={
                hoveredMessageId === item.message.id ||
                emojiPickerMessageId === item.message.id
              }
              onHoverChange={(id, hovered) =>
                setHoveredMessageId(hovered ? id : null)
              }
              emojiPickerOpen={emojiPickerMessageId === item.message.id}
              onEmojiPickerOpenChange={(id, open) =>
                setEmojiPickerMessageId(open ? id : null)
              }
              onReact={handleReact}
              onEdit={onEditMessage}
              onDelete={onDeleteMessage}
              onReply={onReplyMessage}
            />
          )
        }}
      />
    </div>
  )
}
