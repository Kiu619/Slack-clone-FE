"use client";

import type { MouseEvent } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type UserStatusEmojiInlineProps = {
  statusEmoji?: string | null;
  statusText?: string | null;
  /** Classes on the outer wrapper (trigger or static span). */
  className?: string;
  /** Classes on the emoji glyph (size / color). */
  emojiClassName?: string;
  delayDuration?: number;
  tooltipSide?: "top" | "bottom" | "left" | "right";
  /**
   * When true and statusText exists: hover/focus affordance on trigger (message-style).
   * Set false in dense lists if hover chrome clashes with row selection.
   */
  interactive?: boolean;
};

/**
 * Slack-style status emoji next to a name: optional tooltip with {@link statusText}.
 * Does not render layout for the display name — parent owns typography and truncation.
 */
export const UserStatusEmojiInline = ({
  statusEmoji,
  statusText,
  className,
  emojiClassName,
  delayDuration = 400,
  tooltipSide = "top",
  interactive = true,
}: UserStatusEmojiInlineProps) => {
  const emoji = statusEmoji?.trim();
  const text = statusText?.trim();
  if (!emoji) return null;

  const glyph = (
    <span
      className={cn(
        "inline-flex shrink-0 select-none leading-none text-[15px] text-[#1d1c1d] dark:text-[#d1d2d3]",
        emojiClassName,
      )}
      aria-hidden={!text}
    >
      {emoji}
    </span>
  );

  const triggerShell = cn(
    "inline-flex shrink-0 items-center justify-center leading-none rounded px-0.5 py-px outline-none",
    interactive &&
      text &&
      "cursor-default hover:bg-black/6 dark:hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-sky-500",
    className,
  );

  const stopRowClick = (e: MouseEvent<HTMLSpanElement>) => {
    e.stopPropagation();
  };

  if (!text) {
    return (
      <span className={triggerShell} onClick={stopRowClick}>
        {glyph}
      </span>
    );
  }

  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>
        <span
          tabIndex={interactive ? 0 : -1}
          role="img"
          aria-label={text}
          className={triggerShell}
          onClick={stopRowClick}
        >
          {glyph}
        </span>
      </TooltipTrigger>
      <TooltipContent side={tooltipSide} className="max-w-sm">
        <p className="text-[13px] leading-snug">{text}</p>
      </TooltipContent>
    </Tooltip>
  );
};
