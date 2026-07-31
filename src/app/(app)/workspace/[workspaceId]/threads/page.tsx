"use client";

import {
  useThreads,
  useMarkThreadAsRead,
  useThreadMessages,
  useAddReaction,
  useUpdateMessage,
  useDeleteMessage,
  useTogglePin,
  updateMessageReactions,
} from "@/hooks/use-messages";
import { useQueryClient } from "@tanstack/react-query";
import { messageKeys } from "@/lib/query-keys";
import type { ThreadsPage } from "@/lib/types";
import { useMessageComposer } from "@/hooks/use-message-composer";
import { useChannel } from "@/hooks/use-channel";
import { useSocket, useThreadSocket, useChannelChatSocket, useConversationChatSocket } from "@/hooks/use-socket";
import { useMessageSync } from "@/hooks/use-message-sync";
import { useAuth } from "@/hooks/use-auth";
import { useMessageStore } from "@/stores/useMessageStore";
import { useUserStore } from "@/stores/useUserStore";
import { useParams } from "next/navigation";
import MessageItem from "@/components/message-item";
import { useThreadPanelStore } from "@/stores/useThreadPanelStore";
import { Loader2, Hash, Lock, ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import Typography from "@/components/ui/typography";
import { Virtuoso } from "react-virtuoso";
import { Skeleton } from "@/components/ui/skeleton";
import type { ThreadMessage, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import Editor from "@/components/editor";
import UploadingFileItem from "@/components/uploading-file-item";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import ScheduleSendDialog from "@/components/dialogs/schedule-send-dialog";
import { ScheduledSendAckBanner } from "@/components/scheduled-send-ack-banner";
import { canUserPostInChannel } from "@/lib/channel-posting-permissions";

/** Skeleton khi đang load lần đầu */
function ThreadSkeleton() {
  return (
    <div className="flex flex-col gap-4 p-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="bg-white dark:bg-[#1A1D21] border dark:border-[#797c814d] rounded-lg overflow-hidden shadow-sm"
        >
          <div className="h-10 border-b dark:border-[#797c814d] bg-gray-50/50 dark:bg-[#222529]/50 px-4 flex items-center gap-2">
            <Skeleton className="w-4 h-4 rounded bg-[#2a2d31]" />
            <Skeleton className="w-32 h-4 bg-[#2a2d31]" />
          </div>
          <div className="p-4 space-y-4">
            <div className="flex gap-3">
              <Skeleton className="w-9 h-9 rounded-lg bg-[#2a2d31]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/4 bg-[#2a2d31]" />
                <Skeleton className="h-4 w-3/4 bg-[#2a2d31]" />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ThreadCard({
  thread,
  workspaceId,
  currentUserId,
  currentUserRole,
  onMarkAsRead,
}: {
  thread: ThreadMessage;
  workspaceId: string;
  currentUserId: string;
  currentUserRole?: string | null;
  onMarkAsRead: (id: string) => void;
}) {
  const queryClient = useQueryClient();
  const { open: openThread } = useThreadPanelStore();
  const { isConnected } = useSocket();
  const { syncMessageUpdate, syncMessageDeletion } = useMessageSync();
  const [showAllReplies, setShowAllReplies] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const [emojiPickerMessageId, setEmojiPickerMessageId] = useState<
    string | null
  >(null);

  const {
    onSubmit,
    scheduleMessage,
    isScheduling,
    isSending,
    pendingFiles,
    uploadingFiles,
    addPendingFiles,
    removePendingFile,
    onComposerHtmlChange,
    composerInitialHtml,
    composerEditorKey,
    scheduledSendAck,
    workspaceTimeZone,
  } = useMessageComposer({
    workspaceId,
    channelId: thread.channelId || undefined,
    conversationId: thread.conversationId || undefined,
    parentId: thread.id,
  });

  // Sử dụng dữ liệu thực thể từ Zustand để đồng bộ realtime O(1)
  const threadMessage = useMessageStore(s => s.entities[thread.id]) || thread;
  const { data: threadChannelData } = useChannel(workspaceId, thread.channelId || "");
  const canReplyInThread = useMemo(() => {
    if (!thread.channelId) return true;
    return canUserPostInChannel(
      threadChannelData,
      currentUserId,
      currentUserRole ?? null,
    ).canReply;
  }, [thread.channelId, threadChannelData, currentUserId, currentUserRole]);
  const restrictedThreadLabel = "Only certain people can post in this channel";

  // Fetch full replies when user wants to see more
  const {
    data: fullRepliesData,
    fetchNextPage: fetchMoreReplies,
    hasNextPage: hasNextRepliesPage,
    isFetchingNextPage: isFetchingMoreReplies,
  } = useThreadMessages(thread.id, currentUserId, isConnected && showAllReplies);

  // Đăng ký nhận cập nhật realtime cho riêng tin nhắn cha này (reactions, pins, edits)
  // Lắng nghe từ cả Thread room và Channel/DM room để đảm bảo không bỏ sót
  const isConversation = !thread.channelId && !!thread.conversationId

  useThreadSocket(thread.id, isConnected, {})
  useChannelChatSocket(thread.channelId ?? null, isConnected && !isConversation, {})
  useConversationChatSocket(thread.conversationId ?? null, isConnected && isConversation, {})

  const { mutate: addReaction } = useAddReaction(
    thread.channelId || thread.conversationId || "",
    workspaceId,
  );
  const { mutate: updateMessageAction } = useUpdateMessage(
    thread.channelId || thread.conversationId || "",
    workspaceId,
  );
  const { mutate: deleteMessageAction } = useDeleteMessage(
    thread.channelId || thread.conversationId || "",
    workspaceId,
  );
  const { mutate: togglePin } = useTogglePin(
    thread.channelId || thread.conversationId || "",
    workspaceId,
  );

  const setFocusedMessageId = useMessageFocusStore(
    (s) => s.setFocusedMessageId,
  );

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const headerIcon = useMemo(() => {
    if (thread.channel) {
      return thread.channel.isPrivate ? <Lock size={14} /> : <Hash size={14} />;
    }
    return null;
  }, [thread.channel]);

  const headerName = useMemo(() => {
    if (thread.channel) return thread.channel.name;
    if (thread.conversation) {
      if (thread.conversation.isGroup) return "Group DM";
      const otherMember = thread.conversation.members.find(
        (m) => m.id !== currentUserId,
      );
      if (!otherMember) return "Direct Message";
      const d = mergeUserForDisplay(
        otherMember as User,
        memberOverlayMap[otherMember.id],
      );
      return (
        d.displayName ||
        d.name ||
        d.email ||
        "Direct Message"
      );
    }
    return "Thread";
  }, [thread.channel, thread.conversation, currentUserId, memberOverlayMap]);

  const subLabel = useMemo(() => {
    const participants = new Map<string, string>();
    const getDisplayName = (u: User) => {
      const d = mergeUserForDisplay(u, memberOverlayMap[u.id]);
      return d.displayName || d.name || u.email || "Unknown";
    };
    participants.set(thread.user.id, getDisplayName(thread.user));
    thread.replies.forEach((reply) => {
      participants.set(reply.user.id, getDisplayName(reply.user));
    });

    const otherParticipants: string[] = [];
    let includesMe = false;
    participants.forEach((name, id) => {
      if (id === currentUserId) includesMe = true;
      else otherParticipants.push(name);
    });

    if (includesMe) {
      if (otherParticipants.length === 0) return "Just you";
      if (otherParticipants.length === 1)
        return `You and ${otherParticipants[0]}`;
      if (otherParticipants.length === 2)
        return `You, ${otherParticipants[0]} and ${otherParticipants[1]}`;
      return `You, ${otherParticipants[0]} and ${otherParticipants.length - 1} others`;
    }
    if (otherParticipants.length === 0) return "";
    if (otherParticipants.length === 1) return otherParticipants[0];
    if (otherParticipants.length === 2)
      return `${otherParticipants[0]} and ${otherParticipants[1]}`;
    return `${otherParticipants[0]}, ${otherParticipants[1]} and ${otherParticipants.length - 2} others`;
  }, [thread, currentUserId, memberOverlayMap]);

  const displayedReplies = useMemo(() => {
    if (!showAllReplies) return thread.replies;
    const allFetched =
      fullRepliesData?.pages.flatMap((p) => p.messages).reverse() || [];
    return allFetched.length > 0 ? allFetched : thread.replies;
  }, [showAllReplies, fullRepliesData, thread.replies]);

  const currentMembers = useMemo(() => {
    if (thread.channelId) {
      // Vì ThreadCard không có sẵn danh sách member channel, 
      // ta có thể truyền từ parent hoặc dùng hook fetch ở đây.
      // Để đơn giản, ta coi như member của thread chính là member của message cha + replies
      const participants = new Map<string, any>();
      participants.set(thread.user.id, thread.user);
      thread.replies.forEach(r => participants.set(r.user.id, r.user));
      return Array.from(participants.values());
    }
    if (thread.conversation) {
      return thread.conversation.members || [];
    }
    return [];
  }, [thread]);

  return (
    <div
      className="mb-4 bg-white dark:bg-[#1A1D21] border dark:border-[#797c814d] rounded-lg overflow-hidden shadow-sm group/card"
      onClick={() => {
        if (thread.isUnread) {
          onMarkAsRead(thread.id);
        }
      }}
    >
      {/* Thread Header */}
      <div className="h-10 border-b dark:border-[#797c814d] bg-gray-50/50 dark:bg-[#222529]/50 px-4 flex items-center justify-between">
        <div className="flex items-center gap-2 overflow-hidden">
          <div className="text-[#797c81] shrink-0">{headerIcon}</div>
          <Typography
            variant="p"
            text={headerName}
            className="font-bold text-sm truncate"
          />
          <Typography
            variant="p"
            text={subLabel}
            className="text-xs text-[#797c81] truncate"
          />
        </div>
      </div>

      {/* Thread Content */}
      <div className="flex flex-col">
        <MessageItem
          messageId={threadMessage.id}
          message={threadMessage}
          currentUserId={currentUserId}
          workspaceId={workspaceId}
          // hideReplyButton

          hideThreadReplyBar
          onPin={(id) => togglePin(id)}
          onReact={(id, emoji) =>
            addReaction({ messageId: id, emoji, userId: currentUserId })
          }
          onEdit={(msg) =>
            updateMessageAction({ messageId: msg.id, content: msg.content })
          }
          onDelete={(id) => deleteMessageAction({ messageId: id })}
          onReply={() => openThread(threadMessage as any)}
          // Khi click vào nội dung, nhảy đến tin nhắn đó trong timeline chính
          onFocus={() => {
            setFocusedMessageId(threadMessage.id);
          }}
          hideReplyButton={false}
          isHovered={
            hoveredMessageId === threadMessage.id || emojiPickerMessageId === threadMessage.id
          }
          emojiPickerOpen={emojiPickerMessageId === threadMessage.id}
          onHoverChange={(id, hovered) =>
            setHoveredMessageId(hovered ? id : null)
          }
          onEmojiPickerOpenChange={(id, open) =>
            setEmojiPickerMessageId(open ? id : null)
          }

          fromThreadPage={true}
        />

        {/* Load More Button */}
        {(thread.hasMoreReplies || hasNextRepliesPage) && !showAllReplies && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowAllReplies(true);
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#1d9bd1] hover:bg-gray-50 dark:hover:bg-[#222529] font-medium transition-colors border-y dark:border-[#797c814d]"
          >
            <ChevronDown size={16} />
            Show more replies
          </button>
        )}

        {/* Show More in chunks of 10 */}
        {showAllReplies && hasNextRepliesPage && (
          <button
            disabled={isFetchingMoreReplies}
            onClick={(e) => {
              e.stopPropagation();
              void fetchMoreReplies();
            }}
            className="flex items-center gap-2 px-4 py-2 text-sm text-[#1d9bd1] hover:bg-gray-50 dark:hover:bg-[#222529] font-medium transition-colors border-y dark:border-[#797c814d] disabled:opacity-50"
          >
            {isFetchingMoreReplies ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ChevronDown size={16} />
            )}
            Load 10 more replies
          </button>
        )}

        {displayedReplies.map((reply, idx) => (
          <MessageItem
            key={reply.id}
            messageId={reply.id}
            message={reply}
            currentUserId={currentUserId}
            workspaceId={workspaceId}
            isCompact={
              idx > 0 && displayedReplies[idx - 1].user.id === reply.user.id
            }
            onPin={(id) => togglePin(id)}
          onReact={(id, emoji) =>
            addReaction({ messageId: id, emoji, userId: currentUserId })
          }
          onEdit={(msg) =>
            updateMessageAction({ messageId: msg.id, content: msg.content })
          }
          onDelete={(id) => deleteMessageAction({ messageId: id })}
          hideReplyButton
          // Khi click vào nội dung, nhảy đến tin nhắn đó trong timeline chính
          onFocus={() => {
            setFocusedMessageId(reply.id);
          }}
          isHovered={
            hoveredMessageId === reply.id || emojiPickerMessageId === reply.id
          }
          emojiPickerOpen={emojiPickerMessageId === reply.id}
          onHoverChange={(id, hovered) =>
            setHoveredMessageId(hovered ? id : null)
          }
          onEmojiPickerOpenChange={(id, open) =>
            setEmojiPickerMessageId(open ? id : null)
          }
          />
        ))}
      </div>

      <div className="p-4 pt-2">
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
        {canReplyInThread ? (
          <Editor
            key={composerEditorKey}
            workspaceId={workspaceId}
            currentMembers={currentMembers}
            onSubmit={onSubmit}
            onFileAttach={addPendingFiles}
            disabled={isSending || isScheduling}
            pendingFiles={pendingFiles}
            hasPendingFiles={pendingFiles.length > 0}
            onRemoveFile={removePendingFile}
            initialContent={composerInitialHtml}
            onContentChange={onComposerHtmlChange}
            onScheduleClick={() => setScheduleOpen(true)}
            onScheduleQuickPick={async (iso) => {
              try {
                await scheduleMessage({
                  scheduledAtIso: iso,
                  alsoSendToChannel: false,
                });
              } catch {
                /* toast trong hook */
              }
            }}
          />
        ) : (
          <div className="flex h-28 flex-col items-center justify-center gap-2 rounded-lg border border-[#797c814d] bg-[rgba(232,226,226,0.4)] dark:bg-[#222529]">
            <Typography
              variant="p"
              text={restrictedThreadLabel}
              className="text-sm font-medium text-[#1d1c1d] dark:text-[#f9f8f9]"
            />
          </div>
        )}

        <ScheduleSendDialog
          open={scheduleOpen}
          onOpenChange={setScheduleOpen}
          isSubmitting={isScheduling}
          onConfirm={async (iso) => {
            try {
              await scheduleMessage({
                scheduledAtIso: iso,
                alsoSendToChannel: false,
              });
              setScheduleOpen(false);
            } catch {
              /* toast trong hook */
            }
          }}
        />

        {/* Upload progress indicator */}
        {uploadingFiles.length > 0 && (
          <div className="mt-2 space-y-2">
            {uploadingFiles.map((file) => (
              <UploadingFileItem
                key={file.id}
                file={file}
                onCancel={(id) => {
                  console.log("Cancel upload:", id);
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function ThreadsPage() {
  const { workspaceId } = useParams() as { workspaceId: string };
  const { user } = useAuth();
  const currentUserRole = useUserStore((s) => s.user?.role ?? null);
  console.log("Current user role in ThreadsPage:", currentUserRole);
  const { isConnected } = useSocket();

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } =
    useThreads(workspaceId, user?.id ?? "", isConnected);

  const { mutate: markAsRead } = useMarkThreadAsRead(workspaceId);

  const allThreads = useMemo(
    () => data?.pages.flatMap((page) => page.threads) ?? [],
    [data?.pages],
  );

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-[#F8F8F8] dark:bg-[#1A1D21]">
        <div className="h-[49px] border-b dark:border-[#797c814d] bg-white dark:bg-[#1A1D21] flex items-center px-4 shrink-0">
          <Typography
            variant="h2"
            text="Threads"
            className="text-lg font-bold"
          />
        </div>
        <ThreadSkeleton />
      </div>
    );
  }

  if (allThreads.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-[#F8F8F8] dark:bg-[#1A1D21]">
        <div className="bg-muted rounded-full p-6 mb-4">
          <Typography variant="h2" text="🧵" className="text-4xl" />
        </div>
        <Typography variant="h2" text="No threads yet" className="mb-2" />
        <Typography
          variant="p"
          text="Threads are a great way to keep conversations organized. When you reply to a message, it will show up here."
          className="text-muted-foreground max-w-sm"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#F8F8F8] dark:bg-[#0b0e11]">
      {/* Header */}
      <div className="h-[49px] border-b dark:border-[#797c814d] bg-white dark:bg-[#1A1D21] flex items-center px-4 shrink-0">
        <Typography variant="h2" text="Threads" className="text-lg font-bold" />
      </div>

      {/* Thread List with Virtuoso */}
      <div className="flex-1 overflow-hidden p-4">
        <Virtuoso
          data={allThreads}
          endReached={() => {
            if (hasNextPage && !isFetchingNextPage) {
              void fetchNextPage();
            }
          }}
          increaseViewportBy={400}
          itemContent={(index, thread) => (
            <ThreadCard
              thread={thread}
              workspaceId={workspaceId}
              currentUserId={user?.id ?? ""}
              currentUserRole={currentUserRole}
              onMarkAsRead={(id) => markAsRead(id)}
            />
          )}
          components={{
            Footer: () => (
              <div className="h-10 flex items-center justify-center">
                {isFetchingNextPage && (
                  <Loader2 className="size-4 animate-spin text-muted-foreground" />
                )}
              </div>
            ),
          }}
        />
      </div>
    </div>
  );
}
