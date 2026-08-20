'use client'

import { useAddReaction, useDeleteMessage, usePinnedMessages, useTogglePin, useUpdateMessage } from "@/hooks/use-messages"
import MessageItem from "@/components/message-item"
import { Skeleton } from "@/components/ui/skeleton"
import { RiPushpinLine } from "react-icons/ri"
import { useThreadPanelStore } from "@/stores/useThreadPanelStore"
import { useMessageFocusStore } from "@/stores/useMessageFocusStore"
import { cn } from "@/lib/utils"
import type { Channel, DirectMessageConversation } from "@/lib/types"
import { useState } from "react"
import { useUserStore } from "@/stores/useUserStore"
import { useAppTranslation } from "@/hooks/use-translation"

/** Đồng bộ style shell với files-tab và folder-tab */
const PINS_TAB_SHELL = "w-full min-w-0 max-w-[1050px] mx-auto px-3 sm:px-4 md:px-5"

interface PinsTabProps {
  currentChannelData?: Channel
  currentConversationData?: DirectMessageConversation
  onGoToMessagesTab?: () => void
  isMember?: boolean
}

export default function PinsTab({
  currentChannelData,
  currentConversationData,
  onGoToMessagesTab,
  isMember,
}: PinsTabProps) {
  const t = useAppTranslation("headerTabs");
  const currentUser = useUserStore((s) => s.user)
  
  const channelId = currentChannelData?.id
  const conversationId = currentConversationData?.id
  const workspaceId = currentChannelData?.workspaceId || currentConversationData?.workspaceId || ""
  
  const target = channelId ? { channelId } : { conversationId }
  const targetId = (channelId || conversationId) as string
  

  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null)
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<string | null>(
    null,
  )
  
  const { 
    data: pinnedMessages, 
    isPending,
    isError,
    refetch 
  } = usePinnedMessages(target)
  const { mutate: addReaction } = useAddReaction(targetId)
  const { mutate: updateMessageAction } = useUpdateMessage(targetId)
  const { mutate: deleteMessageAction } = useDeleteMessage(targetId)

  const { mutate: togglePin } = useTogglePin(targetId)
  
  const openThread = useThreadPanelStore((s) => s.open)
  const setFocusedMessageId = useMessageFocusStore((s) => s.setFocusedMessageId)

  if (isError) {
    return (
      <div className={cn(PINS_TAB_SHELL, "flex flex-1 flex-col items-center justify-center py-12 text-center")}>
        <p className="text-sm font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
          {t("pins.couldNotLoad")}
        </p>
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-sm text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
        >
          {t("pins.tryAgain")}
        </button>
      </div>
    )
  }

  if (isPending) {
    return (
      <div className={cn(PINS_TAB_SHELL, "flex flex-col gap-4 py-6")}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="w-9 h-9 rounded-lg shrink-0 bg-[#e8e8e8] dark:bg-[#2a2d31]" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/4 bg-[#e8e8e8] dark:bg-[#2a2d31]" />
              <Skeleton className="h-4 w-full bg-[#e8e8e8] dark:bg-[#2a2d31]" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!pinnedMessages?.length) {
    const targetType = channelId ? t("pins.channel") : t("pins.conversation");
    return (
      <div className={cn(PINS_TAB_SHELL, "flex flex-1 flex-col items-center justify-center py-20 text-center")}>
        <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-[#222529] flex items-center justify-center mb-4 text-[#797c81]">
          <RiPushpinLine size={32} />
        </div>
        <h3 className="text-lg font-bold mb-2">{t("pins.noPinnedMessages")}</h3>
        <p className="text-sm text-[#797c81] max-w-[320px]">
          {t("pins.noPinnedMessagesDescription", { target: targetType })}
        </p>
      </div>
    )
  }

  return (
    <div className={cn(PINS_TAB_SHELL, "flex flex-col h-full overflow-hidden")}>
      <div className="flex-1 overflow-y-auto min-h-0 pb-10 -mx-3 sm:-mx-4 md:-mx-5">
        <div className="flex flex-col gap-3 mt-5 cursor-pointer">
          {pinnedMessages.map((message) => (
            <div key={message.id} className="relative border-b border-[#dddddd]/50 dark:border-[#35373B]/50 last:border-0">
              <MessageItem
                messageId={message.id}
                message={message}
                currentUserId={currentUser?.id || ''}
                workspaceId={workspaceId}
                onPin={(id) => togglePin(id)}
                onReact={(id, emoji) => addReaction({ messageId: id, emoji, userId: currentUser?.id || '' })}
                onEdit={(msg) => updateMessageAction({ messageId: msg.id, content: msg.content })}
                onDelete={(id) => deleteMessageAction({ messageId: id })}
                onReply={(msg) => openThread(msg)}
                // Khi click vào nội dung, nhảy đến tin nhắn đó trong timeline chính
                onFocus={() => {
                  setFocusedMessageId(message.id)
                  onGoToMessagesTab?.()
                }}
                hideReplyButton={false}
                isHovered={
                  hoveredMessageId === message.id ||
                  emojiPickerMessageId === message.id
                }
                emojiPickerOpen={emojiPickerMessageId === message.id}
                onHoverChange={(id, hovered) => setHoveredMessageId(hovered ? id : null)}
                onEmojiPickerOpenChange={(id, open) =>
                  setEmojiPickerMessageId(open ? id : null)
                }
                isMember={isMember}
                fromPublicChannel={currentChannelData?.isPrivate===false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
