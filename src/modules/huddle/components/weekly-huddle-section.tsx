"use client";

import { useState } from "react";
import { RiHeadphoneLine } from "react-icons/ri";
import { openHuddlePreviewWindow } from "@/lib/open-huddle-preview-window";
import { cn } from "@/lib/utils";
import type { WeeklyHuddleItem } from "@/lib/huddle";
import { useWeeklyHuddles } from "@/hooks/use-weekly-huddles";
import { Button } from "@/components/ui/button";
import { useAppTranslation } from "@/hooks/use-translation";

type WeeklyHuddleSectionProps = {
  workspaceId: string;
};

function WeeklyHuddleCard({
  item,
  workspaceId,
  t,
}: {
  item: WeeklyHuddleItem;
  workspaceId: string;
  t: ReturnType<typeof useAppTranslation>;
}) {
  const [isHovered, setIsHovered] = useState(false);

  const displayName =
    item.entityType === "channel"
      ? `#${item.entityLabel || "channel"}`
      : item.entityLabel || "DM";

  const handleStartHuddle = () => {
    openHuddlePreviewWindow({
      workspaceId,
      entityType: item.entityType,
      entityId: item.entityId,
      label: displayName,
      mode: "start",
    });
  };

  const timeText = item.huddleCount === 1 ? "time" : "times";

  return (
    <div
      className="group relative h-50 max-w-60 truncate flex flex-col cursor-pointer items-center justify-center gap-3 rounded-lg border border-[#797c814d] bg-white p-3 transition-all hover:border-[#797c81] dark:bg-[#1A1D21]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleStartHuddle}
    >
      <div className="flex flex-col  truncate">
        <span className="truncate text-sm font-semibold">
          {t('weeklySection.startHuddleIn', { name: displayName })}
        </span>
        <span className="truncate text-xs text-gray-400">
          {t('youHuddledHere', { count: item.huddleCount }, { time: timeText })}
        </span>
        <Button
          variant="outline"
          className={cn(
            "transition-opacity",
            isHovered ? "opacity-100" : "pointer-events-none opacity-0",
          )}
          onClick={(e) => {
            e.stopPropagation();
            handleStartHuddle();
          }}
        >
          {t('weeklySection.startHuddle')}
        </Button>
      </div>
    </div>
  );
}

export function WeeklyHuddleSection({ workspaceId }: WeeklyHuddleSectionProps) {
  const t = useAppTranslation('huddle')
  const { data, isLoading, error } = useWeeklyHuddles(workspaceId);


  if (error || !data || data.weekly.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2">
      <div className="flex gap-2">
        {data.weekly.map((item) => (
          <WeeklyHuddleCard
            key={`${item.entityType}:${item.entityId}`}
            item={item}
            workspaceId={workspaceId}
            t={t}
          />
        ))}
      </div>
    </div>
  );
}
