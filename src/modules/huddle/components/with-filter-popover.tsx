"use client";

import { fetchWorkspaceMembersApi } from "@/apis";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";
import { useAuth } from "@/hooks/use-auth";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import type { User, WorkspaceMember } from "@/lib/types";
import { ChevronDown } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";

type WithFilterPopoverProps = {
  workspaceId: string;
  selectedMemberIds: string[];
  onSelectionChange: (memberIds: string[]) => void;
};

export function WithFilterPopover({
  workspaceId,
  selectedMemberIds,
  onSelectionChange,
}: WithFilterPopoverProps) {
  const { user: currentUser } = useAuth();
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const [withSearch, setWithSearch] = useState("");
  const [openWithSearch, setOpenWithSearch] = useState(false);

  const displayMember = useCallback(
    (member: WorkspaceMember) => mergeUserForDisplay(member as User, memberOverlayMap[member.id]),
    [memberOverlayMap],
  );

  const toggleMember = useCallback(
    (memberId: string) => {
      if (selectedMemberIds.includes(memberId)) {
        onSelectionChange(selectedMemberIds.filter((id) => id !== memberId));
      } else {
        onSelectionChange([...selectedMemberIds, memberId]);
      }
    },
    [selectedMemberIds, onSelectionChange],
  );

  const clearAll = useCallback(() => {
    onSelectionChange([]);
  }, [onSelectionChange]);

  const selectedWithMembers = useMemo(
    () => members.filter((m: WorkspaceMember) => selectedMemberIds.includes(m.id)),
    [members, selectedMemberIds],
  );

  const filteredWithMembers = useMemo(() => {
    const search = withSearch.trim().toLowerCase();
    return members
      .filter((member: WorkspaceMember) => member.id !== currentUser?.id)
      .filter((member: WorkspaceMember) => {
        if (!search) return true;
        const display = displayMember(member);
        const haystack = `${display.displayName ?? display.name ?? member.name ?? ""} ${
          display.email ?? member.email ?? ""
        }`
          .trim()
          .toLowerCase();
        return haystack.includes(search);
      })
      .slice(0, 8);
  }, [members, currentUser?.id, withSearch, displayMember]);

  const withButtonLabel = useMemo(() => {
    if (selectedWithMembers.length === 0) return "With";
    if (selectedWithMembers.length >= 2) return `${selectedWithMembers.length} teammates`;

    const [firstMember] = selectedWithMembers;
    const display = displayMember(firstMember);
    return display.displayName || display.name || firstMember.email || firstMember.id;
  }, [selectedWithMembers, displayMember]);

  const selectedWithMember = selectedWithMembers[0];
  const selectedWithMemberDisplay = selectedWithMember ? displayMember(selectedWithMember) : null;

  return (
    <Popover open={openWithSearch} onOpenChange={setOpenWithSearch}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "rounded-md bg-transparent p-1",
            selectedWithMembers.length > 0 && ACTIVE_ITEM_STYLE,
          )}
        >
          <Typography variant="p" className="text-[13px]" text="With" />
          {selectedWithMembers.length === 1 && selectedWithMemberDisplay ? (
            <span className="flex max-w-[260px] items-center gap-2 rounded-md text-sm font-medium">
              <Avatar className="size-5">
                <AvatarImage src={selectedWithMemberDisplay.avatar || ""} />
                <AvatarFallback className="text-[10px]">
                  {(
                    selectedWithMemberDisplay.displayName ||
                    selectedWithMemberDisplay.name ||
                    selectedWithMember?.email ||
                    "U"
                  )
                    .slice(0, 2)
                    .toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[150px] truncate">{withButtonLabel}</span>
            </span>
          ) : selectedWithMembers.length >= 2 ? (
            <Typography variant="p" className="text-[13px]" text={withButtonLabel} />
          ) : null}
          <ChevronDown
            size={13}
            className={cn(
              "transition-transform duration-200",
              openWithSearch ? "rotate-180" : "rotate-0",
            )}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        withOverlay
        side="bottom"
        align="start"
        sideOffset={8}
        className="w-80 py-2"
        onOpenAutoFocus={(event) => event.preventDefault()}
      >
        <div className="px-2 pb-2">
          <Input
            value={withSearch}
            onChange={(event) => setWithSearch(event.target.value)}
            placeholder="Search people..."
            className="h-8 border-[#797c814d] text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {selectedWithMembers.length > 0 ? (
            <div className="border-b border-[#797c814d] pb-2">
              {selectedWithMembers.map((member: WorkspaceMember) => {
                const display = displayMember(member);
                const label = display.displayName || display.name || display.email || member.id;
                return (
                  <label
                    key={member.id}
                    className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
                  >
                    <input
                      type="checkbox"
                      checked
                      onChange={() => toggleMember(member.id)}
                      className="size-3 cursor-pointer accent-selection-hover"
                    />
                    <Avatar className="size-6">
                      <AvatarImage src={display.avatar || ""} />
                      <AvatarFallback className="text-[10px]">
                        {(label || "U").slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="min-w-0 flex-1 truncate">{label}</span>
                  </label>
                );
              })}
              <span
                className="cursor-pointer px-3 py-2 text-sm text-muted-foreground hover:underline"
                onClick={clearAll}
              >
                Clear all
              </span>
            </div>
          ) : null}

          <div className="px-3 py-2 text-sm text-neutral-400">Suggestions</div>
          {filteredWithMembers
            .filter((member: WorkspaceMember) => !selectedMemberIds.includes(member.id))
            .map((member: WorkspaceMember) => {
              const display = displayMember(member);
              const label = display.displayName || display.name || display.email || member.id;
              return (
                <label
                  key={member.id}
                  className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
                >
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleMember(member.id)}
                    className="size-3 cursor-pointer accent-selection-hover"
                  />
                  <Avatar className="size-6">
                    <AvatarImage src={display.avatar || ""} />
                    <AvatarFallback className="text-[10px]">
                      {(label || "U").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="min-w-0 flex-1 truncate">{label}</span>
                </label>
              );
            })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
