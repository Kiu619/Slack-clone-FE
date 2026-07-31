"use client";

import { useState } from "react";
import type { RecentHuddlesFilters } from "@/lib/huddle";
import { InFilterPopover } from "./in-filter-popover";
import { WithFilterPopover } from "./with-filter-popover";
import { HuddleTypeFilter } from "./huddle-type-filter";

type HuddleFilterRowProps = {
  workspaceId: string;
  filters: RecentHuddlesFilters;
  onFiltersChange: (filters: RecentHuddlesFilters) => void;
  hideWith?: boolean;
};

export function HuddleFilterRow({
  workspaceId,
  filters,
  onFiltersChange,
  hideWith = false,
}: HuddleFilterRowProps) {
  const selectedChannelIds = filters.filter_channelIds ?? [];
  const selectedConversationIds = filters.filter_conversationIds ?? [];
  const selectedWithMemberIds = filters.filter_participantIds ?? [];

  const [huddleTypeOpen, setHuddleTypeOpen] = useState(false);
  const huddleTypeValue = filters.type ?? "all";

  const handleInSelectionChange = (channelIds: string[], conversationIds: string[]) => {
    onFiltersChange({
      ...filters,
      filter_channelIds: channelIds,
      filter_conversationIds: conversationIds,
    });
  };

  const handleWithSelectionChange = (memberIds: string[]) => {
    onFiltersChange({
      ...filters,
      filter_participantIds: memberIds,
    });
  };

  const handleHuddleTypeChange = (value: "all" | "missed") => {
    // When type changes to 'missed', clear the 'with' filter since it doesn't make sense
    // (missed = huddles user didn't attend, so 'with' filter is contradictory)
    onFiltersChange({
      ...filters,
      type: value as "all" | "missed",
      filter_participantIds: value === "missed" ? undefined : filters.filter_participantIds,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-4 sm:flex-row">
        <HuddleTypeFilter
          value={huddleTypeValue}
          open={huddleTypeOpen}
          onOpenChange={setHuddleTypeOpen}
          onChange={handleHuddleTypeChange}
        />

        <InFilterPopover
          workspaceId={workspaceId}
          selectedChannelIds={selectedChannelIds}
          selectedConversationIds={selectedConversationIds}
          onSelectionChange={handleInSelectionChange}
        />

        {!hideWith && (
          <WithFilterPopover
            workspaceId={workspaceId}
            selectedMemberIds={selectedWithMemberIds}
            onSelectionChange={handleWithSelectionChange}
          />
        )}
      </div>
    </div>
  );
}
