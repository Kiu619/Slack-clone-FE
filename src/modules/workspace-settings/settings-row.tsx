import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";
import Typography from "@/components/ui/typography";

import type { SectionItem } from "./types";

export function SettingsRow({
  item,
  withChevron = true,
}: {
  item: SectionItem;
  withChevron?: boolean;
}) {
  const Icon = item.icon;

  return (
    <div className="flex items-start gap-3 py-3.5 sm:gap-4">
      <div
        className={cn(
          "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[4px] text-white sm:h-11 sm:w-11",
          item.iconBg,
        )}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <Typography
          as="h3"
          variant="h6"
          className="text-[18px] leading-none tracking-[-0.02em] text-[#1d1c1d] sm:text-[20px]"
        >
          {item.title}
        </Typography>
        <Typography
          variant="muted"
          className="mt-1.5 max-w-[780px] text-[13px] leading-5 text-[#616061] sm:text-[14px]"
        >
          {item.description}
        </Typography>
      </div>

      {withChevron ? (
        <ChevronRight className="mt-2.5 h-5 w-5 shrink-0 text-[#d8d3d8]" />
      ) : null}
    </div>
  );
}
