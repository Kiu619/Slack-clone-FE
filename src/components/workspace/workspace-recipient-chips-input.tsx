"use client";

import type {
  Channel,
  DirectMessageConversation,
  WorkspaceMember,
} from "@/lib/types";
import type {
  ForwardRecipientTargetType,
  ForwardSelectedTarget,
} from "@/hooks/use-forward-recipient-search";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import {
  MESSAGE_TARGET_DROPDOWN_CLASS,
  MESSAGE_TARGET_INPUT_WRAP_CLASS,
  MessageTargetChip,
  MessageTargetConversationChip,
  MessageTargetConversationRow,
  MessageTargetSearchRow,
} from "@/components/message-target-picker";

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
  currentUserId,
}: WorkspaceRecipientChipsInputProps) => {
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  return (
    <div className="relative" ref={searchRef}>
      <div className={MESSAGE_TARGET_INPUT_WRAP_CLASS}>
        {selectedTargets.map((target) => {
          if (target.type === "member") {
            const member = target.data as WorkspaceMember;
            return (
              <MessageTargetChip
                key={`${target.type}-${target.id}`}
                kind="member"
                member={{
                  id: member.id,
                  displayName: member.displayName ?? member.name ?? member.email,
                  name: member.name ?? member.email.split("@")[0] ?? member.email,
                  email: member.email,
                  avatar: member.avatar ?? null,
                }}
                onRemove={() => onRemoveTarget(target.id, target.type)}
              />
            );
          }

          if (target.type === "channel") {
            const channel = target.data;
            return (
              <MessageTargetChip
                key={`${target.type}-${target.id}`}
                kind="channel"
                channel={{
                  id: channel.id,
                  name: channel.name,
                  isPrivate: channel.isPrivate,
                }}
                onRemove={() => onRemoveTarget(target.id, target.type)}
              />
            );
          }

          const conversation = target.data;
          const otherMembers = conversation.members.filter((m) => m.id !== currentUserId);
          return (
            <MessageTargetConversationChip
              key={`${target.type}-${target.id}`}
              conversation={{
                id: conversation.id,
                memberCount: conversation.members.length,
                memberNames:
                  otherMembers
                    .map((m) => {
                      const d = useWorkspaceMemberStore.getState().byWorkspace[workspaceId]?.[m.id];
                      return d?.displayName || d?.name || m.name || m.email || "";
                    })
                    .filter(Boolean)
                    .join(", ") || target.name,
                memberAvatars: conversation.members.map((m) => ({
                  id: m.id,
                  avatar: m.avatar,
                  displayName: m.displayName,
                  name: m.name,
                })),
                isGroup: conversation.isGroup,
              }}
              onRemove={() => onRemoveTarget(target.id, target.type)}
            />
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
        <div className={MESSAGE_TARGET_DROPDOWN_CLASS}>
          {filteredResults.channels.length === 0 &&
            filteredResults.members.length === 0 &&
            filteredResults.conversations.length === 0 && (
              <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
            )}

          {filteredResults.conversations.map((conv) => (
            <MessageTargetConversationRow
              key={conv.id}
              conversation={{
                id: conv.id,
                memberCount: conv.members.length,
                memberNames: conv.members
                  .filter((m) => m.id !== currentUserId)
                  .map((m) => {
                    const d = useWorkspaceMemberStore.getState().byWorkspace[workspaceId]?.[m.id];
                    return (d?.displayName || d?.name || m.name || m.email || "");
                  })
                  .join(", "),
                memberAvatars: conv.members.map((m) => ({
                  id: m.id,
                  avatar: m.avatar,
                  displayName: m.displayName,
                  name: m.name,
                })),
                isGroup: true,
              }}
              onClick={() => onSelectConversation(conv)}
            />
          ))}

          {filteredResults.channels.map((ch) => (
            <MessageTargetSearchRow
              key={ch.id}
              workspaceId={workspaceId}
              kind="channel"
              channel={ch}
              onClick={() => onSelectChannel(ch)}
            />
          ))}

          {filteredResults.members.map((member) => {
            return (
              <MessageTargetSearchRow
                key={member.id}
                workspaceId={workspaceId}
                kind="member"
                member={member}
                onClick={() => onSelectMember(member)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
};
