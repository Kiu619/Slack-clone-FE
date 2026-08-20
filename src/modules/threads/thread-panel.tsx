/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import Editor from '@/components/editor'
import MessageItem from '@/components/message-item'
import { useMessageComposer } from '@/hooks/use-message-composer'
import { useChannel } from '@/hooks/use-channel'
import { useLaterSavedMessageIds } from '@/hooks/use-saved-items'
import { getMessageByIdApi } from '@/apis'
import { useAddReaction, useDeleteMessage, useThreadMessages, useToggleLaterMessage, useTogglePin, useUpdateMessage } from '@/hooks/use-messages'
import { useChannelChatSocket, useConversationChatSocket, useSocket, useThreadSocket } from '@/hooks/use-socket'
import { apiClient } from '@/lib/axios'
import { channelKeys } from '@/lib/query-keys'
import type { Message } from '@/lib/types'
import { useMessageStore } from '@/stores/useMessageStore'
import { useThreadPanelStore } from '@/stores/useThreadPanelStore'
import { useUserStore } from '@/stores/useUserStore'
import { useAppTranslation } from '@/hooks/use-translation'
import { useQuery } from '@tanstack/react-query'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Virtuoso } from 'react-virtuoso'
import { PanelHeader } from '@/components/panel-header'
import ScheduleSendDialog from '@/components/dialogs/schedule-send-dialog';
import { ScheduledSendAckBanner } from '@/components/scheduled-send-ack-banner'
import { canUserPostInChannel, getRestrictedPostingLabel } from '@/lib/channel-posting-permissions'

export type ThreadPanelProps = {
  workspaceId: string
  parentMessageId?: string | null
  onClose?: () => void
  highlightedMessageId?: string | null
}

export default function ThreadPanel({
  workspaceId,
  parentMessageId: parentMessageIdProp,
  onClose: onCloseProp,
  highlightedMessageId: highlightedMessageIdProp,
}: ThreadPanelProps) {
  const t = useAppTranslation("threads")
  const isEmbedded = parentMessageIdProp != null
  const {
    messageId: storeMessageId,
    close: storeClose,
    highlightedMessageId: storeHighlightedMessageId,
    setHighlightedMessageId: setStoreHighlightedMessageId,
  } = useThreadPanelStore()

  const resolvedMessageId = parentMessageIdProp ?? storeMessageId
  const handleClose = onCloseProp ?? storeClose
  const [embeddedHighlightedMessageId, setEmbeddedHighlightedMessageId] = useState<string | null>(null)
  const highlightedMessageId =
    highlightedMessageIdProp ??
    (isEmbedded ? embeddedHighlightedMessageId : storeHighlightedMessageId)
  const setHighlightedMessageId = isEmbedded
    ? setEmbeddedHighlightedMessageId
    : setStoreHighlightedMessageId

  const parentMessageFromStore = useMessageStore((s) =>
    resolvedMessageId ? s.entities[resolvedMessageId] : null,
  )
  const upsertEntities = useMessageStore((s) => s.upsertEntities)
  const virtuosoRef = React.useRef<any>(null)
  const currentUser = useUserStore((s) => s.user)
  const { isConnected } = useSocket()

  const { data: fetchedParentMessage, isLoading: isFetchingParent } = useQuery({
    queryKey: ['message', resolvedMessageId],
    queryFn: () => getMessageByIdApi(resolvedMessageId!),
    enabled: !!resolvedMessageId && !parentMessageFromStore,
    staleTime: 30_000,
  })

  useEffect(() => {
    if (!fetchedParentMessage) return
    upsertEntities([fetchedParentMessage])
  }, [fetchedParentMessage, upsertEntities])

  const parentMessage = parentMessageFromStore ?? fetchedParentMessage ?? null

  const [alsoSendToChannel, setAlsoSendToChannel] = useState(false)
  const [scheduleOpen, setScheduleOpen] = useState(false)
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
  } = useThreadMessages(resolvedMessageId || '', currentUser?.id || '', isConnected)

  const threadMessageIdsForLater = useMemo(() => {
    const ids: string[] = []
    const anchor = parentMessage?.id ?? resolvedMessageId ?? ''
    if (anchor) ids.push(anchor)
    if (data?.pages) {
      for (const p of data.pages) {
        for (const m of p.messages) {
          ids.push(m.id)
        }
      }
    }
    return ids
  }, [parentMessage?.id, resolvedMessageId, data])

  const { savedMessageIdSet, remindAtByMessageId } = useLaterSavedMessageIds(
    workspaceId,
    threadMessageIdsForLater,
  )

  useThreadSocket(parentMessage?.id || '', isConnected, {})

  const isConversation = !parentMessage?.channelId && !!parentMessage?.conversationId
  const channelId = parentMessage?.channelId || ''
  const conversationId = parentMessage?.conversationId || ''
  const { data: threadChannelData } = useChannel(workspaceId, channelId)
  const postingPermission = useMemo(
    () =>
      threadChannelData
        ? canUserPostInChannel(
            threadChannelData,
            currentUser?.id ?? null,
            currentUser?.role ?? null,
          )
        : null,
    [threadChannelData, currentUser?.id, currentUser?.role],
  )
  const restrictedPostingLabel = useMemo(
    () =>
      getRestrictedPostingLabel(
        threadChannelData,
        currentUser?.id ?? null,
        currentUser?.role ?? null,
      ),
    [threadChannelData, currentUser?.id, currentUser?.role],
  )

  useChannelChatSocket(channelId, isConnected && !isConversation, {})

  useConversationChatSocket(conversationId, isConnected && isConversation, {})

  const targetId = parentMessage?.channelId || parentMessage?.conversationId || ''
  const { mutate: addReaction } = useAddReaction(targetId, workspaceId)
  const { mutate: updateMessageAction } = useUpdateMessage(targetId, workspaceId)
  const { mutate: deleteMessageAction } = useDeleteMessage(targetId, workspaceId)
  const { mutate: togglePin } = useTogglePin(targetId, workspaceId)
  const { mutate: toggleLaterMessage } = useToggleLaterMessage(workspaceId)
  const handleSaveForLater = useCallback(
    (messageId: string) => {
      toggleLaterMessage(messageId)
    },
    [toggleLaterMessage],
  )

  const replies = useMemo(() => {
    if (!data?.pages) return []
    return [...data.pages.flatMap(p => p.messages)].reverse()
  }, [data])

  const { data: channelMembersData } = useQuery({
    queryKey: channelKeys.members(workspaceId, parentMessage?.channelId || '', ''),
    queryFn: () => apiClient.get(`/workspaces/${workspaceId}/channels/${parentMessage?.channelId || ''}/members`).then(res => res.data),
    enabled: !!workspaceId && !!parentMessage?.channelId,
  })

  const currentMembers = useMemo(() => {
    if (parentMessage?.channelId) {
      return channelMembersData?.inChannel || []
    }
    if (parentMessage?.conversationId) {
      // Vì ThreadPanel không có sẵn conversationData, ta lấy từ members của parentMessage
      // (Trong DM, parentMessage.user và replies participants là đủ)
      const participants = new Map<string, any>()
      participants.set(parentMessage.user.id, parentMessage.user)
      replies.forEach((r) => participants.set(r.user.id, r.user))
      return Array.from(participants.values())
    }
    return []
  }, [parentMessage, channelMembersData, replies])

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
  }, [highlightedMessageId, replies]) // Cực kỳ quan trọng: trigger khi replies được load xong

  const {
    onSubmit,
    scheduleMessage,
    isScheduling,
    isSending,
    pendingFiles,
    addPendingFiles,
    removePendingFile,
    onComposerHtmlChange,
    composerInitialHtml,
    composerEditorKey,
    scheduledSendAck,
    workspaceTimeZone,
  } = useMessageComposer({
    workspaceId,
    channelId: parentMessage?.channelId || undefined,
    conversationId: parentMessage?.conversationId || undefined,
    parentId: parentMessage?.id,
  })

  // Wrap onSubmit to handle alsoSendToChannel
  const handleSubmitWithChannel = useCallback(async (content: string) => {
    await onSubmit(content, { alsoSendToChannel })
    setAlsoSendToChannel(false)
  }, [onSubmit, alsoSendToChannel])

  const components = useMemo(() => ({
    Header: () => (
      <div className='pt-2'>
        {/* Parent Message */}
        <MessageItem
          messageId={parentMessage!.id}
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
          onPin={(id) => togglePin(id)}
          onSaveForLater={(id) => handleSaveForLater(id)}
          isSavedForLater={savedMessageIdSet.has(parentMessage!.id)}
          savedLaterRemindAtIso={remindAtByMessageId.get(parentMessage!.id)}
          parentMessage={true}
          hideReplyButton={true}
          isInsideThreadPanel={true}
          canReplyInThread={postingPermission?.canReply ?? true}
        />

        {/* Replies Separator */}
        <div className="flex items-center gap-3 px-4 py-3">
          <span className="text-xs text-[#797c81] whitespace-nowrap">
            {replies.length} {replies.length === 1 ? t("reply") : t("replies")}
          </span>
          <div className="w-full h-[0.5px] bg-[#797c814d]" />
        </div>
      </div>
    ),
    Footer: () => (
      <>
        {isLoading && (
          <div className="px-4 py-2 text-sm text-[#797c81] animate-pulse">{t("loadingReplies")}</div>
        )}
        {hasNextPage && (
          <button
            onClick={() => fetchNextPage()}
            disabled={isFetchingNextPage}
            className="mx-4 my-2 text-xs font-bold text-[#1d9bd1] hover:underline text-left"
          >
            {isFetchingNextPage ? t("loadingMore") : t("viewOlderReplies")}
          </button>
        )}
        <div className="h-4" />
      </>
    )
  }), [parentMessage, isLoading, hasNextPage, isFetchingNextPage, currentUser?.id, workspaceId, hoveredMessageId, emojiPickerMessageId, replies.length, addReaction, updateMessageAction, deleteMessageAction, togglePin, fetchNextPage, savedMessageIdSet, remindAtByMessageId, handleSaveForLater, postingPermission?.canReply, t])

  if (!resolvedMessageId) return null

  if (!parentMessage) {
    return (
      <div className="flex h-full flex-col bg-white dark:bg-[#1A1D21]">
        <PanelHeader title={t("thread")} onClose={handleClose} />
        <div className="flex flex-1 items-center justify-center px-4 text-sm text-[#797c81]">
          {isFetchingParent ? t("loadingThread") : t("threadUnavailable")}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21]">
      {/* Header (Toolbar) */}
      <PanelHeader title={t("thread")} onClose={handleClose} />

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
                messageId={reply.id}
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
                onReact={(id, emoji) => addReaction({ messageId: id, emoji, userId: currentUser?.id || '', parentId: parentMessage!.id })}
                onEdit={(msg) => updateMessageAction({ messageId: msg.id, content: msg.content, parentId: parentMessage!.id })}
                onDelete={(id) => deleteMessageAction({ messageId: id, parentId: parentMessage!.id })}
                onPin={(id) => togglePin(id)}
                onSaveForLater={(id) => handleSaveForLater(id)}
                isSavedForLater={savedMessageIdSet.has(reply.id)}
                savedLaterRemindAtIso={remindAtByMessageId.get(reply.id)}
                hideReplyButton={true}
                isInsideThreadPanel={true}
                canReplyInThread={postingPermission?.canReply ?? true}
                isFocused={highlightedMessageId === reply.id}
                onFocus={(id) => !id && setHighlightedMessageId(null)} // Reset highlight khi hover vào
              />
            )
          }}
        />
      </div>

      {/* Footer / Editor */}
      <div className="p-4">
        {scheduledSendAck && (
          <ScheduledSendAckBanner
            workspaceId={workspaceId}
            scheduledAtIso={scheduledSendAck.scheduledAtIso}
            pendingScheduledCount={
              scheduledSendAck.pendingScheduledCount
            }
            workspaceTimeZone={workspaceTimeZone}
          />
        )}
        {postingPermission && !postingPermission.canReply ? (
          <div className="flex flex-col items-center justify-center gap-2 h-28 bg-[rgba(232,226,226,0.4)] dark:bg-[#222529] border-[#797c814d] border rounded-lg">
            <p className="text-sm font-medium text-[#1d1c1d] dark:text-[#f9f8f9]">
              {restrictedPostingLabel ?? t("restrictedThread")}
            </p>
          </div>
        ) : (
          <>
            <Editor
              key={composerEditorKey}
              variant="create"
              workspaceId={workspaceId}
              currentMembers={currentMembers}
              onSubmit={handleSubmitWithChannel}
              disabled={isSending || isScheduling}
              onFileAttach={addPendingFiles}
              pendingFiles={pendingFiles}
              onRemoveFile={removePendingFile}
              hasPendingFiles={pendingFiles.length > 0}
              initialContent={composerInitialHtml}
              onContentChange={onComposerHtmlChange}
              onScheduleClick={() => setScheduleOpen(true)}
              onScheduleQuickPick={async (iso) => {
                try {
                  await scheduleMessage({
                    scheduledAtIso: iso,
                    alsoSendToChannel,
                  })
                } catch {
                  /* toast trong hook */
                }
              }}
              channelPostingSettings={threadChannelData?.postingSettings ?? null}
            />

            {postingPermission?.canSendToChannel ? (
              <div className="flex items-center gap-2 mt-2 ml-1">
                <input
                  id="also-send"
                  type="checkbox"
                  checked={alsoSendToChannel}
                  onChange={(e) => setAlsoSendToChannel(e.target.checked)}
                  className="size-3 cursor-pointer accent-selection-hover"
                />
                <label
                  htmlFor="also-send"
                  className="text-xs text-[#797c81] cursor-pointer select-none"
                >
                  {t("alsoSendToChannel")}
                </label>
              </div>
            ) : null}
          </>
        )}

        <ScheduleSendDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          isSubmitting={isScheduling}
          onConfirm={async (iso) => {
            try {
              await scheduleMessage({
                scheduledAtIso: iso,
                alsoSendToChannel,
              })
              setScheduleOpen(false)
            } catch {
              /* toast trong hook */
            }
          }}
        />
      </div>
    </div>
  )
}
