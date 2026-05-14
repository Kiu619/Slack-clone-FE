"use client";

import React, { useMemo } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { cn } from "@/lib/utils";
import type { Notification, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Typography from "@/components/ui/typography";
import { Checkbox } from "@/components/ui/checkbox";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import {
  FaAt,
  FaReply,
  FaCommentDots,
  FaUserPlus,
  FaSmile,
} from "react-icons/fa";

interface NotificationItemProps {
  notification: Notification;
  isSelected?: boolean;
  onSelect?: (id: string, selected: boolean) => void;
  onClick?: (notification: Notification) => void;
}

export default function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onClick,
}: NotificationItemProps) {
  const { id, type, actor, channel, message, createdAt, isRead } = notification;

  const memberOverlay = useWorkspaceMemberOverlay(
    notification.workspaceId,
    actor?.id,
  );
  const actorDisplay = useMemo(() => {
    if (!actor) return null;
    const base: User = {
      id: actor.id,
      email: "",
      name: actor.name,
      displayName: actor.name,
      avatar: actor.avatar,
    };
    return mergeUserForDisplay(base, memberOverlay);
  }, [actor, memberOverlay]);

  const getIcon = () => {
    switch (type) {
      case "mention":
        return <FaAt className="text-blue-500" size={12} />;
      case "reply":
        return <FaReply className="text-green-500" size={12} />;
      case "dm":
        return <FaCommentDots className="text-purple-500" size={12} />;
      case "channel_invite":
        return <FaUserPlus className="text-orange-500" size={12} />;
      case "reaction":
        return <FaSmile className="text-yellow-500" size={12} />;
      default:
        return null;
    }
  };

  const getHeaderText = () => {
    switch (type) {
      case "mention":
        return (
          <span>
            mentioned you in{" "}
            <span className="font-bold text-muted-foreground">
              #{channel?.name || "unknown"}
            </span>
          </span>
        );
      case "reply":
        return <span>replied to a thread</span>;
      case "dm":
        return <span>sent you a direct message</span>;
      case "reaction":
        return <span>reacted to your message</span>;
      default:
        return <span>sent a notification</span>;
    }
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return format(date, "h:mm a");
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d");
  };

  return (
    <div
      onClick={() => onClick?.(notification)}
      className={cn(
        "group relative flex items-start gap-x-3 p-3 cursor-pointer transition-colors border-b border-border/50",
        "hover:bg-selection-hover/10 dark:hover:bg-selection-hover/5",
        isSelected && "bg-selection-hover/20 dark:bg-selection-hover/10",
        !isRead && !isSelected &&
        "bg-blue-500/5 dark:bg-blue-500/10 border-l-2 border-l-blue-500",
      )}
    >
      <div
        className="pt-1"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect?.(id, !!checked)}
          className="size-4"
        />
      </div>

      <div className="flex-1 flex items-start gap-x-3 min-w-0">
        <div className="relative shrink-0">
          <Avatar size="default" className="rounded-md">
            <AvatarImage src={actorDisplay?.avatar || ""} />
            <AvatarFallback className="rounded-md bg-sky-500 text-white text-[10px]">
              {(actorDisplay?.displayName ?? actorDisplay?.name)?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-background rounded-full p-0.5 shadow-sm">
            {getIcon()}
          </div>
        </div>

          <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center gap-x-2">
            <div className="flex min-w-0 flex-1 items-center gap-1">
              <Typography variant="p" className="font-bold truncate min-w-0 flex-1">
                {actorDisplay?.displayName || actorDisplay?.name || "Someone"}
              </Typography>
              {actorDisplay ? (
                <UserStatusEmojiInline
                  statusEmoji={actorDisplay.statusEmoji}
                  statusText={actorDisplay.statusText}
                  emojiClassName="text-[13px]"
                  interactive={Boolean(actorDisplay.statusText?.trim())}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-x-2 shrink-0">
              <span
                className={cn(
                  "text-[10px] px-1.5 py-0.5 rounded font-medium",
                  type === "mention" &&
                  "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
                  type === "reply" &&
                  "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
                  type === "dm" &&
                  "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
                  type === "reaction" &&
                  "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
                )}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </span>
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                {formatTime(createdAt)}
              </span>
            </div>
          </div>

          <Typography
            variant="p"
            className="text-[13px] leading-tight truncate text-muted-foreground"
          >
            {getHeaderText()}
          </Typography>

          {message?.content && (
            <div className="mt-1">
              <Typography
                variant="p"
                className="text-[13px] text-foreground line-clamp-2 break-words"
                dangerouslySetInnerHTML={{ __html: message.content }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
