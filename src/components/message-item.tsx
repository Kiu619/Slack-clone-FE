/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import AttachmentList from "@/components/attachment-previews/attachment-list";
import Avatar from "@/components/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { Message, Reaction } from "@/lib/types";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import DOMPurify from "dompurify";
import { useCallback, useMemo, useState } from "react";
import { LuHash, LuLink, LuPencil, LuTrash2, LuUndo2, LuX } from "react-icons/lu";
import Editor, { PendingFile } from "./editor";
import { useFileUpload } from "@/hooks/use-file-upload";
import { useUpdateMessage } from "@/hooks/use-messages";
import { useRemindMe } from "@/hooks/use-saved-items";
import { useMessageStore } from "@/stores/useMessageStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";

import { getMemberStatusApi } from "@/apis";

// Dynamic import EmojiPicker để tránh SSR
import { formatTimestamp } from "@/helpers/format-time-stamp";
import { cn } from "@/lib/utils";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { BiMessageRoundedDetail } from "react-icons/bi";
import { FiBellOff } from "react-icons/fi";
import {
  MdBookmark,
  MdBookmarkBorder,
  MdMoreVert,
  MdOutlineAddReaction,
  MdOutlineKeyboardArrowRight,
  MdOutlineMarkChatUnread,
} from "react-icons/md";
import { RiPushpinLine, RiShareForwardLine } from "react-icons/ri";
import { RxText } from "react-icons/rx";
import { Separator } from "./ui/separator";
import Typography from "./ui/typography";
import { ForwardMessageDialog } from "./dialogs/forward-message-dialog";
import { ForwardedMessageTimelineBlock } from "@/components/workspace/forwarded-message-timeline";
import { UserStatusEmojiInline } from "./user-status-emoji-inline";
import { useQuery } from "@tanstack/react-query";
import { ICON_TRANSITION, MENU_ITEM_STYLE, SUBMENU_ITEM_STYLE, TOOLBAR_ITEM_STYLE } from "@/constants/styles";
const EmojiPicker = dynamic(() => import("emoji-picker-react"));

interface MessageItemProps {
  /** ID của tin nhắn để lấy dữ liệu từ Store (Ưu tiên) */
  messageId?: string;
  /** Dữ liệu tin nhắn truyền trực tiếp (Dùng khi chưa có trong Store) */
  message?: Message;
  /** currentUserId để biết highlight reaction nào là của mình */
  currentUserId: string;
  /** workspaceId dùng để fetch workspace member status khi mở ProfilePanel */
  workspaceId: string;
  /**
   * isCompact = true khi message liên tiếp cùng user trong < 5 phút
   * → ẩn avatar + tên, chỉ hiện timestamp nhỏ bên trái (giống Slack)
   */
  isCompact?: boolean;
  /** Hover state từ parent — tránh duplicate toolbar khi lướt nhanh */
  isHovered?: boolean;
  onHoverChange?: (messageId: string, hovered: boolean) => void;
  /** Popover emoji đang mở — controlled từ parent */
  emojiPickerOpen?: boolean;
  /** Callback khi EmojiPicker open/close — giữ toolbar hiển thị khi picker mở */
  onEmojiPickerOpenChange?: (messageId: string, open: boolean) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message, highlightedMessageId?: string) => void;
  onMarkAsRead?: (parentId: string) => void;
  onSaveForLater?: (messageId: string) => void;
  /** True when this message is in Later (in_progress) — filled bookmark + banner */
  isSavedForLater?: boolean;
  /**
   * When the user set a reminder on this saved message (Later `remindAt`), ISO string.
   * Shown in the banner after "Saved for later" (Slack-style "Due in …").
   */
  savedLaterRemindAtIso?: string | null;
  /**
   * When true: hide the blue "Saved for later" row + bookmark save button
   * (e.g. message preview inside Later list — `saved-item` used by `later-side-panel`).
   */
  hideSaveForLaterUi?: boolean;

  parentMessage?: boolean;
  hideReplyButton?: boolean;
  /** Dùng để phân biệt Context: Channel Timeline hay Thread Panel */
  isInsideThreadPanel?: boolean;
  isFocused?: boolean;
  isTemporaryHighlight?: boolean;
  onFocus?: (messageId: string) => void;
  hideThreadReplyBar?: boolean;
  fromThreadPage?: boolean;
  isMember?: boolean;
  fromPublicChannel?: boolean;
}

function DeletedMessage() {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 w-full text-[#797c81]">
      <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-gray-200">
        <LuTrash2 size={16} />
      </div>
      <Typography variant="p" text="Message deleted" />
    </div>
  );
}

/** Component hiển thị avatar của một participant trong thread */
function ThreadParticipantAvatar({
  userId,
  workspaceId,
}: {
  userId: string;
  workspaceId: string;
}) {
  const overlay = useWorkspaceMemberOverlay(workspaceId, userId);
  const { data: memberStatus } = useQuery({
    queryKey: ["workspace-member-status", workspaceId, userId],
    queryFn: () => getMemberStatusApi(workspaceId, userId),
    staleTime: 5 * 60 * 1000,
  });
  const avatarUrl = overlay?.avatar ?? memberStatus?.avatar ?? "";
  const displayName =
    overlay?.displayName?.trim() ||
    overlay?.name?.trim() ||
    memberStatus?.name ||
    "Participant";
  const initial = displayName.charAt(0).toUpperCase() || "?";

  return (
    <div className="w-6 h-6 rounded bg-gray-200 border-2 border-white dark:border-[#1A1D21] shrink-0 overflow-hidden">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={avatarUrl}
          alt={displayName}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-blue-500 text-[10px] text-white font-bold">
          {initial}
        </div>
      )}
    </div>
  );
}

/** Format timestamp cho compact mode (chỉ giờ) */
function formatCompactTime(dateStr: string): string {
  return format(new Date(dateStr), "HH:mm");
}

/** Tiện ích lấy plaintext từ HTML (cho snippet tin nhắn cha) */
function getPlainText(html: string): string {
  if (!html) return "";
  // Loại bỏ tags, giữ text content
  return html.replace(/<[^>]*>?/gm, "").trim();
}

/** Wall-clock relative copy for the Later banner (not memoized — needs current time). */
function savedLaterDueLabelFromIso(remindAtIso: string): string | null {
  const d = new Date(remindAtIso);
  if (Number.isNaN(d.getTime())) return null;
  if (isPast(d)) {
    return `Incomplete · ${formatDistanceToNowStrict(d, { addSuffix: true })}`;
  }
  return `Due in ${formatDistanceToNowStrict(d)}`;
}

export default function MessageItem({
  messageId,
  message: initialMessage,
  currentUserId,
  workspaceId,
  isCompact = false,
  isHovered = false,
  onHoverChange,
  emojiPickerOpen = false,
  onEmojiPickerOpenChange,
  onReact,
  onPin,
  onEdit,
  onDelete,
  onReply,
  onMarkAsRead,
  onSaveForLater,
  isSavedForLater = false,
  savedLaterRemindAtIso = null,
  hideSaveForLaterUi = false,
  parentMessage = false,
  hideReplyButton = false,
  isInsideThreadPanel = false,
  isFocused = false,
  isTemporaryHighlight = false,
  onFocus,
  hideThreadReplyBar = false,
  fromThreadPage = false,
  isMember,
  fromPublicChannel,
}: MessageItemProps) {

  // Lấy data từ Store dựa vào ID
  const storeMessage = useMessageStore(
    useCallback((state) => (messageId ? state.entities[messageId] : undefined), [messageId])
  );

  // Fallback về data truyền vào props nếu Store chưa có
  const message = storeMessage || initialMessage;

  const memberOverlay = useWorkspaceMemberOverlay(workspaceId, message?.user?.id);
  const displayUser = useMemo(
    () => (message ? mergeUserForDisplay(message.user, memberOverlay) : null),
    [message, memberOverlay],
  );

  const { open: openProfilePanel } = useProfilePanelStore();
  const { setFocusedMessageId } = useMessageFocusStore();
  const [isEditing, setIsEditing] = useState(false);
  const [moreActionPopoverOpen, setMoreActionPopoverOpen] = useState(false);

  const {
    isRemindMeOpen,
    setIsRemindMeOpen,
    remindInMinutes,
    remindInHours,
    remindTomorrow,
    remindNextMonday,
    isPending: isRemindPending,
  } = useRemindMe();

  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [deletedAttachmentIds, setDeletedAttachmentIds] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);
  const { uploadFileBinary } = useFileUpload();

  /** File chỉnh sửa được trong editor — loại attachment thuộc forward quote. */
  const editableBodyAttachments = useMemo(
    () =>
      (message?.attachments ?? []).filter(
        (att) =>
          att.originScope !== "forward_quote" &&
          !deletedAttachmentIds.includes(att.id),
      ),
    [message?.attachments, deletedAttachmentIds],
  );

  const { mutate: updateMessage, isPending: isUpdatingMessage } = useUpdateMessage(
    message?.channelId || message?.conversationId || "",
    workspaceId,
  );

  const { theme } = useTheme();

  /**
   * Sanitize HTML từ Tiptap trước khi dangerouslySetInnerHTML
   * DOMPurify loại bỏ các script/XSS nguy hiểm nhưng giữ lại
   * formatting tags (bold, italic, ul, ol, code...)
   */
  const sanitizedContent = useMemo(() => {
    const content = message?.content ?? "";
    if (typeof window === "undefined") return content;
    return DOMPurify.sanitize(content, {
      ALLOWED_TAGS: [
        "p",
        "br",
        "strong",
        "em",
        "s",
        "u",
        "code",
        "pre",
        "ul",
        "ol",
        "li",
        "a",
        "blockquote",
        "span",
      ],
      ALLOWED_ATTR: ["href", "target", "rel", "class"],
    });
  }, [message?.content]);

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      if (!message) return;
      onReact?.(message.id, emojiData.emoji);
      onEmojiPickerOpenChange?.(message.id, false);
    },
    [message, onReact, onEmojiPickerOpenChange],
  );

  const handleEmojiPickerOpenChange = useCallback(
    (open: boolean) => {
      if (!message) return;
      onEmojiPickerOpenChange?.(message.id, open);
    },
    [message, onEmojiPickerOpenChange],
  );

  if (!message || !displayUser) return null;

  const isDeleted = !!message.deletedAt;
  /** Ẩn "đã chỉnh sửa" khi là system update (thay placeholder upload bằng content rỗng) */
  const isFileOnlyPlaceholder =
    message.attachments?.length &&
    (message.content === "<p></p>" ||
      message.content.trim() === "<p></p>" ||
      message.content === "<p>📎</p>");
  const isEdited = !!message.editedAt && !isFileOnlyPlaceholder;

  const isOwner = displayUser.id === currentUserId;

  /** Placeholder khi đang upload file — ẩn nếu đã có attachments */
  const isUploadPlaceholder =
    message.content.includes("Đang tải file") ||
    message.content.includes("Tải file thất bại");

  /** Content rỗng (file-only message) — không hiển thị */
  const isEmptyContent =
    message.content === "<p></p>" || message.content.trim() === "<p></p>";

  /** Ẩn content khi có attachments và content là placeholder/rỗng */
  const shouldShowContent =
    message.content.includes("Tải file thất bại") ||
    !(message.attachments?.length && (isUploadPlaceholder || isEmptyContent));

  const isForwardedMessage = Boolean(message.forwardSnapshot);

  const hasReacted = (reaction: Reaction) =>
    reaction.userIds.includes(currentUserId);

  if (isDeleted) {
    return <DeletedMessage />;
  }

  /** Tin carrier (upload folder, v.v.) — không render trong timeline */
  if (message.type === "system") {
    return null;
  }

  const isTimelineRoot =
    message.type === "timeline" ||
    (message.type === "text" &&
      message.allowEdit === false &&
      !message.parentId);

  return (
    <div
      className={cn(
        "group relative flex flex-col px-4 transition-colors",
        isCompact ? "py-0.5" : "py-1.5",
        isTemporaryHighlight ||
          message.isPinned ||
          (message.alsoSendToChannel && message.parentId && isInsideThreadPanel)
          ? "bg-[#FDF9F0] dark:bg-[#22221f] hover:bg-[#F9F3EA] dark:hover:bg-[#2a2a26]"
          : "hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#222529]",
      )}
      onMouseEnter={() => {
        onHoverChange?.(message.id, true);
        if (isFocused || isTemporaryHighlight) {
          onFocus?.(""); // Reset highlight/focus khi hover vào
        }
      }}
      onMouseLeave={() => onHoverChange?.(message.id, false)}
      onClick={() => {
        onFocus?.(message.id);
        if ((message as any).isUnread && onMarkAsRead) {
          onMarkAsRead(message.id);
        }
      }}
    >
      {isSavedForLater && !hideSaveForLaterUi && (
        <div className="flex items-center gap-1.5 mb-1 text-[13px] font-semibold text-[#36C5F0] w-full min-w-0 flex-wrap">
          <MdBookmark size={18} className="shrink-0" aria-hidden />
          <span>Saved for later</span>
          {(() => {
            const dueLine = savedLaterRemindAtIso
              ? savedLaterDueLabelFromIso(savedLaterRemindAtIso)
              : null;
            if (!dueLine) return null;
            return (
              <>
                <span className="shrink-0 opacity-90" aria-hidden>
                  ·
                </span>
                <span className="min-w-0">{dueLine}</span>
              </>
            );
          })()}
        </div>
      )}

      <div className="relative flex w-full min-w-0 gap-x-2">
      {/* Cột trái: Avatar hoặc timestamp nhỏ (compact mode) */}
      <div className="w-9 shrink-0 flex justify-center">
        {isCompact ? (
          /* Compact: chỉ hiện giờ khi hover */
          <span
            className={`text-[11px] dark:text-[#797c81] mt-0.5 transition-opacity ${isHovered ? "opacity-100" : "opacity-0"
              }`}
          >
            {formatCompactTime(message.createdAt)}
          </span>
        ) : (
          <div
            className=""
            onClick={(e) => {
              e.stopPropagation();
              openProfilePanel({ userData: displayUser, workspaceId });
            }}
          >
            <Avatar
              src={displayUser.avatar ?? ""}
              className="w-9 h-9 rounded-lg cursor-pointer mt-0.5"
              alt={displayUser.displayName ?? displayUser.email}
            />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        {/* Shared to channel indicator (CHỈ hiện trong context Thread Panel) */}
        {isInsideThreadPanel &&
          message.alsoSendToChannel &&
          message.parentId && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                setFocusedMessageId(message.id);
              }}
              className="flex items-center gap-1.5 mb-0.5 text-[#797c81] dark:text-[#ababad] cursor-pointer hover:underline w-fit"
            >
              <div className="flex items-center gap-0.5">
                <LuHash size={14} className="text-[#1d9bd1] stroke-3" />
                <LuUndo2 size={10} className="stroke-3 -translate-y-px" />
              </div>
              <span className="text-[12px] font-medium leading-none">
                Also sent to the channel
              </span>
            </div>
          )}

        {/* Header: tên + timestamp (chỉ non-compact) */}
        {!isCompact && displayUser && (
          <div className="flex items-center gap-x-2 mb-0.5 flex-wrap">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[15px] font-bold cursor-pointer hover:underline truncate"
                onClick={(e) => {
                  e.stopPropagation();
                  openProfilePanel({ userData: displayUser, workspaceId });
                }}
              >
                {displayUser.displayName ?? displayUser.email}
              </span>
              <UserStatusEmojiInline
                statusEmoji={displayUser.statusEmoji}
                statusText={displayUser.statusText}
                emojiClassName="text-[15px]"
              />
            </div>
            <span className="text-[11px] dark:text-[#797c81] shrink-0">
              {formatTimestamp(message.createdAt)}
            </span>
            {(message as any).isUnread && (
              <div className="w-2 h-2 rounded-full bg-blue-500" />
            )}

            {message.isPinned && (
              <div className="flex items-center gap-1 text-[11px] text-[#797c81]">
                <RiPushpinLine size={12} className="fill-[#797c81]" />
                <span>Pinned</span>
              </div>
            )}
          </div>
        )}

        {/* Pinned indicator for compact mode */}
        {isCompact && message.isPinned && (
          <div className="flex items-center gap-1 mb-0.5">
            <RiPushpinLine size={12} className="text-[#797c81]" />
            <span className="text-[11px] text-[#797c81]">Pinned</span>
          </div>
        )}

        {/* Replied to thread summary: HIỆN ở Channel Timeline (isInsideThreadPanel=false) cho tin shared */}
        {!isInsideThreadPanel &&
          message.parentId &&
          message.alsoSendToChannel &&
          !parentMessage && (
            <div className="flex items-center gap-1 mb-0.5 text-[14px]">
              <span className="text-[#797c81]">replied to a thread:</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onFocus?.(message.id);
                  if (message.parentId) {
                    onReply?.(
                      {
                        ...message,
                        id: message.parentId,
                        parentId: null,
                        content: message.parent?.content || "",
                        attachments: message.parent?.attachments || [],
                        reactions: [],
                        replyCount: 0,
                      } as any as Message,
                      message.id,
                    );
                  }
                }}
                className="text-[#1d9bd1] font-bold hover:underline truncate max-w-[400px] text-left"
              >
                {getPlainText(message.parent?.content || "") ||
                  message.parent?.attachments?.[0]?.name ||
                  "thread"}
              </button>
            </div>
          )}

        {/* Nội dung message / Editor khi edit */}
        {isEditing ? (
          <div className="w-full mt-1">
            <Editor
              variant="update"
              workspaceId={workspaceId}
              initialContent={message.content}
              onCancel={() => {
                setIsEditing(false);
                setPendingFiles([]);
                setDeletedAttachmentIds([]);
              }}
              onSubmit={async (content) => {
                try {
                  setIsUploading(true);
                  // 1. Upload new files if any
                  let newAttachments: any[] = [];
                  if (pendingFiles.length > 0) {
                    newAttachments = await Promise.all(
                      pendingFiles.map((pf) => uploadFileBinary(pf.file))
                    );
                  }

                  // 2. Call update mutation
                  updateMessage({
                    messageId: message.id,
                    content,
                    attachments: newAttachments,
                    deletedAttachmentIds,
                    parentId: message.parentId || undefined,
                  }, {
                    onSuccess: () => {
                      setIsEditing(false);
                      setPendingFiles([]);
                      setDeletedAttachmentIds([]);
                      setIsUploading(false);
                    },
                    onError: () => {
                      setIsUploading(false);
                    }
                  });
                } catch (error) {
                  console.error("Failed to update message:", error);
                  setIsUploading(false);
                }
              }}
              disabled={isUpdatingMessage || isUploading}
              pendingFiles={pendingFiles}
              onRemoveFile={(id) => setPendingFiles(prev => prev.filter(f => f.id !== id))}
              onFileAttach={(files) => {
                const newItems: PendingFile[] = files.map((file) => ({
                  id: Math.random().toString(36).substring(7),
                  file,
                }));
                setPendingFiles((prev) => [...prev, ...newItems]);
              }}
              existingAttachments={editableBodyAttachments}
              onRemoveExistingAttachment={(id) => setDeletedAttachmentIds(prev => [...prev, id])}
            />
          </div>
        ) : (
          shouldShowContent && (
            <div className="flex items-center gap-1">
              <div
                className={`text-[15px] leading-relaxed message-content ${isDeleted ? "text-[#797c81] italic" : "dark:text-[#d1d2d3]"
                  }`}
                dangerouslySetInnerHTML={{
                  __html: isDeleted ? "Message deleted" : sanitizedContent,
                }}
              />
              {isEdited && (
                <span className="text-[11px] text-[#797c81]">(edited)</span>
              )}
            </div>
          )
        )}

        {isForwardedMessage ? (
          <div
            className={
              isEditing
                ? "pointer-events-none select-none opacity-90"
                : undefined
            }
            aria-readonly={isEditing ? true : undefined}
          >
            <ForwardedMessageTimelineBlock
              message={message}
              workspaceId={workspaceId}
            />
          </div>
        ) : null}

        {/* Attachments — hiển thị files/images/videos (forward: chỉ trong khối quote) */}
        {!isEditing &&
          message.attachments &&
          message.attachments.length > 0 &&
          !isForwardedMessage && (
          <>
            <AttachmentList
              message={message}
              attachments={message.attachments}
              onDownload={(url, name) => {
                // Download file
                const a = document.createElement("a");
                a.href = url;
                a.download = name;
                a.click();
              }}
            />
          </>
        )}

        {/* Reactions bar */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={(e) => {
                  e.stopPropagation();
                  onReact?.(message.id, reaction.emoji);
                }}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border transition-colors ${hasReacted(reaction)
                    ? "bg-[#1d9bd1]/20 border-[#1d9bd1]/50 text-[#1d9bd1]"
                    : "dark:bg-[#2a2d31] border-[#797c814d] dark:text-[#d1d2d3] hover:border-[#797c81]"
                  }`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}

        {/* Thread reply bar */}
        {message.replyCount > 0 &&
          !message.parentId &&
          !parentMessage &&
          !hideThreadReplyBar &&
          !isTimelineRoot && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onReply?.(message);
              }}
              className="flex items-center gap-2 mt-1 px-1 py-1 rounded-md hover:bg-[#797c811a] border border-transparent hover:border-[#797c814d] group/reply cursor-pointer w-fit transition-all"
            >
              <div className="flex -space-x-1.5 overflow-hidden">
                {message.replyParticipantIds &&
                  message.replyParticipantIds.length > 0 ? (
                  message.replyParticipantIds.map((userId) => (
                    <ThreadParticipantAvatar
                      key={userId}
                      userId={userId}
                      workspaceId={workspaceId}
                    />
                  ))
                ) : (
                  <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center text-[10px] text-white font-bold border-2 border-white dark:border-[#1A1D21]">
                    {message.replyCount}
                  </div>
                )}
              </div>
              <Typography className="text-xs text-[#1d9bd1] hover:underline">
                {message.replyCount}{" "}
                {message.replyCount === 1 ? "reply" : "replies"}
              </Typography>
              <Typography className="text-xs text-[#797c81]">
                Last reply{" "}
                {message.lastReplyAt
                  ? formatTimestamp(message.lastReplyAt)
                  : ""}
              </Typography>
            </div>
          )}
      </div>

      {/* Hover action toolbar — xuất hiện khi hover, highlight hoặc đang mở emoji picker */}
      {(isHovered || isFocused || emojiPickerOpen) && (
        <div className="absolute right-4 top-0 -translate-y-1/4 flex items-center gap-0.5 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10">
          {/* React với emoji — Popover (portal) giữ picker khi di chuột ra ngoài */}
          <Popover
            open={emojiPickerOpen}
            onOpenChange={handleEmojiPickerOpenChange}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className={TOOLBAR_ITEM_STYLE}>
                    <MdOutlineAddReaction
                      size={20}
                      className={ICON_TRANSITION}
                    />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Add reaction</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="top"
              align="end"
              sideOffset={8}
              className="w-auto p-0 border-none bg-transparent"
              withOverlay={true}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <EmojiPicker
                onEmojiClick={handleEmojiSelect}
                theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                width={320}
                height={380}
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </PopoverContent>
          </Popover>

          {fromThreadPage && !isTimelineRoot && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onReply?.(message);
                  }}
                  className={TOOLBAR_ITEM_STYLE}
                >
                  <LuHash size={20} className={ICON_TRANSITION} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Open in channel</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Reply */}
          {isMember === false && fromPublicChannel
            ? null
            : !hideReplyButton && !isTimelineRoot && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onReply?.(message);
                    }}
                    className={TOOLBAR_ITEM_STYLE}
                  >
                    <BiMessageRoundedDetail
                      size={20}
                      className={ICON_TRANSITION}
                    />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <p className="text-xs">Reply in thread</p>
                </TooltipContent>
              </Tooltip>
            )}

          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={TOOLBAR_ITEM_STYLE}
                onClick={(e) => {
                  e.stopPropagation();
                  setForwardDialogOpen(true);
                }}
              >
                <RiShareForwardLine size={20} className={ICON_TRANSITION} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Forward message</p>
            </TooltipContent>
          </Tooltip>

          {!hideSaveForLaterUi && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className={TOOLBAR_ITEM_STYLE}
                onClick={(e) => {
                  e.stopPropagation();
                  onSaveForLater?.(message.id);
                }}
              >
                {isSavedForLater ? (
                  <MdBookmark
                    size={20}
                    className={cn(ICON_TRANSITION, "text-[#36C5F0]")}
                  />
                ) : (
                  <MdBookmarkBorder size={20} className={ICON_TRANSITION} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">
                {isSavedForLater ? "Remove from Later" : "Save for later"}
              </p>
            </TooltipContent>
          </Tooltip>
          )}

          {/* More actions */}
          <Popover
            open={moreActionPopoverOpen}
            onOpenChange={setMoreActionPopoverOpen}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <p
                    className={TOOLBAR_ITEM_STYLE}
                    onClick={(e) => {
                      e.stopPropagation();
                      // onMoreActions?.()
                    }}
                  >
                    <MdMoreVert size={20} className={ICON_TRANSITION} />
                  </p>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">More actions</p>
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="left"
              align="start"
              sideOffset={8}
              className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
              withOverlay={true}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="py-2 ">
                <div className="flex flex-col space-y-1">
                  {isOwner && !isDeleted && (message.allowEdit ?? true) && (
                    <>
                      <div
                        className={MENU_ITEM_STYLE}
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsEditing(true);
                          setMoreActionPopoverOpen(false);
                        }}
                      >
                        <LuPencil size={16} />
                        <Typography
                          variant="p"
                          text="Edit message"
                          className="text-[15px]"
                        />
                      </div>
                      <Separator />
                    </>
                  )}

                  {isMember == false && fromPublicChannel ? null : (
                    <div className={MENU_ITEM_STYLE}>
                      <MdOutlineMarkChatUnread size={16} />
                      <Typography variant="p" text="Mark unread" />
                    </div>
                  )}

                  <div
                    onMouseEnter={() => setIsRemindMeOpen(true)}
                    onMouseLeave={() => setIsRemindMeOpen(false)}
                  >
                    <div
                      className={cn(
                        MENU_ITEM_STYLE,
                        "relative justify-between",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          data-qa="reminder"
                          aria-hidden="true"
                          className="size-4"
                        >
                          <path
                            fill="currentColor"
                            fillRule="evenodd"
                            d="M10 2.5a7.5 7.5 0 1 0 .455 14.986.75.75 0 0 1 .09 1.498Q10.275 19 10 19a9 9 0 1 1 8.852-7.364.75.75 0 1 1-1.476-.271Q17.5 10.7 17.5 10A7.5 7.5 0 0 0 10 2.5M15.975 13a.8.8 0 0 0-.618.267 1.04 1.04 0 0 0-.228.484c-.423.129-.736.398-.94.825-.21.443-.3 1.046-.312 1.814l-.659.66-.004.005c-.222.245-.282.557-.13.82.142.246.428.375.736.375h1.186a.99.99 0 0 0 .974.7c.32 0 .57-.125.742-.314.106-.115.178-.25.223-.386h1.184c.309 0 .595-.129.737-.375.151-.263.092-.575-.13-.82l-.005-.004-.657-.66c-.012-.77-.101-1.372-.313-1.815-.203-.428-.516-.696-.94-.825a1.04 1.04 0 0 0-.227-.484.8.8 0 0 0-.619-.267M10.75 5.75a.75.75 0 0 0-1.5 0v5.5h4.5a.75.75 0 0 0 0-1.5h-3z"
                            clipRule="evenodd"
                          ></path>
                        </svg>
                        <Typography variant="p" text="Remind me" />
                      </div>
                      <MdOutlineKeyboardArrowRight size={13} />
                    </div>
                    {isRemindMeOpen && (
                      <div className="absolute bottom-2 right-40 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] py-2 shadow-lg rounded-md z-50">
                        <div className={SUBMENU_ITEM_STYLE} onClick={() => { remindInMinutes(30, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                          <Typography variant="p" text="In 30 minutes" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE} onClick={() => { remindInHours(1, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                          <Typography variant="p" text="In 1 hour" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE} onClick={() => { remindInHours(3, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                          <Typography variant="p" text="In 3 hours" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE} onClick={() => { remindTomorrow({ type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                          <Typography variant="p" text="Tomorrow at 9:00 AM" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE} onClick={() => { remindNextMonday({ type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                          <Typography variant="p" text="Monday at 9:00 AM" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isMember == false && fromPublicChannel ? null : (
                    <div className={MENU_ITEM_STYLE}>
                      <FiBellOff size={16} />
                      <Typography
                        variant="p"
                        text="Turn off notifications for replies"
                      />
                    </div>
                  )}

                  <Separator />

                  <div className={MENU_ITEM_STYLE}>
                    <LuLink size={16} />
                    <Typography variant="p" text="Copy link" />
                  </div>
                  <div className={MENU_ITEM_STYLE}>
                    <RxText size={16} />
                    <Typography variant="p" text="Copy message" />
                  </div>

                  {isMember == false && fromPublicChannel ? null : (
                    <div
                      className={MENU_ITEM_STYLE}
                      onClick={(e) => {
                        e.stopPropagation();
                        onPin?.(message.id);
                      }}
                    >
                      <RiPushpinLine size={16} />
                      <Typography
                        variant="p"
                        text={
                          message.isPinned
                            ? "Unpin from channel"
                            : "Pin to channel"
                        }
                      />
                    </div>
                  )}

                  {isOwner && !isDeleted && (
                    <>
                      <Separator />
                      <div
                        className={cn(
                          MENU_ITEM_STYLE,
                          "text-red-500 hover:text-white hover:bg-red-700 cursor-pointer ",
                        )}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDelete?.(message.id);
                        }}
                      >
                        <LuTrash2 size={16} />
                        <Typography
                          variant="p"
                          text="Delete message"
                          className="mt-0.5 "
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      )}

      </div>

      <ForwardMessageDialog
        open={forwardDialogOpen}
        onOpenChange={setForwardDialogOpen}
        workspaceId={workspaceId}
        message={message}
      />
    </div>
  );
}
