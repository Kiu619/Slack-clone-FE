"use client";

import { FiX } from "react-icons/fi";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type {
  Channel,
  DirectMessageConversation,
  User,
  WorkspaceMember,
} from "@/lib/types";
import type {
  ForwardRecipientTargetType,
  ForwardSelectedTarget,
} from "@/hooks/use-forward-recipient-search";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";

type Filtered = {
  channels: Channel[];
  members: WorkspaceMember[];
  conversations: DirectMessageConversation[];
};

interface WorkspaceRecipientChipsInputProps {
  workspaceId: string;
  searchRef: React.RefObject<HTMLDivElement | null>;
  selectedTargets: ForwardSelectedTarget[];
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchFocus: () => void;
  placeholder: string;
  isDropdownOpen: boolean;
  filteredResults: Filtered;
  onSelectChannel: (ch: Channel) => void;
  onSelectMember: (m: WorkspaceMember) => void;
  onSelectConversation: (c: DirectMessageConversation) => void;
  onRemoveTarget: (id: string, type: ForwardRecipientTargetType) => void;
  displayMember: (m: WorkspaceMember) => ReturnType<typeof mergeUserForDisplay>;
  currentUserId?: string;
}

export const WorkspaceRecipientChipsInput = ({
  workspaceId,
  searchRef,
  selectedTargets,
  searchQuery,
  onSearchChange,
  onSearchFocus,
  placeholder,
  isDropdownOpen,
  filteredResults,
  onSelectChannel,
  onSelectMember,
  onSelectConversation,
  onRemoveTarget,
  displayMember,
  currentUserId,
}: WorkspaceRecipientChipsInputProps) => {
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  return (
    <div className="relative" ref={searchRef}>
      <div className="flex min-h-[36px] flex-1 flex-wrap items-center gap-1 rounded-md border border-[#797c814d] bg-white/5 p-1 focus-within:ring-1 focus-within:ring-sky-500">
        {selectedTargets.map((target) => {
          const chipLabel =
            target.type === "member"
              ? (() => {
                  const m = target.data as WorkspaceMember;
                  const d = displayMember(m);
                  return d.displayName || d.name || m.email;
                })()
              : target.type === "channel"
                ? target.name
                : target.name;
          const chipText =
            target.type === "channel"
              ? `# ${chipLabel}`
              : target.type === "member"
                ? `@ ${chipLabel}`
                : chipLabel;
          return (
            <div
              key={`${target.type}-${target.id}`}
              className="flex max-w-full items-center gap-x-1 rounded bg-sky-500/20 px-2 py-0.5 text-sm font-medium text-sky-500"
            >
              <span className="truncate">{chipText}</span>
              <button
                type="button"
                onClick={() => onRemoveTarget(target.id, target.type)}
                className="hover:text-sky-400"
              >
                <FiX size={14} />
              </button>
            </div>
          );
        })}

        <input
          className="min-w-[120px] flex-1 border-none bg-transparent px-2 py-1 text-sm outline-none placeholder:text-gray-500"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={onSearchFocus}
        />
      </div>

      {isDropdownOpen && (
        <div className="absolute top-full right-0 left-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-[#797c814d] bg-[#1A1D21] py-1 shadow-lg">
          {filteredResults.channels.length === 0 &&
            filteredResults.members.length === 0 &&
            filteredResults.conversations.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
            )}

          {filteredResults.conversations.map((conv) => (
            <div
              key={conv.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectConversation(conv)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectConversation(conv);
                }
              }}
              className="group flex cursor-pointer items-center gap-x-2 px-3 py-2 hover:bg-sky-600"
            >
              <div className="relative flex size-8 items-center justify-center rounded-lg bg-gray-700 font-bold text-white">
                <Avatar className="size-8 rounded-lg">
                  <AvatarFallback className="rounded-lg bg-green-600 text-xs text-white">
                    {conv.members.length}
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-white">
                  {conv.members
                    .filter((m) => m.id !== currentUserId)
                    .map((m) => {
                      const d = mergeUserForDisplay(
                        m as User,
                        memberOverlayMap[m.id],
                      );
                      return d.displayName || d.name || "";
                    })
                    .join(", ")}
                </span>
                <span className="truncate text-xs text-gray-400 group-hover:text-sky-100">
                  Group DM
                </span>
              </div>
            </div>
          ))}

          {filteredResults.channels.map((ch) => (
            <div
              key={ch.id}
              role="button"
              tabIndex={0}
              onClick={() => onSelectChannel(ch)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onSelectChannel(ch);
                }
              }}
              className="group flex cursor-pointer items-center gap-x-2 px-3 py-2 hover:bg-sky-600"
            >
              <div className="flex size-8 items-center justify-center rounded-lg bg-gray-700 text-sm font-bold text-white">
                #
              </div>
              <div className="flex min-w-0 flex-col">
                <span className="truncate text-sm font-bold text-white">{ch.name}</span>
                <span className="truncate text-xs text-gray-400 group-hover:text-sky-100">
                  Channel
                </span>
              </div>
            </div>
          ))}

          {filteredResults.members.map((member) => {
            const d = displayMember(member);
            return (
              <div
                key={member.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectMember(member)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectMember(member);
                  }
                }}
                className="group flex cursor-pointer items-center gap-x-2 px-3 py-2 hover:bg-sky-600"
              >
                <Avatar className="size-8 rounded-lg">
                  <AvatarImage src={d.avatar || ""} />
                  <AvatarFallback className="rounded-lg bg-sky-500 text-xs text-white">
                    {(d.displayName || d.name || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-sm font-bold text-white">
                    {d.displayName || d.name}
                  </span>
                  <span className="truncate text-xs text-gray-400 group-hover:text-sky-100">
                    {member.email}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
