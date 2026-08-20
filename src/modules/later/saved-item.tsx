"use client";

import FilePreview from "@/components/attachment-previews/file-preview";
import MessageItem from "@/components/message-item";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import Typography from "@/components/ui/typography";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { useChannel } from "@/hooks/use-channel";
import { canUserPostInChannel } from "@/lib/channel-posting-permissions";
import { SavedItem, SavedItemStatus, User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMessageStore } from "@/stores/useMessageStore";
import { Theme } from "@/stores/useThemeStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { formatDistanceToNowStrict } from "date-fns";
import { useEffect, useMemo, useState } from "react";
import { FiHash } from "react-icons/fi";
import { GiCheckMark } from "react-icons/gi";
import { LuClock3, LuTrash2 } from "react-icons/lu";
import { MdMoreVert } from "react-icons/md";
import { useAppTranslation } from "@/hooks/use-translation";

const TOOLBAR_ITEM_STYLE =
  "cursor-pointer p-1.5 rounded dark:hover:bg-[#222529] text-[#797c81]";
const MENU_ITEM_STYLE =
  "flex items-center gap-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm";
const ICON_TRANSITION = "hover:scale-115 transition-all duration-300";

interface SavedItemProps {
  item: SavedItem;
  theme: Theme;
  currentUser: User | null;
  workspaceId: string;
  filterStatus: SavedItemStatus;
  isActive: boolean;
  reminderPresets: { label: string; value: string }[];
  onItemClick: (item: SavedItem) => void;
  onToggleComplete: (item: SavedItem) => void;
  onArchive: (item: SavedItem) => void;
  onRemove: (itemId: string) => void;
  onSetReminder: (item: SavedItem, remindAt: string, note?: string) => void;
  onClearReminder: (item: SavedItem) => void;
  onEditReminder: (item: SavedItem) => void;
  selectedTextColor?: string;
}

function isSavedItemOverdue(item: SavedItem): boolean {
  if (item.status !== "in_progress" || !item.remindAt) return false;
  const remindAt = new Date(item.remindAt).getTime();
  return !Number.isNaN(remindAt) && remindAt < Date.now();
}

export const SavedItemComponent = ({
  item,
  theme,
  currentUser,
  workspaceId,
  filterStatus,
  isActive,
  reminderPresets,
  onItemClick,
  onToggleComplete,
  onArchive,
  onRemove,
  onSetReminder,
  onClearReminder,
  onEditReminder,
  selectedTextColor,
}: SavedItemProps) => {
  const t = useAppTranslation("later");
  const [openPopover, setOpenPopover] = useState(false);
  const [openReminderPopover, setOpenReminderPopover] = useState(false);

  // Lấy dữ liệu tin nhắn realtime từ Zustand Store (Single Source of Truth)
  const messageFromStore = useMessageStore(s => s.entities[item.message?.id || ""]);
  const displayMessage = messageFromStore || item.message;

  const reminderOverlay = useWorkspaceMemberOverlay(
    workspaceId,
    item.type === "reminder" ? item.user?.id : undefined,
  );
  const reminderDisplayUser = useMemo(() => {
    if (item.type !== "reminder" || !item.user) return null;
    const base: User = {
      id: item.user.id,
      email: "",
      name: item.user.name,
      displayName: item.user.displayName,
      avatar: item.user.avatar,
    };
    return mergeUserForDisplay(base, reminderOverlay);
  }, [item.type, item.user, reminderOverlay]);

  const [isOverdue, setIsOverdue] = useState(() => isSavedItemOverdue(item));

  useEffect(() => {
    setIsOverdue(isSavedItemOverdue(item));

    if (item.status !== "in_progress" || !item.remindAt) return;

    const delay = new Date(item.remindAt).getTime() - Date.now();
    if (Number.isNaN(delay)) return;
    if (delay <= 0) {
      setIsOverdue(true);
      return;
    }

    const timer = setTimeout(() => {
      setIsOverdue(true);
    }, delay);

    return () => clearTimeout(timer);
  }, [item.id, item.status, item.remindAt]);

  const isDeleted =
    item.type === "message" &&
    !displayMessage?.content &&
    !displayMessage?.attachments?.length;
  const { data: savedChannel } = useChannel(
    workspaceId,
    displayMessage?.channelId || "",
  );
  const canReplyInThread = useMemo(() => {
    if (!displayMessage?.channelId) return true;
    return canUserPostInChannel(
      savedChannel,
      currentUser?.id ?? null,
      currentUser?.role ?? null,
    ).canReply;
  }, [displayMessage?.channelId, savedChannel, currentUser?.id, currentUser?.role]);

  return (
    <div
      onClick={() => !isDeleted && onItemClick(item)}
      className={cn(
        "group relative flex flex-col rounded-md hover:bg-[rgba(255,255,255,0.1)] transition-colors",
        !isDeleted ? "cursor-pointer" : "cursor-default",
        // isActive && "bg-[#FDF9F0] dark:bg-[#22221f] hover:bg-[#F9F3EA] dark:hover:bg-[#2a2a26]"
      )}
      // className={`flex items-center gap-x-2 px-3 py-1 cursor-pointer rounded-md transition-colors ${isActive
      //               ? 'text-white'
      //               : 'hover:bg-[rgba(255,255,255,0.1)]'
      //               }`}
      style={
        isActive
          ? {
            backgroundColor: theme.selectedItems,
            color: selectedTextColor,
          }
          : {}
      }
    >
      {/* Channel/DM/Reminder Info Header */}
      <div className="flex items-center gap-x-1 text-[13px] text-[#616061] dark:text-[#ababad] px-2 mb-1 pt-2 overflow-hidden">
        <div className="flex items-center gap-1 font-semibold shrink-0">
          {item.remindAt &&
            (isOverdue ? (
              <div className="bg-[#861f62] text-white px-2 py-0.5 rounded-full text-[11px] flex items-center gap-1 shrink-0">
                {t("savedItem.incomplete")} •{" "}
                {formatDistanceToNowStrict(new Date(item.remindAt))} {t("savedItem.ago")}
              </div>
            ) : (
              <span className="text-[#861f62] dark:text-[#cc78b0] shrink-0">
                {t("savedItem.dueIn")} {formatDistanceToNowStrict(new Date(item.remindAt))}
              </span>
            ))}

          {item.remindAt && (
            <span className="text-[#616061] dark:text-[#ababad] font-normal ml-1">
              •
            </span>
          )}

          <span className="hover:underline cursor-pointer font-bold truncate">
            {item.type === 'reminder' ? (
              t("savedItem.reminder")
            ) : (displayMessage?.channelName || item.attachment?.channelName) ? (
              <span className="flex items-center gap-1">
                <FiHash size={14} className="shrink-0" />
                <span className="truncate">{displayMessage?.channelName || item.attachment?.channelName}</span>
              </span>
            ) : (t("savedItem.directMessages"))}
          </span>
        </div>
      </div>

      <div className="flex gap-x-0 pb-3">
        {/* Main Content */}
        <div className="flex-1 min-w-0">
          {isDeleted ? (
            <div className="flex gap-x-3 px-2 py-1">
              <div className="w-9 h-9 rounded bg-[#f8f8f8] dark:bg-[#2a2d31] flex items-center justify-center text-[#616061]">
                <LuTrash2 size={18} />
              </div>
              <div className="text-[15px] text-[#616061] dark:text-[#ababad] italic self-center">
                {t("savedItem.deletedMessage")}
              </div>
            </div>
          ) : item.type === "reminder" ? (
            <div className="flex gap-x-3 px-2 py-1">
              <Avatar className="h-9 w-9 rounded">
                <AvatarImage src={reminderDisplayUser?.avatar || ""} />
                <AvatarFallback className="rounded bg-sky-500 text-white text-xs">
                  {reminderDisplayUser?.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <span className="text-[15px] font-bold text-[#1d1c1d] dark:text-[#d1d2d3] truncate min-w-0">
                    {reminderDisplayUser?.displayName || t("savedItem.you")}
                  </span>
                  {reminderDisplayUser ? (
                    <UserStatusEmojiInline
                      statusEmoji={reminderDisplayUser.statusEmoji}
                      statusText={reminderDisplayUser.statusText}
                      emojiClassName="text-[15px]"
                    />
                  ) : null}
                </div>
                <span className="text-[15px] text-[#1d1c1d] dark:text-[#d1d2d3]">
                  {item.note}
                </span>
              </div>
            </div>
          ) : item.type === "message" && displayMessage ? (
            <div className="-ml-2 pointer-events-none">
              <MessageItem
                messageId={displayMessage?.id}
                message={displayMessage}
                currentUserId={currentUser?.id ?? ""}
                workspaceId={workspaceId}
                hideReplyButton
                hideThreadReplyBar
                canReplyInThread={canReplyInThread}
                isSavedForLater={item.type === "message"}
                hideSaveForLaterUi
              />
            </div>
          ) : (
            <div className="pb-2 px-2 cursor-pointer">
              <FilePreview
                attachment={item.attachment!}
                message={displayMessage!}
                uploader={item?.attachment?.user}
                fromFilesTab={true}
              />
            </div>
          )}
        </div>
      </div>

      {/* Actions on Hover */}
      <div className={cn(
        "absolute rounded-lg right-4 top-5 flex gap-x-1 bg-white dark:bg-[#1A1D21] border dark:border-[#797c814d] shadow-sm p-0.5 z-20 transition-opacity",
        openPopover || openReminderPopover
          ? "opacity-100"
          : "opacity-0 group-hover:opacity-100"
      )}>
        {!isDeleted && filterStatus === "in_progress" && (
          <>
            {/* Mark complete / in-progress */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(item);
                  }}
                >
                  <GiCheckMark
                    size={20}
                    className={cn(
                      ICON_TRANSITION,
                      item.status === "completed" && "text-green-500"
                    )}
                  />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">
                  {item.status === "completed" ? t("actions.markInProgress") : t("actions.markCompleted")}
                </p>
              </TooltipContent>
            </Tooltip>

            {/* Set Reminder (preset popover) */}
            <Popover
              open={openReminderPopover}
              onOpenChange={setOpenReminderPopover}
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        TOOLBAR_ITEM_STYLE,
                        item.remindAt && "text-[#1264a3] dark:text-[#1d9bd1]!"
                      )}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <LuClock3 size={20} className={ICON_TRANSITION} />
                    </button>
                  </PopoverTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">
                  <Typography className="text-xs">
                    {item.remindAt ? t("actions.editReminder") : t("actions.setReminder")}
                  </Typography>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="left"
                align="start"
                sideOffset={8}
                className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21] p-0"
                withOverlay={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-2">
                  {reminderPresets.map((preset) => (
                    <Button
                      variant='submenu'
                      key={preset.label}
                      className={cn(MENU_ITEM_STYLE, "w-full text-left")}
                      onClick={() => {
                        onSetReminder(item, preset.value);
                        setOpenReminderPopover(false);
                      }}
                    >
                      {preset.label}
                    </Button>
                  ))}
                  <Button
                    variant='submenu'
                    className={cn(MENU_ITEM_STYLE, "w-full text-left")}
                    onClick={() => {
                      onEditReminder(item);
                      setOpenReminderPopover(false);
                    }}
                  >
                    {t("actions.custom")}
                  </Button>
                  {item.remindAt && (
                    <>
                      <hr className="border-[#797c814d] my-1" />
                      <button
                        className={cn(MENU_ITEM_STYLE, "w-full text-left text-red-400! hover:bg-red-700! hover:text-white!")}
                        onClick={() => {
                          onClearReminder(item);
                          setOpenReminderPopover(false);
                        }}
                      >
                        {t("actions.clearDueDate")}
                      </button>
                    </>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </>
        )}

        {/* More actions popover */}
        <Popover
          open={openPopover}
          onOpenChange={setOpenPopover}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <div
                  className={TOOLBAR_ITEM_STYLE}
                  onClick={(e) => e.stopPropagation()}
                >
                  <MdMoreVert
                    size={20}
                    className={ICON_TRANSITION}
                  />
                </div>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">{t("actions.moreActions")}</p>
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            side="left"
            align="start"
            sideOffset={8}
            className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
            withOverlay={true}
            onOpenAutoFocus={(e) => e.preventDefault()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2 min-w-[180px]">
              {filterStatus === "completed" ? (
                <div className="flex flex-col space-y-1">
                  <Button
                    variant='submenu'
                    className={MENU_ITEM_STYLE}
                    onClick={() => {
                      onToggleComplete(item);
                      setOpenPopover(false);
                    }}
                  >
                    <Typography variant="p" text={t("actions.moveToProgress")} />
                  </Button>
                  <div
                    className={cn(
                      MENU_ITEM_STYLE,
                      "text-red-400 hover:text-white hover:bg-red-700 cursor-pointer",
                    )}
                    onClick={() => {
                      onRemove(item.id);
                      setOpenPopover(false);
                    }}
                  >
                    <Typography
                      variant="p"
                      text={t("actions.clearFromLater")}
                      className="mt-0.5"
                    />
                  </div>
                </div>
              ) : item.type === "reminder" ? (
                <div className="flex flex-col">
                  <Button
                    variant="submenu"
                    className={cn(MENU_ITEM_STYLE, "justify-start px-4 py-2 hover:bg-[#f8f8f8] dark:hover:bg-[#222529]")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onEditReminder(item);
                      setOpenPopover(false);
                    }}
                    >
                      {t("actions.editReminderAction")}
                    </Button>
                  <Button
                    variant="submenu"
                    className={cn(MENU_ITEM_STYLE, "justify-start px-4 py-2 text-red-500 hover:bg-[#f8f8f8] dark:hover:bg-[#222529]")}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(item.id);
                      setOpenPopover(false);
                    }}
                    >
                      {t("actions.deleteReminder")}
                    </Button>
                </div>
              ) : (
                <div className="flex flex-col space-y-1">
                  {!isDeleted && (
                    <Button
                      variant='submenu'
                      className={MENU_ITEM_STYLE}
                      onClick={() => {
                        onArchive(item);
                        setOpenPopover(false);
                      }}
                    >
                      <Typography
                        variant="p"
                        text={item.status === "archived" ? t("actions.unarchive") : t("actions.archive")}
                      />
                    </Button>
                  )}
                  <div
                    className={cn(
                      MENU_ITEM_STYLE,
                      "text-red-500! hover:text-white! hover:bg-red-700 cursor-pointer",
                    )}
                    onClick={() => {
                      onRemove(item.id);
                      setOpenPopover(false);
                    }}
                  >
                    <Typography
                      variant="p"
                      text={t("actions.removeFromLater")}
                      className="mt-0.5"
                    />
                  </div>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const SavedItemSkeleton = () => {
  return (
    <div className="flex flex-col p-3 border-b dark:border-[#797c814d] space-y-3 animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-24 h-4 bg-gray-200 dark:bg-[#2a2d31] rounded" />
      </div>
      <div className="flex gap-3">
        <div className="w-9 h-9 bg-gray-200 dark:bg-[#2a2d31] rounded" />
        <div className="flex-1 space-y-2">
          <div className="w-1/3 h-4 bg-gray-200 dark:bg-[#2a2d31] rounded" />
          <div className="w-2/3 h-4 bg-gray-200 dark:bg-[#2a2d31] rounded" />
        </div>
      </div>
    </div>
  );
};
