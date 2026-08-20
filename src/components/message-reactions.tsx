"use client";

import type { Reaction } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useCallback } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Typography from "./ui/typography";
import { extractCustomEmojiName } from "@/lib/custom-emojis";
import { useTranslations } from "next-intl";

type MessageReactionsProps = {
  reactions: Reaction[];
  currentUserId: string;
  messageId: string;
  onReact?: (messageId: string, emoji: string) => void;
  customEmojiLookup?: Map<string, { imageUrl: string; name: string }>;
  memberOverlayMap?: Record<string, { id: string; name?: string | null; displayName?: string | null; email?: string | null }>;
};

export function MessageReactions({
  reactions,
  currentUserId,
  messageId,
  onReact,
  customEmojiLookup,
  memberOverlayMap = {},
}: MessageReactionsProps) {
  const hasReacted = useCallback(
    (reaction: Reaction) => reaction.userIds.includes(currentUserId),
    [currentUserId],
  );

  const t = useTranslations();

  const getReactionTooltipText = (
    (reaction: Reaction) => {
      const names = reaction.userIds.map((userId) => {
        if (userId === currentUserId) return `${t('common.you')}`
        const snapshotUser = reaction.users?.find((u) => u.id === userId);
        const member = memberOverlayMap[userId];
        return (
          snapshotUser?.displayName?.trim() ||
          snapshotUser?.name?.trim() ||
          member?.displayName?.trim() ||
          member?.name?.trim() ||
          member?.email?.trim() ||
          `User #${userId.slice(0, 6)}`
        );
      });
      const uniqueNames = Array.from(new Set(names));
      const visibleNames = uniqueNames.slice(0, 10);
      const hiddenCount = uniqueNames.length - visibleNames.length;
      const base = visibleNames.join(", ");
      return hiddenCount > 0 ? `${base} and more` : base;
  }
  );

  if (reactions.length === 0) return null;

  const renderReactionEmoji = (emoji: string) => {
    const customName = extractCustomEmojiName(emoji);
    const customEmoji = customName ? customEmojiLookup?.get(customName) : null;
    if (customEmoji) {
      return (
        <img
          src={customEmoji.imageUrl}
          alt={`:${customEmoji.name}:`}
          className="h-4 w-4 object-contain"
        />
      );
    }
    return <span>{emoji}</span>;
  };

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {reactions.map((reaction) => (
        <Tooltip key={reaction.emoji}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReact?.(messageId, reaction.emoji);
              }}
              className={cn(
                "flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border transition-colors",
                hasReacted(reaction)
                  ? "bg-[#1d9bd1]/20 border-[#1d9bd1]/50 text-[#1d9bd1]"
                  : "dark:bg-[#2a2d31] border-[#797c814d] dark:text-[#d1d2d3] hover:border-[#797c81]",
              )}
            >
              {renderReactionEmoji(reaction.emoji)}
              <span className="font-medium">{reaction.count}</span>
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" align="center" className="max-w-xs px-3 py-2">
            <div className="text-sm leading-5 text-center">
              <Typography variant="p" className="font-semibold text-xs">
                {getReactionTooltipText(reaction)}
              </Typography>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <span>{t('common.reactedWith')}</span>
                <span className="inline-flex items-center justify-center">
                  {renderReactionEmoji(reaction.emoji)}
                </span>
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
