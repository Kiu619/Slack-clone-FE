'use client'

import { useCallback } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import MessageList from '@/components/message-list'
import TypingIndicator from '@/components/typing-indicator'
import Editor from '@/components/editor'
import UploadingFileItem from '@/components/uploading-file-item'
import { useSendMessage, useTypingIndicator } from '@/hooks/use-messages'
import { useSocket, getSocket } from '@/hooks/use-socket'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useUserStore } from '@/stores/useUserStore'
import { messageKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/axios'
import type { Channel, Message, MessageAttachment } from '@/lib/types'

const PLACEHOLDER_CONTENT = '<p>📎 Đang tải file...</p>'

interface MainProps {
  currentChannelData: Channel
}

const Main = ({ currentChannelData }: MainProps) => {
  const currentUser = useUserStore((state) => state.user)
  const queryClient = useQueryClient()

  /**
   * useSocket: connect và theo dõi trạng thái WebSocket
   * isConnected là React state — thay đổi → re-render → hook con re-run
   */
  const { isConnected } = useSocket()

  /**
   * Typing indicator: cần isConnected để join room đúng lúc
   */
  const typingUsers = useTypingIndicator(
    currentChannelData.id,
    currentUser?.userId ?? '',
    isConnected,
  )

  const currentUserForMutation = currentUser
    ? {
        id: currentUser.userId,
        name: currentUser.name ?? null,
        email: currentUser.email,
        avatar: currentUser.avatar ?? null,
      }
    : null

  const { mutate: sendMessage, isPending: isSending } = useSendMessage(
    currentChannelData.id,
    currentUserForMutation,
  )

  const { uploadFile, uploadingFiles, clearUploadingFiles } = useFileUpload()

  /** Cập nhật cache khi attachment được thêm (sender không nhận WS event) */
  const addAttachmentToMessageInCache = useCallback(
    (messageId: string, attachment: MessageAttachment) => {
      queryClient.setQueryData(
        messageKeys.list(currentChannelData.id),
        (old: { pages: { messages: Message[] }[] } | undefined) => {
          if (!old?.pages.length) return old
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((m) =>
                m.id === messageId
                  ? {
                      ...m,
                      attachments: [...(m.attachments || []), attachment],
                    }
                  : m,
              ),
            })),
          }
        },
      )
    },
    [queryClient, currentChannelData.id],
  )

  /** PATCH message content khi upload xong (xóa placeholder) */
  const updateMessageContent = useCallback(
    async (messageId: string, content: string) => {
      try {
        const { data } = await apiClient.patch<Message>(
          `/messages/${messageId}`,
          { content },
        )
        queryClient.setQueryData(
          messageKeys.list(currentChannelData.id),
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
      } catch {
        queryClient.setQueryData(
          messageKeys.list(currentChannelData.id),
          (old: { pages: { messages: Message[] }[] } | undefined) => {
            if (!old?.pages.length) return old
            return {
              ...old,
              pages: old.pages.map((page) => ({
                ...page,
                messages: page.messages.map((m) =>
                  m.id === messageId ? { ...m, content } : m,
                ),
              })),
            }
          },
        )
      }
    },
    [queryClient, currentChannelData.id],
  )

  const handleSubmit = useCallback(
    (htmlContent: string) => {
      sendMessage({ content: htmlContent })
    },
    [sendMessage],
  )

  const handleEditMessage = useCallback((message: Message) => {
    console.log('Edit message:', message.id)
  }, [])

  const handleDeleteMessage = useCallback((messageId: string) => {
    console.log('Delete message:', messageId)
  }, [])

  const handleReplyMessage = useCallback((message: Message) => {
    console.log('Reply to:', message.id)
  }, [])

  /**
   * Emit typing events qua socket singleton
   * getSocket() trả về instance đã tồn tại — không tạo connection mới
   */
  const handleTypingStart = useCallback(() => {
    if (!isConnected) return
    getSocket().emit('typing:start', { channelId: currentChannelData.id })
  }, [isConnected, currentChannelData.id])

  const handleTypingStop = useCallback(() => {
    if (!isConnected) return
    getSocket().emit('typing:stop', { channelId: currentChannelData.id })
  }, [isConnected, currentChannelData.id])

  /**
   * handleFileAttach — khi user chọn files để upload
   *
   * Flow:
   * 1. Tạo message với placeholder "Đang tải file"
   * 2. Upload từng file → mỗi success: add attachment vào cache (sender không nhận WS)
   * 3. Khi xong: PATCH message content → "📎", clear pending + uploadingFiles
   */
  const handleFileAttach = useCallback(
    async (files: File[]) => {
      if (!files.length) return

      sendMessage(
        { content: PLACEHOLDER_CONTENT },
        {
          onSuccess: async (newMessage) => {
            let successCount = 0

            for (const file of files) {
              try {
                const attachment = await uploadFile(file, newMessage.id)
                addAttachmentToMessageInCache(newMessage.id, attachment)
                successCount++
                toast.success(`Đã tải lên: ${file.name}`)
              } catch (error) {
                toast.error(
                  `Lỗi khi tải ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
                )
              }
            }

            clearUploadingFiles()

            if (successCount > 0) {
              await updateMessageContent(newMessage.id, '<p></p>')
            } else {
              await updateMessageContent(
                newMessage.id,
                '<p>⚠️ Tải file thất bại</p>',
              )
            }
          },
        },
      )
    },
    [
      sendMessage,
      uploadFile,
      addAttachmentToMessageInCache,
      updateMessageContent,
      clearUploadingFiles,
    ],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/**
       * MessageList nhận isConnected để useMessages có thể join room
       * ngay khi socket connected (thay vì chờ re-render)
       */}
      <MessageList
        channelId={currentChannelData.id}
        currentUserId={currentUser?.userId ?? ''}
        isConnected={isConnected}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        onReplyMessage={handleReplyMessage}
      />

      <div className="min-h-[24px] shrink-0">
        <TypingIndicator typingUsers={typingUsers} />
      </div>

      <div className="px-4 pb-4 shrink-0">
        <Editor
          channelName={currentChannelData.name}
          onSubmit={handleSubmit}
          onTypingStart={handleTypingStart}
          onTypingStop={handleTypingStop}
          onFileAttach={handleFileAttach}
          disabled={isSending}
        />

        {/* Upload progress indicator */}
        {uploadingFiles.length > 0 && (
          <div className="mt-2 space-y-2">
            {uploadingFiles.map((file) => (
              <UploadingFileItem
                key={file.id}
                file={file}
                onCancel={(id) => {
                  // TODO: implement cancel upload
                  console.log('Cancel upload:', id)
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Main
