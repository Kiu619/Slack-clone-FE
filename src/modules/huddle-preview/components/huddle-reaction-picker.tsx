"use client";

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
import { cn } from "@/lib/utils";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import { useTheme } from "next-themes";
import dynamic from "next/dynamic";
import { useState } from "react";
import { LuSmile } from "react-icons/lu";
import { useHuddle } from "@/hooks/use-translation";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type HuddleReactionPickerProps = {
  onSendReaction: (emoji: string) => void | Promise<void>;
};

export function HuddleReactionPicker({
  onSendReaction,
}: HuddleReactionPickerProps) {
  const t = useHuddle()
  const [open, setOpen] = useState(false);
  const { theme } = useTheme();

  const handleEmojiSelect = (data: EmojiClickData) => {
    void onSendReaction(data.emoji);
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <PopoverTrigger asChild>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="custom"
              className={cn(
                "flex h-11 w-11 items-center justify-center text-white",
                open
                  ? "bg-[#7b6847] hover:bg-[#8a764b]"
                  : "bg-white/20 hover:bg-white/40",
              )}
              aria-label={t("addReaction")}
            >
              <LuSmile size={20} />
            </Button>
          </TooltipTrigger>
        </PopoverTrigger>

        <TooltipContent>{t("addReaction")}</TooltipContent>
      </Tooltip>

      <PopoverContent
        side="top"
        align="center"
        sideOffset={10}
        className="w-auto border-none bg-transparent p-0 shadow-none"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <EmojiPicker
          onEmojiClick={handleEmojiSelect}
          theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
          width={320}
          height={380}
          searchPlaceHolder={t("searchEmoji")}
          previewConfig={{ showPreview: false }}
        />
      </PopoverContent>
    </Popover>
  );
}
