"use client";

import React, { useCallback, useMemo } from "react";
import DOMPurify from "dompurify";
import { cn } from "@/lib/utils";
import type { Notification, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { useMessageStore } from "@/stores/useMessageStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Typography from "@/components/ui/typography";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import {
  FaAt,
  FaReply,
  FaUserPlus,
  FaSmile,
} from "react-icons/fa";
import { Check, Eraser } from "lucide-react";
import { FiHash } from "react-icons/fi";
import { useAppTranslation } from "@/hooks/use-translation";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { formatMessageTime } from "@/lib/format-message-time";
import { resolveUserDisplayInfo } from "@/lib/user-display";

interface NotificationItemProps {
  notification: Notification;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: (notification: Notification) => void;
  onMarkAsRead?: (notification: Notification) => void;
  onClear?: (notification: Notification) => void;
}

export default function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onClick,
  onMarkAsRead,
  onClear,
}: NotificationItemProps) {
  const { id, type, actor, channel, message, createdAt, isRead } = notification;
  const t = useAppTranslation("notification");
  const commonT = useAppTranslation("common");
  const language = useLanguageRegionStore((s) => s.language);
  const timeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const storeMessage = useMessageStore(
    useCallback(
      (state) =>
        notification.messageId ? state.entities[notification.messageId] : undefined,
      [notification.messageId],
    ),
  );
  const resolvedMessage = storeMessage || message;

  const memberOverlay = useWorkspaceMemberOverlay(
    notification.workspaceId,
    actor?.id,
  );
  const actorDisplay = useMemo(() => {
    if (!actor) return null;
    // Khi user đã bị xoá khỏi workspace, backend trả về name = "Deleted user", avatar = null,
    // và membershipStatus = "deleted" (xem notification.service.ts).
    // Vẫn giữ email trống vì backend đã sanitize (chỉ set '' cho hard-deleted user).
    const base: User = {
      id: actor.id,
      email: (actor as User & { email?: string }).email ?? "",
      name: actor.name,
      displayName: actor.displayName ?? actor.name,
      avatar: actor.avatar,
      membershipStatus: (actor as User).membershipStatus,
    };
    return mergeUserForDisplay(base, memberOverlay);
  }, [actor, memberOverlay]);

  // Resolved display info: xử lý nhất quán với phần còn lại của UI
  // - Deleted user → "Deleted user" + avatar null
  // - Deactivated   → tên thật + badge "Deactivated"
  const displayInfo = useMemo(
    () =>
      resolveUserDisplayInfo(actorDisplay, {
        deletedLabel: t("common.deletedUser"),
      }),
    [actorDisplay, t],
  );

  const getIcon = () => {
    switch (type) {
      case "mention":
        return <FaAt className="text-blue-500" size={12} />;
      case "post":
        return <FiHash className="text-[#7cc7ff]" size={12} />;
      case "reply":
        return <FaReply className="text-green-500" size={12} />;
      case "channel_invite":
        return <FaUserPlus className="text-orange-500" size={12} />;
      case "reaction":
        return <FaSmile className="text-yellow-500" size={12} />;
      default:
        return null;
    }
  };

  const getContextText = () => {
    if (type === "post") {
      return channel ? t("postInChannel", { channel: channel.name }) : t("postInDm");
    }

    if (type === "channel_invite") {
      return channel ? t("invitedToChannel", { channel: channel.name }) : t("invitedToChannelFallback");
    }

    if (type === "reply") {
      return channel ? t("threadInChannel", { channel: channel.name }) : t("threadInDm");
    }

    if (type === "mention") {
      return channel ? t("mentionInChannel", { channel: channel.name }) : t("mentionInDm");
    }

    if (type === "reaction") {
      return channel ? t("reactedInChannel", { channel: channel.name }) : t("reactedInDm");
    }

    return t("notification");
  };

  const getMetaText = () => {
    if (type === "post") return channel ? t("postInChannel", { channel: channel.name }) : t("postInDm");
    if (type === "reply") return channel ? t("threadInChannel", { channel: channel.name }) : t("threadInDm");
    if (type === "mention") return channel ? t("mentionInChannel", { channel: channel.name }) : t("mentionInDm");
    if (type === "reaction") return channel ? t("reactedInChannel", { channel: channel.name }) : t("reactedInDm");
    if (type === "channel_invite") return channel ? t("invitationToChannel", { channel: channel.name }) : t("channelInvitation");
    return getContextText();
  };

  const formatTime = (dateStr: string) => {
    return formatMessageTime(dateStr, {
      t,
      commonT,
      language,
      timeFormat,
    });
  };

  const sanitizedPreviewContent = useMemo(() => {
    const content = resolvedMessage?.content ?? "";
    if (!content) return "";
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
  }, [resolvedMessage?.content]);

  const attachmentPreviewText = useMemo(() => {
    const attachments = resolvedMessage?.attachments ?? [];
    if (!attachments.length) return "";
    if (sanitizedPreviewContent) return "";

    const names = attachments
      .map((attachment) => attachment.name?.trim())
      .filter((name): name is string => Boolean(name));

    if (!names.length) return "";

    const previewNames = names.slice(0, 3);
    const moreCount = names.length - previewNames.length;
    return moreCount > 0
      ? t("attachmentPreviewMore", { names: previewNames.join(", "), count: moreCount })
      : previewNames.join(", ");
  }, [resolvedMessage?.attachments, sanitizedPreviewContent, t]);

  return (
    <div
      onClick={() => onClick?.(notification)}
      className={cn(
        "group relative mb-2.5 flex items-start gap-3 rounded-[18px] border   px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] transition-colors",
        "hover:border-white/14 hover:bg-[rgba(232,226,226,0.4)]  dark:hover:bg-[#22252c]",
        isSelected && "border-white/16 bg-[#252a33]",
        !isRead && "before:absolute before:inset-y-3 before:left-0 before:w-0.75 before:rounded-full before:bg-[#d946ef]",
      )}
    >
      <div
        className="pt-0.5"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          id={`select-notification-${id}`}
          name={`select-notification-${id}`}
          checked={isSelected}
          type="checkbox"
          onChange={(e) => onSelect?.(id, e.target.checked)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
      </div>

      <div className="flex-1 flex items-start gap-x-3 min-w-0 cursor-pointer">
        <div className="relative shrink-0">
          <Avatar size="default" className="rounded-md">
            {displayInfo.avatar ? <AvatarImage src={displayInfo.avatar} /> : null}
            <AvatarFallback
              className={cn(
                "rounded-md text-[10px] text-white",
                displayInfo.isDeleted ? "bg-[#3a3d41]" : "bg-sky-500",
              )}
            >
              {displayInfo.initials}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 rounded-full bg-[#111318] p-1 shadow-sm ring-1 ring-white/10">
            {getIcon()}
          </div>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-center gap-1.5">
                <Typography
                  variant="p"
                  className={cn(
                    "min-w-0 flex-1 truncate text-[15px] font-semibold",
                    displayInfo.isDeleted && "text-[#ababad]",
                  )}
                >
                  {displayInfo.name || t("someone")}
                </Typography>
                {actorDisplay && !displayInfo.isDeleted && !displayInfo.isDeactivated ? (
                  <UserStatusEmojiInline
                    statusEmoji={actorDisplay.statusEmoji}
                    statusText={actorDisplay.statusText}
                    emojiClassName="text-[13px]"
                    interactive={Boolean(actorDisplay.statusText?.trim())}
                  />
                ) : null}
                {displayInfo.isDeactivated ? (
                  <span
                    className="shrink-0 rounded bg-[#e8e8e8] px-1.5 py-0.5 text-[11px] font-semibold text-[#616061] dark:bg-[#2f3338] dark:text-[#ababad]"
                    title={t("status.deactivatedAccount")}
                  >
                    deactivated
                  </span>
                ) : null}
                {displayInfo.isDeleted ? (
                  <span
                    className="shrink-0 rounded bg-red-500/15 px-1.5 py-0.5 text-[11px] font-semibold text-red-300"
                    title={t("common.deletedAccount")}
                  >
                    deleted
                  </span>
                ) : null}
              </div>
              <div className="mt-1 flex min-w-0 items-center gap-2 overflow-hidden">
                <Typography
                  variant="p"
                  className="truncate text-[13px] leading-tight text-[#8f98a3]"
                >
                  {getMetaText()}
                </Typography>
              </div>
            </div>

            <div className="relative h-8 w-[92px] shrink-0">
              <div className="absolute inset-0 flex items-center justify-end transition-opacity duration-150 group-hover:opacity-0">
                <span className="whitespace-nowrap text-[12px]">
                  {formatTime(createdAt)}
                </span>
              </div>

              <div className="absolute inset-0 flex items-center justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                <div className="flex items-center gap-0.5 rounded-lg border border-white/10 bg-white dark:bg-[#1a1d22] p-0.5 shadow-sm">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onMarkAsRead?.(notification);
                        }}
                        className="rounded-md p-1.5 text-[#c7cad1] transition-colors hover:bg-white/8 hover:text-white"
                      >
                        <Check size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("markAsRead")}</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClear?.(notification);
                        }}
                        className="rounded-md p-1.5 text-[#c7cad1] transition-colors hover:bg-white/8 hover:text-white"
                      >
                        <Eraser size={14} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">{t("clear")}</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </div>
            </div>
          </div>

          {(sanitizedPreviewContent || attachmentPreviewText) && (
            <div className="mt-2">
              {sanitizedPreviewContent ? (
                <Typography
                  variant="p"
                  className="line-clamp-2 wrap-break-word text-[15px] font-medium"
                  dangerouslySetInnerHTML={{ __html: sanitizedPreviewContent }}
                />
              ) : (
                <Typography
                  variant="p"
                  className="line-clamp-2 wrap-break-word text-[15px] font-medium"
                >
                  {attachmentPreviewText}
                </Typography>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
