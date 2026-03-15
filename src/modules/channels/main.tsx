'use client'

import { useCallback, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { LuX } from 'react-icons/lu'
import MessageList from '@/components/message-list'
import Editor from '@/components/editor'
import UploadingFileItem from '@/components/uploading-file-item'
import { useSendMessage } from '@/hooks/use-messages'
import { useSocket } from '@/hooks/use-socket'
import { useFileUpload } from '@/hooks/use-file-upload'
import { useUserStore } from '@/stores/useUserStore'
import { messageKeys } from '@/lib/query-keys'
import { apiClient } from '@/lib/axios'
import type { Channel, Message, MessageAttachment } from '@/lib/types'

const PLACEHOLDER_CONTENT = '<p>📎 Đang tải file...</p>'

export interface PendingFile {
  id: string
  file: File
}

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
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])

  const addPendingFiles = useCallback((files: File[]) => {
    const newItems: PendingFile[] = files.map((file) => ({
      id: Math.random().toString(36).substring(7),
      file,
    }))
    setPendingFiles((prev) => [...prev, ...newItems])
  }, [])

  const removePendingFile = useCallback((id: string) => {
    setPendingFiles((prev) => prev.filter((p) => p.id !== id))
  }, [])

  const clearPendingFiles = useCallback(() => setPendingFiles([]), [])

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
      const hasContent =
        htmlContent.trim() !== '' && htmlContent.trim() !== '<p></p>'
      const hasFiles = pendingFiles.length > 0

      if (!hasContent && !hasFiles) return

      const contentToSend = hasContent ? htmlContent : PLACEHOLDER_CONTENT
      const filesToUpload = [...pendingFiles]

      clearPendingFiles()

      sendMessage(
        { content: contentToSend },
        {
          onSuccess: async (newMessage) => {
            if (filesToUpload.length === 0) return

            let successCount = 0
            for (const { file } of filesToUpload) {
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

            // Chỉ xóa placeholder nếu lúc gửi không có text (đã dùng PLACEHOLDER_CONTENT)
            if (!hasContent) {
              if (successCount > 0) {
                await updateMessageContent(newMessage.id, '<p></p>')
              } else {
                await updateMessageContent(
                  newMessage.id,
                  '<p>⚠️ Tải file thất bại</p>',
                )
              }
            }
          },
        },
      )
    },
    [
      sendMessage,
      pendingFiles,
      clearPendingFiles,
      uploadFile,
      addAttachmentToMessageInCache,
      updateMessageContent,
      clearUploadingFiles,
    ],
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
  
  const handleFileAttach = useCallback(
    (files: File[]) => {
      if (!files.length) return
      addPendingFiles(files)
    },
    [addPendingFiles],
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

      <div className="px-4 pb-4 shrink-0">
        {/* Pending files — chưa gửi, nhấn Enter/Gửi để upload */}
        {pendingFiles.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {pendingFiles.map(({ id, file }) => (
              <div
                key={id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#222529] border border-[#797c814d] text-sm"
              >
                <span className="text-gray-200 truncate max-w-[150px]">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removePendingFile(id)}
                  className="p-0.5 hover:bg-[#35373B] rounded transition-colors"
                >
                  <LuX size={14} className="text-gray-400" />
                </button>
              </div>
            ))}
          </div>
        )}

        <Editor
          channelName={currentChannelData.name}
          onSubmit={handleSubmit}
          onFileAttach={handleFileAttach}
          disabled={isSending}
          hasPendingFiles={pendingFiles.length > 0}
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
