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
import { useState } from "react";
import { MdMoreVert } from "react-icons/md";
import { useHuddle } from "@/hooks/use-translation";

interface MoreActionsToolbarButtonProps {
  topic?: string | null;
  onAddOrEditTopic: () => void;
}

export function MoreActionsToolbarButton({
  topic,
  onAddOrEditTopic,
}: MoreActionsToolbarButtonProps) {
  const t = useHuddle()
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              type="button"
              size="custom"
              className={cn(
                "flex h-11 w-11 items-center justify-center text-white",
                "bg-white/20 hover:bg-white/40",
                open && "bg-[#7b6847] hover:bg-[#8a764b]",
              )}
              aria-label={t("moreActions")}
            >
              <MdMoreVert size={20} />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t("moreActions")}</TooltipContent>
      </Tooltip>
      <PopoverContent align="center" withOverlay>
        <div className="flex flex-col py-2">
          <Button variant="submenu" onClick={onAddOrEditTopic}>
            {topic ? t("editTopic") : t("addATopic")}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
