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
import { useFileUpload } from "@/hooks/use-file-upload";
import { useUpdateMessage } from "@/hooks/use-messages";
import { useRemindMe } from "@/hooks/use-saved-items";
import type { Message, User } from "@/lib/types";
import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceCustomEmojis } from "@/hooks/use-workspace-custom-emojis";
import {
  buildCustomEmojiLookup,
  extractCustomEmojiName,
  formatCustomEmojiShortcode,
  replaceCustomEmojiShortcodesInHtml,
  toPickerCustomEmojis,
} from "@/lib/custom-emojis";
import { sanitizeRenderedRichText } from "@/lib/sanitize-rich-text";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { useMessageStore } from "@/stores/useMessageStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { format, formatDistanceToNowStrict, isPast } from "date-fns";
import { useCallback, useMemo, useState } from "react";
import { LuLink, LuPencil, LuTrash2, LuUndo2 } from "react-icons/lu";
import Editor, { PendingFile } from "./editor";

import { getMemberStatusApi } from "@/apis";

// Dynamic import EmojiPicker Ä‘á»ƒ trÃ¡nh SSR
import { ForwardedMessageTimelineBlock } from "@/components/workspace/forwarded-message-timeline";
import { ICON_TRANSITION, MENU_ITEM_STYLE, SUBMENU_ITEM_STYLE, TOOLBAR_ITEM_STYLE } from "@/constants/styles";
import { formatTimestamp } from "@/helpers/format-time-stamp";
import { cn } from "@/lib/utils";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useQuery } from "@tanstack/react-query";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { BiMessageRoundedDetail } from "react-icons/bi";
import { FiBellOff, FiHash } from "react-icons/fi";
import { MdOutlineLock } from "react-icons/md";
import {
  MdBookmark,
  MdBookmarkBorder,
  MdMoreVert,
  MdOutlineAddReaction,
  MdOutlineKeyboardArrowRight,
  MdOutlineMarkChatUnread,
} from "react-icons/md";
import { RiHeadphoneLine, RiPushpinLine, RiShareForwardLine } from "react-icons/ri";
import { RxText } from "react-icons/rx";
import { useShallow } from "zustand/react/shallow";
import { ForwardMessageDialog } from "./dialogs/forward-message-dialog";
import { MessageReactions } from "./message-reactions";
import {
  highlightSearchExcerpt,
} from "./message-search-excerpt";
import { Separator } from "./ui/separator";
import Typography from "./ui/typography";
import { UserStatusEmojiInline } from "./user-status-emoji-inline";
import type { WorkspaceMessageSearchLocation } from "@/lib/types";
import { Button } from "./ui/button";
import { toast } from "sonner";
import type { HuddleMessageSnapshot } from "@/lib/huddle";
const EmojiPicker = dynamic(() => import("emoji-picker-react"));

const EMPTY_MEMBER_MAP = {} as const;

interface MessageItemProps {
  /** ID cá»§a tin nháº¯n Ä‘á»ƒ láº¥y dá»¯ liá»‡u tá»« Store (Æ¯u tiÃªn) */
  messageId?: string;
  /** Dá»¯ liá»‡u tin nháº¯n truyá»n trá»±c tiáº¿p (DÃ¹ng khi chÆ°a cÃ³ trong Store) */
  message?: Message;
  /** currentUserId Ä‘á»ƒ biáº¿t highlight reaction nÃ o lÃ  cá»§a mÃ¬nh */
  currentUserId: string;
  /** workspaceId dÃ¹ng Ä‘á»ƒ fetch workspace member status khi má»Ÿ ProfilePanel */
  workspaceId: string;
  /**
   * isCompact = true khi message liÃªn tiáº¿p cÃ¹ng user trong < 5 phÃºt
   * â†’ áº©n avatar + tÃªn, chá»‰ hiá»‡n timestamp nhá» bÃªn trÃ¡i (giá»‘ng Slack)
   */
  isCompact?: boolean;
  /** Hover state tá»« parent â€” trÃ¡nh duplicate toolbar khi lÆ°á»›t nhanh */
  isHovered?: boolean;
  onHoverChange?: (messageId: string, hovered: boolean) => void;
  /** Popover emoji Ä‘ang má»Ÿ â€” controlled tá»« parent */
  emojiPickerOpen?: boolean;
  /** Callback khi EmojiPicker open/close â€” giá»¯ toolbar hiá»ƒn thá»‹ khi picker má»Ÿ */
  onEmojiPickerOpenChange?: (messageId: string, open: boolean) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onPin?: (messageId: string) => void;
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message, highlightedMessageId?: string) => void;
  onJoinHuddle?: (message: Message) => void;
  onMarkAsRead?: (parentId: string) => void;
  onSaveForLater?: (messageId: string) => void;
  /** True when this message is in Later (in_progress) â€” filled bookmark + banner */
  isSavedForLater?: boolean;
  /**
   * When the user set a reminder on this saved message (Later `remindAt`), ISO string.
   * Shown in the banner after "Saved for later" (Slack-style "Due in â€¦").
   */
  savedLaterRemindAtIso?: string | null;
  /**
   * When true: hide the blue "Saved for later" row + bookmark save button
   * (e.g. message preview inside Later list â€” `saved-item` used by `later-side-panel`).
   */
  hideSaveForLaterUi?: boolean;

  parentMessage?: boolean;
  hideReplyButton?: boolean;
  /** DÃ¹ng Ä‘á»ƒ phÃ¢n biá»‡t Context: Channel Timeline hay Thread Panel */
  isInsideThreadPanel?: boolean;
  isFocused?: boolean;
  isTemporaryHighlight?: boolean;
  onFocus?: (messageId: string) => void;
  hideThreadReplyBar?: boolean;
  fromThreadPage?: boolean;
  isMember?: boolean;
  fromPublicChannel?: boolean;
  canReplyInThread?: boolean;
  searchResult?: boolean;
  searchResultActive?: boolean;
  searchQuery?: string;
  searchExcerpt?: string;
  searchLocation?: WorkspaceMessageSearchLocation;
  searchLocationPrefix?: string;
  searchLocationLabel?: string;
  onSearchOpen?: (message: Message) => void;
  onSearchOpenThread?: (message: Message) => void;
  selectedTextColor?: string;
  rowRef?: (node: HTMLDivElement | null) => void;
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

/** Component hiá»ƒn thá»‹ avatar cá»§a má»™t participant trong thread */
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

/** Format timestamp cho compact mode (chá»‰ giá») */
function formatCompactTime(dateStr: string): string {
  return format(new Date(dateStr), "HH:mm");
}

/** Tiá»‡n Ã­ch láº¥y plaintext tá»« HTML (cho snippet tin nháº¯n cha) */
function getPlainText(html: string): string {
  if (!html) return "";
  // Loáº¡i bá» tags, giá»¯ text content
  return html.replace(/<[^>]*>?/gm, "").trim();
}

/** Wall-clock relative copy for the Later banner (not memoized â€” needs current time). */
function savedLaterDueLabelFromIso(
  remindAtIso: string,
  isIncomplete: boolean,
): string | null {
  const d = new Date(remindAtIso);
  if (Number.isNaN(d.getTime())) return null;
  if (isIncomplete && isPast(d)) {
    return `Incomplete Â· ${formatDistanceToNowStrict(d, { addSuffix: true })}`;
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
  onJoinHuddle,
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
  canReplyInThread = true,
  searchResult = false,
  searchResultActive = false,
  searchQuery,
  searchExcerpt,
  searchLocation,
  searchLocationPrefix,
  searchLocationLabel,
  onSearchOpen,
  onSearchOpenThread,
  selectedTextColor,
  rowRef,
}: MessageItemProps) {

  // Láº¥y data tá»« Store dá»±a vÃ o ID
  const storeMessage = useMessageStore(
    useCallback((state) => (messageId ? state.entities[messageId] : undefined), [messageId])
  );

  // Fallback vá» data truyá»n vÃ o props náº¿u Store chÆ°a cÃ³
  const message = storeMessage || initialMessage;

  const memberOverlay = useWorkspaceMemberOverlay(workspaceId, message?.user?.id);
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? EMPTY_MEMBER_MAP),
  );
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

  /** File chá»‰nh sá»­a Ä‘Æ°á»£c trong editor â€” loáº¡i attachment thuá»™c forward quote. */
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
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: allCustomEmojis } = useWorkspaceCustomEmojis(workspaceId, {
    includeAliases: true,
  });
  const customEmojis = useMemo(
    () =>
      (allCustomEmojis ?? []).filter(
        (emoji) => !emoji.aliasOfId && !emoji.sourceDefaultEmoji,
      ),
    [allCustomEmojis],
  );
  const pickerCustomEmojis = useMemo(
    () => toPickerCustomEmojis(customEmojis),
    [customEmojis],
  );
  const customEmojiLookup = useMemo(
    () => buildCustomEmojiLookup(allCustomEmojis),
    [allCustomEmojis],
  );
  const oneClickReactionSlots = useMemo(() => {
    const rawSlots = workspace?.emojiOneClickSlots ?? [null, null, null];

    return rawSlots.map((slot, index) => {
      if (!slot) return null;

      const customName = extractCustomEmojiName(slot);
      const customEmoji = customName ? customEmojiLookup.get(customName) : null;

      return {
        key: `one-click-reaction-${index}`,
        value: slot,
        label: customName ? `:${customName}:` : slot,
        customEmoji,
      };
    });
  }, [customEmojiLookup, workspace?.emojiOneClickSlots]);

  /**
   * Sanitize HTML tá»« Tiptap trÆ°á»›c khi dangerouslySetInnerHTML
   * DOMPurify loáº¡i bá» cÃ¡c script/XSS nguy hiá»ƒm nhÆ°ng giá»¯ láº¡i
   * formatting tags (bold, italic, ul, ol, code...)
   */
  const sanitizedContent = useMemo(() => {
    const content = message?.content ?? "";
    const sanitized = sanitizeRenderedRichText(content);
    return replaceCustomEmojiShortcodesInHtml(sanitized, customEmojiLookup);
  }, [customEmojiLookup, message?.content]);

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      if (!message) return;
      const emojiValue = emojiData.isCustom
        ? formatCustomEmojiShortcode(emojiData.names[0] ?? emojiData.emoji)
        : emojiData.emoji;
      onReact?.(message.id, emojiValue);
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
  /** áº¨n "Ä‘Ã£ chá»‰nh sá»­a" khi lÃ  system update (thay placeholder upload báº±ng content rá»—ng) */
  const isFileOnlyPlaceholder =
    message.attachments?.length &&
    (message.content === "<p></p>" ||
      message.content.trim() === "<p></p>" ||
      message.content === "<p>ðŸ“Ž</p>");
  const isEdited = !!message.editedAt && !isFileOnlyPlaceholder;

  const isOwner = displayUser.id === currentUserId;

  /** Placeholder khi Ä‘ang upload file â€” áº©n náº¿u Ä‘Ã£ cÃ³ attachments */
  const isUploadPlaceholder =
    message.content.includes("Äang táº£i file") ||
    message.content.includes("Táº£i file tháº¥t báº¡i");

  /** Content rá»—ng (file-only message) â€” khÃ´ng hiá»ƒn thá»‹ */
  const isEmptyContent =
    message.content === "<p></p>" || message.content.trim() === "<p></p>";

  /** áº¨n content khi cÃ³ attachments vÃ  content lÃ  placeholder/rá»—ng */
  const shouldShowContent =
    message.content.includes("Táº£i file tháº¥t báº¡i") ||
    !(message.attachments?.length && (isUploadPlaceholder || isEmptyContent));

  const huddleSnapshot = (
    (message.huddleSnapshot ?? null) as HuddleMessageSnapshot | null
  );
  const isHuddleMessage = message.type === "huddle" && !!huddleSnapshot;
  const canEditMessage =
    isOwner && !isDeleted && (message.allowEdit ?? true) && !isHuddleMessage;
  const canDeleteMessage = isOwner && !isDeleted && !isHuddleMessage;

  const isForwardedMessage = Boolean(message.forwardSnapshot);
  const isTimelineRoot =
    message.type === "timeline" ||
    (message.type === "text" &&
      message.allowEdit === false &&
      !message.parentId);

  const getHuddleParticipantLabel = useCallback(
    (participant: HuddleMessageSnapshot["participants"][number]) => {
      if (participant.userId === currentUserId) return "You";
      if (participant.membershipStatus === "deactivated") {
        return "deactivated user";
      }

      const baseUser = {
        id: participant.userId,
        email: "",
        name: participant.name,
        displayName: participant.displayName,
        avatar: participant.avatar,
      } as User;
      const overlay = memberOverlayMap[participant.userId];
      const displayUser = mergeUserForDisplay(baseUser, overlay);

      return (
        displayUser.displayName?.trim() ||
        displayUser.name?.trim() ||
        "Participant"
      );
    },
    [currentUserId, memberOverlayMap],
  );

  const huddleSummary = useMemo(() => {
    if (!isHuddleMessage || !huddleSnapshot) return null;

    const activeParticipants = huddleSnapshot.participants.filter(
      (participant) => participant.leftAt === null,
    );
    const allParticipantIds = huddleSnapshot.participants.map((participant) => participant.userId);
    const viewerIsParticipant = allParticipantIds.includes(currentUserId);
    const viewerIsActive = activeParticipants.some(
      (participant) => participant.userId === currentUserId,
    );
    const activeOtherNames = activeParticipants
      .filter((participant) => participant.userId !== currentUserId)
      .map((participant) => getHuddleParticipantLabel(participant));
    const allOtherNames = huddleSnapshot.participants
      .filter((participant) => participant.userId !== currentUserId)
      .map((participant) => getHuddleParticipantLabel(participant));
    const uniqueActiveOtherNames = Array.from(
      new Set(activeOtherNames.filter(Boolean)),
    );
    const uniqueAllOtherNames = Array.from(
      new Set(allOtherNames.filter(Boolean)),
    );
    const live = huddleSnapshot.status !== "ended";
    const topic = huddleSnapshot.topic?.trim();
    const entityLabel = huddleSnapshot.entityLabel?.trim() || "Huddle";

    const joinNames = (names: string[]) => {
      if (names.length === 0) return ""
      if (names.length === 1) return names[0]
      if (names.length === 2) return `${names[0]} and ${names[1]}`
      return `${names.slice(0, 2).join(", ")} and ${names.length - 2} others`
    }

    if (!live) {
      const duration = (() => {
        if (!huddleSnapshot.startedAt || !huddleSnapshot.endedAt) return null
        const start = new Date(huddleSnapshot.startedAt).getTime()
        const end = new Date(huddleSnapshot.endedAt).getTime()
        if (Number.isNaN(start) || Number.isNaN(end) || end <= start) return null
        const minutes = Math.max(1, Math.round((end - start) / 60000))
        if (minutes < 60) return `${minutes}m`
        const hours = Math.max(1, Math.round(minutes / 60))
        return `${hours}h`
      })()

      const participantsText = joinNames(uniqueAllOtherNames)
      const namesText = participantsText || (viewerIsParticipant ? "" : "the group")
      const verb = viewerIsParticipant || participantsText ? "were" : "was"
      return {
        live,
        entityLabel,
        headline: topic ? `${topic} happened` : "A huddle happened",
        subtext: viewerIsParticipant
          ? participantsText
            ? `You and ${participantsText} were in the huddle${duration ? ` for ${duration}` : ""}.`
            : `You were in the huddle${duration ? ` for ${duration}` : ""}.`
          : `${namesText} ${verb} in the huddle${duration ? ` for ${duration}` : ""}.`,
        showJoin: false,
        badgeLabel: "ENDED",
      }
    }

    if (viewerIsActive) {
      return {
        live,
        entityLabel,
        headline: topic ? `You joined ${topic}` : "You joined the huddle",
        subtext:
          uniqueActiveOtherNames.length > 0
            ? `${joinNames(uniqueActiveOtherNames)} ${
                uniqueActiveOtherNames.length === 1 ? "is" : "are"
              } here too.`
            : "You're the only one here. Enjoy the tranquility, or invite someone.",
        showJoin: false,
        badgeLabel: "LIVE",
      }
    }

    return {
      live,
      entityLabel,
      headline: topic ? `${topic} is happening` : "A huddle is happening",
      subtext:
        uniqueActiveOtherNames.length > 0
          ? `${joinNames(uniqueActiveOtherNames)} ${
              uniqueActiveOtherNames.length === 1 ? "is" : "are"
            } already there.`
          : "No one is there yet. Be the first to join.",
      showJoin: true,
      badgeLabel: "LIVE",
    }
  }, [
    currentUserId,
    getHuddleParticipantLabel,
    huddleSnapshot,
    isHuddleMessage,
  ]);
  const isCompactForLayout = isHuddleMessage ? false : isCompact;

  if (isDeleted) {
    return <DeletedMessage />;
  }

  /** Tin carrier (upload folder, v.v.) â€” khÃ´ng render trong timeline */
  if (message.type === "system") {
    return null;
  }

  if (searchResult && searchLocation && searchExcerpt !== undefined) {
    const bodyHtml = highlightSearchExcerpt(sanitizedContent, searchQuery ?? "");
    const locationLabel =
      searchLocationLabel ??
      (searchLocation.kind === "channel"
        ? searchLocation.channelName
        : searchLocation.conversationLabel);
    const locationIcon =
      searchLocation.kind === "channel" ? (
        searchLocation.isPrivate ? (
          <MdOutlineLock size={14} />
        ) : (
          <FiHash size={14} />
        )
      ) : (
        <BiMessageRoundedDetail size={14} />
      );
    const author =
      displayUser.displayName ?? displayUser.name ?? displayUser.email ?? "User";
    const avatarLabel = (displayUser.displayName || displayUser.name || "U")
      .slice(0, 2)
      .toUpperCase();

    return (
      <div
        ref={rowRef}
        data-message-id={message.id}
        role="button"
        tabIndex={0}
        onClick={() => onSearchOpen?.(message)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onSearchOpen?.(message);
          }
        }}
        className={cn(
          "group w-full rounded-md border border-[#35373B] px-4 py-3 text-left transition-all hover:-translate-y-px",
          searchResultActive && "border-selection-hover bg-selection-hover/15 ring-1 ring-selection-hover/60",
        )}
      >
        <div className="flex items-start gap-3">
          {displayUser.avatar ? (
            <Avatar
              src={displayUser.avatar ?? ""}
              className="size-10 rounded-lg"
              alt={author}
            />
          ) : (
            <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#f2cd00] text-[11px] font-bold">
              {avatarLabel}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <div className="truncate text-[15px] font-bold leading-5">
                    {author}
                  </div>
                  <div className="flex min-w-0 items-center gap-1 truncate text-[15px] leading-5 ">
                    {searchLocationPrefix ? (
                      <span className="shrink-0 ">
                        {searchLocationPrefix}
                      </span>
                    ) : null}
                    <span className="shrink-0 ">{locationIcon}</span>
                    <span className="truncate">{locationLabel}</span>
                  </div>
                </div>
              </div>

              <div className="shrink-0 text-[12px] leading-5 text-[#a2a6ad]">
                {formatTimestamp(message.createdAt)}
              </div>
            </div>

            <div
              className={cn(
                "mt-1 text-[14px] leading-6",
                "[&_mark]:rounded-sm [&_mark]:bg-yellow-400/35 [&_mark]:px-0.5 [&_mark]:font-medium [&_mark]:text-yellow-50",
                "[&_a]:text-sky-300 [&_a]:underline",
              )}
              dangerouslySetInnerHTML={{ __html: bodyHtml }}
            />

            <div className="mt-3 space-y-2">
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

              {!isEditing &&
                message.attachments &&
                message.attachments.length > 0 &&
                !isForwardedMessage && (
                  <AttachmentList
                    message={message}
                    attachments={message.attachments}
                    onDownload={(url, name) => {
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = name;
                      a.click();
                    }}
                  />
                )}
            </div>

            <MessageReactions
              reactions={message.reactions}
              currentUserId={currentUserId}
              messageId={message.id}
              onReact={onReact}
              customEmojiLookup={customEmojiLookup}
              memberOverlayMap={memberOverlayMap}
            />

            {message.replyCount > 0 &&
              !message.parentId &&
              !parentMessage &&
              !hideThreadReplyBar &&
              !isTimelineRoot && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onSearchOpenThread?.(message);
                  }}
                  className="mt-2 flex w-fit cursor-pointer items-center gap-2 rounded-md border border-transparent px-1 py-1 transition-all hover:border-[#797c814d] hover:bg-[#797c811a]"
                >
                  <div className="flex -space-x-1.5 overflow-hidden">
                    {message.replyParticipantIds &&
                      message.replyParticipantIds.length > 0 ? (
                      message.replyParticipantIds.slice(0, 3).map((userId) => (
                        <ThreadParticipantAvatar
                          key={userId}
                          userId={userId}
                          workspaceId={workspaceId}
                        />
                      ))
                    ) : (
                      <div className="flex size-6 items-center justify-center rounded bg-blue-500 border-2 border-white text-[10px] font-bold text-white dark:border-[#1A1D21]">
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
                    {message.lastReplyAt ? formatTimestamp(message.lastReplyAt) : ""}
                  </Typography>
                </div>
              )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px] text-[#8f949b]">
              {message.isPinned ? <span>pinned</span> : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      data-message-id={message.id}
      className={cn(
        "group relative flex flex-col px-4 transition-colors",
        isCompactForLayout ? "py-0.5" : "py-1.5",
        isTemporaryHighlight ||
          message.isPinned ||
          (message.alsoSendToChannel && message.parentId && isInsideThreadPanel)
          ? "bg-[#FDF9F0] dark:bg-[#22221f] hover:bg-[#F9F3EA] dark:hover:bg-[#2a2a26]"
          : "hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#222529]",
      )}
      onMouseEnter={() => {
        onHoverChange?.(message.id, true);
        if (isFocused || isTemporaryHighlight) {
          onFocus?.(""); // Reset highlight/focus khi hover vÃ o
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
              ? savedLaterDueLabelFromIso(savedLaterRemindAtIso, isSavedForLater)
              : null;
            if (!dueLine) return null;
            return (
              <>
                <span className="shrink-0 opacity-90" aria-hidden>
                  Â·
                </span>
                <span className="min-w-0">{dueLine}</span>
              </>
            );
          })()}
        </div>
      )}

      <div className="relative flex w-full min-w-0 gap-x-2">
        {/* Cá»™t trÃ¡i: Avatar hoáº·c timestamp nhá» (compact mode) */}
        <div className="w-9 shrink-0 flex justify-center">
          {isCompactForLayout ? (
            /* Compact: chá»‰ hiá»‡n giá» khi hover */
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
                if (isHuddleMessage) return;
                e.stopPropagation();
                openProfilePanel({ userData: displayUser, workspaceId });
              }}
            >
              <div className="relative mt-0.5">
                {isHuddleMessage ? (
                  <div className="flex w-9 h-9 items-center justify-center rounded-lg bg-[#1a936f] text-white shadow-sm">
                    <RiHeadphoneLine size={18} />
                  </div>
                ) : (
                  <Avatar
                    src={displayUser.avatar ?? ""}
                    className="w-9 h-9 rounded-lg cursor-pointer"
                    alt={displayUser.displayName ?? displayUser.email}
                  />
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Shared to channel indicator (CHá»ˆ hiá»‡n trong context Thread Panel) */}
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
                  <FiHash size={14} className="text-[#1d9bd1] stroke-3" />
                  <LuUndo2 size={10} className="stroke-3 -translate-y-px" />
                </div>
                <span className="text-[12px] font-medium leading-none">
                  Also sent to the channel
                </span>
              </div>
            )}

          {/* Header: tÃªn + timestamp (chá»‰ non-compact) */}
          {!isCompactForLayout && !isHuddleMessage && displayUser && (
            <div className="flex items-center gap-x-2 mb-0.5 flex-wrap">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[15px] font-bold cursor-pointer hover:underline truncate"
                  style={selectedTextColor ? { color: selectedTextColor } : undefined}
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
              <span className="text-[11px] dark:text-[#797c81] shrink-0" style={selectedTextColor ? { color: selectedTextColor } : undefined}>
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

          {!isCompactForLayout && isHuddleMessage && huddleSummary ? (
            <div className="flex items-center gap-x-2 mb-0.5 flex-wrap">
              <div className="flex items-center gap-1 min-w-0">
                <span className="text-[15px] font-bold truncate">
                  {huddleSummary.headline}
                </span>
                <span
                  className={cn(
                    "rounded-full px-2 py-0.5 text-[10px] font-semibold leading-none",
                    huddleSummary.live
                      ? "bg-[#b8f4cb] text-[#0d4d25]"
                      : "bg-[#4b4f56] text-white",
                  )}
                >
                  {huddleSummary.badgeLabel}
                </span>
              </div>
              <span className="text-[11px] dark:text-[#797c81] shrink-0">
                {formatTimestamp(message.createdAt)}
              </span>
            </div>
          ) : null}

          {/* Pinned indicator for compact mode */}
          {isCompactForLayout && message.isPinned && (
            <div className="flex items-center gap-1 mb-0.5">
              <RiPushpinLine size={12} className="text-[#797c81]" />
              <span className="text-[11px] text-[#797c81]">Pinned</span>
            </div>
          )}

          {/* Replied to thread summary: HIá»†N á»Ÿ Channel Timeline (isInsideThreadPanel=false) cho tin shared */}
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

          {/* Ná»™i dung message / Editor khi edit */}
          {isHuddleMessage && huddleSummary ? (
            <div className="mt-1 rounded-[16px] bg-[#163524] px-4 py-3 text-white shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-[14px] font-medium leading-6 text-white/90">
                  {huddleSummary.subtext}
                </span>
              </div>
              {huddleSummary.showJoin ? (
                <Button
                  variant="ghost"
                  size="custom"
                  className="mt-3 inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#2ed190] bg-transparent px-4 text-[14px] font-semibold text-white hover:bg-[#2ed1901f]"
                  onClick={(e) => {
                    e.stopPropagation();
                    onJoinHuddle?.(message);
                  }}
                >
                  <RiHeadphoneLine size={16} />
                  Join Huddle
                </Button>
              ) : null}
            </div>
          ) : isEditing ? (
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
                  style={selectedTextColor && !isDeleted ? { color: selectedTextColor } : undefined}
                  dangerouslySetInnerHTML={{
                    __html: isDeleted ? "Message deleted" : sanitizedContent,
                  }}
                />
                {isEdited && (
                  <span className="text-[11px] text-[#797c81]" style={selectedTextColor ? { color: selectedTextColor } : undefined}>(edited)</span>
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

          {/* Attachments â€” hiá»ƒn thá»‹ files/images/videos (forward: chá»‰ trong khá»‘i quote) */}
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

          <MessageReactions
            reactions={message.reactions}
            currentUserId={currentUserId}
            messageId={message.id}
            onReact={onReact}
            customEmojiLookup={customEmojiLookup}
            memberOverlayMap={memberOverlayMap}
          />

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

        {/* Hover action toolbar â€” xuáº¥t hiá»‡n khi hover, highlight hoáº·c Ä‘ang má»Ÿ emoji picker */}
        {(isHovered || isFocused || emojiPickerOpen) && (
          <div className="absolute right-4 top-0 -translate-y-1/4 flex items-center gap-0.5 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10">
            {oneClickReactionSlots.map((slot) =>
              slot ? (
                <Tooltip key={slot.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className={cn(TOOLBAR_ITEM_STYLE, "text-sm leading-none")}
                      onClick={(e) => {
                        e.stopPropagation();
                        onReact?.(message.id, slot.value);
                      }}
                    >
                      {slot.customEmoji ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={slot.customEmoji.imageUrl}
                          alt={slot.label}
                          className="h-4 w-4 object-contain"
                        />
                      ) : (
                        <span>{slot.value}</span>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">React with {slot.label}</p>
                  </TooltipContent>
                </Tooltip>
              ) : null,
            )}

            {/* React vá»›i emoji â€” Popover (portal) giá»¯ picker khi di chuá»™t ra ngoÃ i */}
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
                  customEmojis={pickerCustomEmojis}
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
                    <FiHash size={20} className={ICON_TRANSITION} />
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
              : !hideReplyButton &&
              !isTimelineRoot &&
              canReplyInThread && (
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
                    {canEditMessage && (
                      <>
                        <Button
                          variant="submenu"
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
                        </Button>
                        <Separator />
                      </>
                    )}

                    {isMember == false && fromPublicChannel ? null : (
                      <Button
                        variant="submenu"
                      >
                        <MdOutlineMarkChatUnread size={16} />
                        <Typography variant="p" text="Mark unread" />
                      </Button>
                    )}

                    {!isHuddleMessage && (
                      <div
                        onMouseEnter={() => setIsRemindMeOpen(true)}
                        onMouseLeave={() => setIsRemindMeOpen(false)}
                      >
                        <Button
                          variant="checkedMenu"
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
                        </Button>
                        {isRemindMeOpen && (
                          <div className="absolute bottom-15 right-65 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] py-2 shadow-lg rounded-md z-50">
                            <Button variant="submenu" onClick={() => { remindInMinutes(30, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                              <Typography variant="p" text="In 30 minutes" />
                            </Button>
                            <Button variant="submenu" onClick={() => { remindInHours(1, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                              <Typography variant="p" text="In 1 hour" />
                            </Button>
                            <Button variant="submenu" onClick={() => { remindInHours(3, { type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                              <Typography variant="p" text="In 3 hours" />
                            </Button>
                            <Button variant="submenu" onClick={() => { remindTomorrow({ type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                              <Typography variant="p" text="Tomorrow at 9:00 AM" />
                            </Button>
                            <Button variant="submenu" onClick={() => { remindNextMonday({ type: 'message', messageId: message.id }); setMoreActionPopoverOpen(false); }}>
                              <Typography variant="p" text="Monday at 9:00 AM" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}

                    {isMember == false && fromPublicChannel ? null : (
                      <Button
                        variant="submenu"
                      >
                        <FiBellOff size={16} />
                        <Typography
                          variant="p"
                          text="Turn off notifications for replies"
                        />
                      </Button>
                    )}

                    <Separator />
                    <Button
                      variant="submenu"
                      onClick={(e) => {
                        e.stopPropagation();
                        const link = new URL(window.location.href);
                        link.searchParams.set("messageId", message.id);
                        navigator.clipboard.writeText(link.toString());
                        toast.success("Link copied to clipboard");
                        setMoreActionPopoverOpen(false);
                      }}
                    >
                      <LuLink size={16} />
                      <Typography variant="p" text="Copy link" />
                    </Button>

                    <Button variant="submenu"
                    onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(message.content)
                    toast.success("Message copied to clipboard")
                  }}
                    >
                      <RxText size={16} />
                      <Typography variant="p" text="Copy message" />
                    </Button>

                    {isMember == false && fromPublicChannel ? null : (
                      <Button
                        variant="submenu"
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
                      </Button>
                    )}

                    {canDeleteMessage && (
                      <>
                        <Separator />
                        <Button
                          variant="submenu"
                          className={cn(
                            "text-red-400! hover:text-white! hover:bg-red-700!",
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
                        </Button>
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

