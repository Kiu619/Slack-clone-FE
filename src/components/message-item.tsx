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
import { format } from "date-fns";
import DOMPurify from "dompurify";
import { useCallback, useMemo, useState } from "react";
import {
  LuEllipsis,
  LuLink,
  LuLink2,
  LuPencil,
  LuReply,
  LuSmile,
  LuTrash2,
} from "react-icons/lu";
import { ArrowLeft } from "lucide-react";
import Editor from "./editor";

// Dynamic import EmojiPicker để tránh SSR
import { formatTimestamp } from "@/helpers/format-time-stamp";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";
import {
  MdBookmarkBorder,
  MdMoreVert,
  MdOutlineAddReaction,
  MdOutlineKeyboardArrowRight,
  MdOutlineMarkChatUnread,
} from "react-icons/md";
import { BiMessageRoundedDetail } from "react-icons/bi";
import { RiOrganizationChart, RiShareForwardLine } from "react-icons/ri";
import Typography from "./ui/typography";
import { Separator } from "./ui/separator";
import { cn } from "@/lib/utils";
import { FiBellOff } from "react-icons/fi";
import { RxText } from "react-icons/rx";
import ProfilePanel from "@/modules/profile/profile-panel";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useTheme } from "next-themes";
const EmojiPicker = dynamic(() => import("emoji-picker-react"));

interface MessageItemProps {
  message: Message;
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
  onEdit?: (message: Message) => void;
  onDelete?: (messageId: string) => void;
  onReply?: (message: Message) => void;
}

/** Format timestamp cho compact mode (chỉ giờ) */
function formatCompactTime(dateStr: string): string {
  return format(new Date(dateStr), "HH:mm");
}

const TOOLBAR_ITEM_STYLE =
  "cursor-pointer p-1.5 rounded dark:hover:bg-[#222529] text-[#797c81]"
const MENU_ITEM_STYLE =
  "flex items-center gap-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm";
const SUBMENU_ITEM_STYLE =
  "hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm";
const ICON_TRANSITION = "hover:scale-115 transition-all duration-300"
export default function MessageItem({
  message,
  currentUserId,
  workspaceId,
  isCompact = false,
  isHovered = false,
  onHoverChange,
  emojiPickerOpen = false,
  onEmojiPickerOpenChange,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: MessageItemProps) {
  const { open: openProfilePanel } = useProfilePanelStore()
  const [isEditing, setIsEditing] = useState(false);
  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false);
  const [isRemindMeOpen, setIsRemindMeOpen] = useState(false);

  const { theme } = useTheme()

  const isDeleted = !!message.deletedAt;
  /** Ẩn "đã chỉnh sửa" khi là system update (thay placeholder upload bằng content rỗng) */
  const isFileOnlyPlaceholder =
    message.attachments?.length &&
    (message.content === "<p></p>" ||
      message.content.trim() === "<p></p>" ||
      message.content === "<p>📎</p>");
  const isEdited = !!message.editedAt && !isFileOnlyPlaceholder;

  const isOwner = message.user.id === currentUserId;

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

  /**
   * Sanitize HTML từ Tiptap trước khi dangerouslySetInnerHTML
   * DOMPurify loại bỏ các script/XSS nguy hiểm nhưng giữ lại
   * formatting tags (bold, italic, ul, ol, code...)
   */
  const sanitizedContent = useMemo(() => {
    if (typeof window === "undefined") return message.content;
    return DOMPurify.sanitize(message.content, {
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
  }, [message.content]);

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      onReact?.(message.id, emojiData.emoji);
      onEmojiPickerOpenChange?.(message.id, false);
    },
    [message.id, onReact, onEmojiPickerOpenChange],
  );

  const handleEmojiPickerOpenChange = useCallback(
    (open: boolean) => {
      onEmojiPickerOpenChange?.(message.id, open);
    },
    [message.id, onEmojiPickerOpenChange],
  );

  /** Kiểm tra current user đã react emoji này chưa */
  const hasReacted = (reaction: Reaction) =>
    reaction.userIds.includes(currentUserId);

  if (isDeleted) {
    return (
      <div className="px-4 py-1 opacity-50">
        <span className="text-[13px] dark:text-[#797c81] italic">
          [Message deleted]
        </span>
      </div>
    );
  }

  /** Tin carrier (upload folder, v.v.) — không render trong timeline */
  if (message.type === "system") {
    return null;
  }

  return (
    <div
      className={`group relative flex gap-x-2 px-4 hover:bg-[rgba(232,226,226,0.4)] dark:hover:bg-[#222529] transition-colors ${isCompact ? "py-0.5" : "py-1.5"
        }`}
      onMouseEnter={() => onHoverChange?.(message.id, true)}
      onMouseLeave={() => onHoverChange?.(message.id, false)}
    >
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
          <div className=""
            onClick={() => {
              openProfilePanel({ userData: message.user, workspaceId })
            }}
          >
            <Avatar
              src={message.user.avatar ?? ""}
              className="w-9 h-9 rounded-lg cursor-pointer mt-0.5"
              alt={message.user.displayName ?? message.user.email}
            />
          </div>
        )}
      </div>

      {/* Cột phải: nội dung */}
      <div className="flex-1 min-w-0">
        {/* Header: tên + timestamp (chỉ non-compact) */}
        {!isCompact && (
          <div className="flex items-baseline gap-x-2 mb-0.5">
            <span className="text-[15px] font-bold  cursor-pointer hover:underline">
              {message.user.displayName ?? message.user.email}
            </span>
            <span className="text-[11px] dark:text-[#797c81]">
              {formatTimestamp(message.createdAt)}
            </span>
            {isEdited && (
              <span className="text-[11px] dark:text-[#797c81]">
                (edited)
              </span>
            )}
          </div>
        )}

        {/* Nội dung message / Editor khi edit */}
        {isEditing ? (
          <div className="w-full mt-1">
            <Editor
              variant="update"
              initialContent={message.content}
              onCancel={() => setIsEditing(false)}
              onSubmit={(content) => {
                onEdit?.({ ...message, content });
                setIsEditing(false);
              }}
              disabled={false}
            />
          </div>
        ) : (
          shouldShowContent && (
            <div
              className={`text-[15px] leading-relaxed message-content ${isDeleted ? 'text-[#797c81] italic' : 'dark:text-[#d1d2d3]'
                }`}
              dangerouslySetInnerHTML={{
                __html: isDeleted ? "Message deleted" : sanitizedContent
              }}
            />
          )
        )}


        {/* Attachments — hiển thị files/images/videos */}
        {message.attachments && message.attachments.length > 0 && (
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
                onClick={() => onReact?.(message.id, reaction.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border transition-colors ${hasReacted(reaction)
                  ? "bg-[#1d9bd1]/20 border-[#1d9bd1]/50 text-[#1d9bd1]"
                  : "bg-[#2a2d31] border-[#797c814d] dark:text-[#d1d2d3] hover:border-[#797c81]"
                  }`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action toolbar — xuất hiện khi hover (góc trên phải) */}
      {isHovered && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10">
          {/* React với emoji — Popover (portal) giữ picker khi di chuột ra ngoài */}
          <Popover
            open={emojiPickerOpen}
            onOpenChange={handleEmojiPickerOpenChange}
          >
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className={TOOLBAR_ITEM_STYLE}>
                    <MdOutlineAddReaction size={20}
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
                theme={theme === 'dark' ? Theme.DARK : Theme.LIGHT}
                width={320}
                height={380}
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
              />
            </PopoverContent>
          </Popover>

          {/* Reply */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onReply?.(message)}
                className={TOOLBAR_ITEM_STYLE}
              >
                <BiMessageRoundedDetail size={20}
                  className={ICON_TRANSITION}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Reply in thread</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className={TOOLBAR_ITEM_STYLE}>
                <RiShareForwardLine size={20}
                  className={ICON_TRANSITION}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Forward message</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <button className={TOOLBAR_ITEM_STYLE}>
                <MdBookmarkBorder size={20}
                  className={ICON_TRANSITION}
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Save for later</p>
            </TooltipContent>
          </Tooltip>

          {/* More actions */}
          <Popover>
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
                    <MdMoreVert size={20}
                      className={ICON_TRANSITION}
                    />
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
                  {isOwner && !isDeleted && (
                    <>
                      <div
                        className={MENU_ITEM_STYLE}
                        onClick={() => {
                          setIsEditing(true);
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

                  <div className={MENU_ITEM_STYLE}>
                    <MdOutlineMarkChatUnread size={16} />
                    <Typography variant="p" text="Mark unread" />
                  </div>

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
                          data-pef="true"
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
                      <div className="absolute bottom-2 right-65 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] py-2 shadow-lg rounded-md">
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="In 5 minutes" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="In 10 minutes" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="In 30 minutes" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="In 1 hour" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="In 3 hours" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="Tomorrow" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="Next week" />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={MENU_ITEM_STYLE}>
                    <FiBellOff size={16} />
                    <Typography
                      variant="p"
                      text="Turn off notifications for replies"
                    />
                  </div>

                  <Separator />

                  <div className={MENU_ITEM_STYLE}>
                    <LuLink size={16} />
                    <Typography variant="p" text="Copy link" />
                  </div>
                  <div className={MENU_ITEM_STYLE}>
                    <RxText size={16} />
                    <Typography variant="p" text="Copy message" />
                  </div>

                  <Separator />
                  <div
                    onMouseEnter={() => setIsAddToFolderOpen(true)}
                    onMouseLeave={() => setIsAddToFolderOpen(false)}
                  >
                    <div
                      className={cn(
                        MENU_ITEM_STYLE,
                        "relative justify-between",
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <RiOrganizationChart size={16} />
                        <Typography variant="p" text="Organize" />
                      </div>
                      <MdOutlineKeyboardArrowRight size={13} />
                    </div>
                    {isAddToFolderOpen && (
                      <div className="absolute bottom-2 right-65 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] py-2 shadow-lg rounded-md">
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="Pin this message" />
                        </div>
                        <div className={SUBMENU_ITEM_STYLE}>
                          <Typography variant="p" text="Add to list" />
                        </div>
                      </div>
                    )}
                  </div>

                  {isOwner && !isDeleted && (
                    <>
                      <Separator />
                      <div
                        className={cn(
                          MENU_ITEM_STYLE,
                          "text-red-500 hover:text-white hover:bg-red-700 cursor-pointer",
                        )}
                        onClick={() => onDelete?.(message.id)}
                      >
                        <LuTrash2 size={16} />
                        <Typography variant="p" text="Delete message" />
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
  );
}
