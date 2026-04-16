'use client'

import React, { useCallback, useMemo, useState } from 'react'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { IoCloseOutline } from 'react-icons/io5'
import MessageItem from '@/components/message-item'
import { useAddReaction, useSendMessage, useThreadMessages, useUpdateMessage, useDeleteMessage } from '@/hooks/use-messages'
import { useUserStore } from '@/stores/useUserStore'
import { useSocket, useThreadSocket } from '@/hooks/use-socket'
import Editor, { type PendingFile } from '@/components/editor'
import { Checkbox } from '@/components/ui/checkbox'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useParams } from 'next/navigation'
import { Virtuoso } from 'react-virtuoso'
import type { Message, MessageAttachment } from '@/lib/types'
import { useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/axios'
import { messageKeys } from '@/lib/query-keys'
import { toast } from 'sonner'

const PLACEHOLDER_CONTENT = '<p>📎 Đang tải file...</p>'

export default function ThreadPanel({ workspaceId }: { workspaceId: string }) {
  const params = useParams()
  const workspaceSlug = params?.workspaceSlug as string
  const {
    message: parentMessage,
    close,
    updateMessage,
    highlightedMessageId,
    setHighlightedMessageId
  } = useThreadPanelStore()
  const virtuosoRef = React.useRef<any>(null)
  const currentUser = useUserStore((s) => s.user)
  const { isChannelChatConnected } = useSocket()
  const queryClient = useQueryClient()
  const { uploadFile, clearUploadingFiles, uploadingFiles } = useFileUpload()

  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(
    null,
  )

  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage
  } = useThreadMessages(parentMessage?.id || '', isChannelChatConnected)

  /**
   * Sync parent message realtime (edits, reactions)
   * useThreadSocket lắng nghe events của room `thread:${parentId}`
   */
  useThreadSocket(parentMessage?.id || '', isChannelChatConnected, {
    onMessageUpdated: (data) => {
      const updated = data as Partial<Message> & { id: string }
      if (updated.id === parentMessage?.id) {
        updateMessage(updated)
      }
    },
    onReactionUpdate: (data) => {
      const payload = data as { messageId: string; action: string; emoji: string; userId: string }
      if (payload.messageId !== parentMessage?.id) return

      const existing = parentMessage.reactions.find((r) => r.emoji === payload.emoji)
      let newReactions = parentMessage.reactions
      if (payload.action === 'added') {
        if (existing) {
          newReactions = parentMessage.reactions.map((r) =>
            r.emoji === payload.emoji
              ? { ...r, count: r.count + 1, userIds: [...r.userIds, payload.userId] }
              : r,
          )
        } else {
          newReactions = [...parentMessage.reactions, { emoji: payload.emoji, count: 1, userIds: [payload.userId] }]
        }
      } else {
        newReactions = parentMessage.reactions
          .map((r) =>
            r.emoji === payload.emoji
              ? { ...r, count: r.count - 1, userIds: r.userIds.filter((id) => id !== payload.userId) }
              : r,
          )
          .filter((r) => r.count > 0)
      }
      updateMessage({ id: parentMessage.id, reactions: newReactions })
    },
  })

  const currentUserForMutation = useMemo(() => currentUser ? {
    id: currentUser.id,
    name: currentUser.name ?? null,
    email: currentUser.email,
    avatar: currentUser.avatar ?? null,
  } : null, [currentUser])

  const { mutate: sendMessage, isPending: isSending } = useSendMessage(
    parentMessage?.channelId || '',
    currentUserForMutation
  )

  const { mutate: addReaction } = useAddReaction(parentMessage?.channelId || '')
  const { mutate: updateMessageAction } = useUpdateMessage(parentMessage?.channelId || '')
  const { mutate: deleteMessageAction } = useDeleteMessage(parentMessage?.channelId || '')

  const replies = useMemo(() => {
    if (!data?.pages) return []
    return [...data.pages.flatMap(p => p.messages)].reverse()
  }, [data])

  /** Effect: Tự động cuộn đến tin nhắn được highlight khi danh sách đã tải xong */
  React.useEffect(() => {
    if (highlightedMessageId && replies.length > 0) {
      const index = replies.findIndex(r => r.id === highlightedMessageId)
      if (index !== -1) {
        // Cần delay lâu hơn một chút (500ms) để container ổn định
        setTimeout(() => {
          virtuosoRef.current?.scrollToIndex({
            index,
            align: 'center'
          })
        }, 500)
      }
    }
  }, [highlightedMessageId, replies.length]) // Cực kỳ quan trọng: trigger khi replies được load xong

  const handleFileAttach = useCallback((files: File[]) => {
    const newItems: PendingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
    }))
    setPendingFiles((prev) => [...prev, ...newItems])
  }, [])

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const addAttachmentToCache = useCallback(
    (messageId: string, attachment: MessageAttachment) => {
      if (!parentMessage) return

      // 1. Cập nhật Thread cache
      queryClient.setQueryData(
        ['thread-messages', parentMessage.id],
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old?.pages.length) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? { ...m, attachments: [...(m.attachments || []), attachment] }
                  : m,
              ),
            })),
          }
        },
      )

      // 2. Nếu message này "alsoSendToChannel", cập nhật thêm ở Channel cache
      queryClient.setQueryData(
        messageKeys.list(parentMessage.channelId),
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old?.pages.length) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? { ...m, attachments: [...(m.attachments || []), attachment] }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [queryClient, parentMessage?.id, parentMessage?.channelId],
  )

  const updateMessageContent = useCallback(
    async (messageId: string, content: string, alsoSendToChannel: boolean) => {
      if (!parentMessage) return

      try {
        const { data } = await apiClient.patch<Message>(
          `/messages/${messageId}`,
          { content },
        )

        // Cập nhật Thread cache
        queryClient.setQueryData(
          ['thread-messages', parentMessage.id],
          (old: { pages: { messages: Message[] }[] } | undefined) => {
            if (!old?.pages.length) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === messageId ? { ...m, content: data.content } : m,
                ),
              })),
            }
          },
        )

        // Cập nhật Channel cache nếu cần
        if (alsoSendToChannel) {
          queryClient.setQueryData(
            messageKeys.list(parentMessage.channelId),
            (old: { pages: { messages: Message[] }[] } | undefined) => {
              if (!old?.pages.length) return old
              return {
                ...old,
                pages: old.pages.map((page) => ({
                  ...page,
                  messages: page.messages.map((m) =>
                    m.id === messageId ? { ...m, content: data.content } : m,
                  ),
                })),
              }
            },
          )
        }
      } catch (err) {
        console.error('Failed to update placeholder content:', err)
      }
    },
    [queryClient, parentMessage?.id, parentMessage?.channelId],
  )

  const handleSubmit = useCallback(async (content: string) => {
    if (!parentMessage) return

    const hasContent = content.trim() !== '' && content.trim() !== '<p></p>'
    const hasFiles = pendingFiles.length > 0

    if (!hasContent && !hasFiles) return

    const contentToSend = hasContent ? content : PLACEHOLDER_CONTENT
    const filesToUpload = [...pendingFiles]
    const shouldAlsoSendToChannel = alsoSendToChannel

    setPendingFiles([])

    sendMessage(
      {
        content: contentToSend,
        parentId: parentMessage.id,
        alsoSendToChannel: shouldAlsoSendToChannel,
      },
      {
        onSuccess: async (newMessage) => {
          if (filesToUpload.length === 0) {
            setAlsoSendToChannel(false)
            return
          }

          let successCount = 0
          for (const { file } of filesToUpload) {
            try {
              const attachment = await uploadFile(file, newMessage.id)
              addAttachmentToCache(newMessage.id, attachment)
              successCount++
              toast.success(`Đã tải lên: ${file.name}`)
            } catch (error) {
              toast.error(
                `Lỗi khi tải ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
              )
            }
          }

          clearUploadingFiles()
          setAlsoSendToChannel(false)

          // Xóa placeholder if needed
          if (!hasContent) {
            if (successCount > 0) {
              await updateMessageContent(newMessage.id, '<p></p>', shouldAlsoSendToChannel)
            } else {
              await updateMessageContent(
                newMessage.id,
                '<p>⚠️ Tải file thất bại</p>',
                shouldAlsoSendToChannel
              )
            }
          }
        },
      }
    )
  }, [parentMessage, sendMessage, alsoSendToChannel, pendingFiles, uploadFile, addAttachmentToCache, updateMessageContent, clearUploadingFiles])

  const components = useMemo(() => ({
    Header: () => (
      <div className='pt-2'>
        {/* Parent Message */}
        <MessageItem
          message={parentMessage!}
          currentUserId={currentUser?.id || ''}
          workspaceId={workspaceId}
          isHovered={
            hoveredMessageId === parentMessage?.id ||
            emojiPickerMessageId === parentMessage?.id
          }
          onHoverChange={(id, hovered) => setHoveredMessageId(hovered ? id : null)}
          emojiPickerOpen={emojiPickerMessageId === parentMessage?.id}
          onEmojiPickerOpenChange={(id, open) =>
            setEmojiPickerMessageId(open ? id : null)
          }
          onReply={() => { }} // Already in thread, no-op
          onReact={(id, emoji) => addReaction({ messageId: id, emoji, userId: currentUser?.id || '' })}
          onEdit={(msg) => updateMessageAction({ messageId: msg.id, content: msg.content })}
          onDelete={(id) => deleteMessageAction({ messageId: id })}
          parentMessage={true}
          hideReplyButton={true}
          isInsideThreadPanel={true}
        />

        {/* Replies Separator */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-xs text-[#797c81] whitespace-nowrap">
            {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
          </span>
          <div className="w-full h-[0.5px] bg-[#797c814d]" />
        </div>
      </div>
    ),
    Footer: () => (
      <>
        {isLoading && (
          <div className="px-4 py-2 text-sm text-[#797c81] animate-pulse">Loading replies...</div>
        )}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-4 my-2 text-xs font-bold text-[#1d9bd1] hover:underline text-left"
          >
            {isFetchingNextPage ? 'Loading more...' : 'View older replies'}
          </button>
        )}
        <div className="h-4" />
      </>
    )
  }), [parentMessage, isLoading, hasNextPage, isFetchingNextPage, currentUser?.id, workspaceId, hoveredMessageId, emojiPickerMessageId, replies.length, addReaction, updateMessageAction, deleteMessageAction, fetchNextPage])

  if (!parentMessage) return null

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21]">
      {/* Header (Toolbar) */}
      <div className="flex items-center justify-between px-4 pt-3 mb-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold">Thread</h2>
        </div>
        <button
          onClick={close}
          className="p-1.5 rounded-md hover:bg-[#797c811a] transition-colors"
        >
          <IoCloseOutline size={24} />
        </button>
      </div>

      {/* Scrollable Content with Virtuoso */}
      <div className="flex-1 min-h-0">
        <Virtuoso
          ref={virtuosoRef}
          data={replies}
          components={components}
          alignToBottom={false}
          followOutput={false}
          className="custom-scrollbar"
          itemContent={(index, reply) => {
            const prevReply = index > 0 ? replies[index - 1] : null
            const isCompact = !!(prevReply && prevReply.user.id === reply.user.id &&
              (new Date(reply.createdAt).getTime() - new Date(prevReply.createdAt).getTime() < 5 * 60 * 1000))

            return (
              <MessageItem
                key={reply.id}
                message={reply}
                currentUserId={currentUser?.id || ''}
                workspaceId={workspaceId}
                isCompact={isCompact}
                isHovered={
                  hoveredMessageId === reply.id ||
                  emojiPickerMessageId === reply.id
                }
                emojiPickerOpen={emojiPickerMessageId === reply.id}
                onHoverChange={(id, hovered) => setHoveredMessageId(hovered ? id : null)}
                onEmojiPickerOpenChange={(id, open) =>
                  setEmojiPickerMessageId(open ? id : null)
                }
                onReply={() => { }}
                onReact={(id, emoji) => addReaction({ messageId: id, emoji, userId: currentUser?.id || '', parentId: parentMessage.id })}
                onEdit={(msg) => updateMessageAction({ messageId: msg.id, content: msg.content, parentId: parentMessage.id })}
                onDelete={(id) => deleteMessageAction({ messageId: id, parentId: parentMessage.id })}
                hideReplyButton={true}
                isInsideThreadPanel={true}
                isFocused={highlightedMessageId === reply.id}
                onFocus={(id) => !id && setHighlightedMessageId(null)} // Reset highlight khi hover vào
              />
            )
          }}
        />
      </div>

      {/* Footer / Editor */}
      <div className="p-4">
        <Editor
          variant="create"
          onSubmit={handleSubmit}
          disabled={isSending}
          onFileAttach={handleFileAttach}
          pendingFiles={pendingFiles}
          onRemoveFile={removePendingFile}
          hasPendingFiles={pendingFiles.length > 0}
        />

        <div className="flex items-center gap-2 mt-2 ml-1">
          <Checkbox
            id="also-send"
            checked={alsoSendToChannel}
            onCheckedChange={(checked) => setAlsoSendToChannel(!!checked)}
          />
          <label
            htmlFor="also-send"
            className="text-xs text-[#797c81] cursor-pointer select-none"
          >
            Also send to channel
          </label>
        </div>
      </div>
    </div>
  )
}

