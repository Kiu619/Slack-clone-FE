"use client";

import {
  MESSAGE_TARGET_DROPDOWN_CLASS,
  MessageTargetConversationRow,
  MessageTargetSearchRow,
} from "@/components/message-target-picker";
import { Button } from "@/components/ui/button";
import type { Channel, DirectMessageConversation, WorkspaceMember } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore";
import { createPortal } from "react-dom";
import { HAS_FILTER_OPTIONS, IS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from "./constants";
import type { HasFilterType, IsFilterType, TypeFilterType } from "./types";
import { getConversationSummary, getMemberLabel } from "./utils";

type Props = {
  workspaceId: string;
  dropdownRect: DOMRect | null;
  fromPickerOpen: boolean;
  withPickerOpen: boolean;
  inPickerOpen: boolean;
  hasPickerOpen: boolean;
  isPickerOpen: boolean;
  typePickerOpen: boolean;
  filteredMembers: WorkspaceMember[];
  filteredWithMembers: WorkspaceMember[];
  filteredInChannels: Channel[];
  filteredInConversations: DirectMessageConversation[];
  currentUserId?: string;
  memberOverlayMap: Record<string, WorkspaceMemberDisplay | undefined>;
  dropdownWrapRef: React.RefObject<HTMLDivElement | null>;
  onSelectFromMember: (member: WorkspaceMember) => void;
  onSelectWithMember: (member: WorkspaceMember) => void;
  onSelectInChannel: (channel: Channel) => void;
  onSelectInConversation: (conversation: DirectMessageConversation) => void;
  onSelectHasFilter: (type: HasFilterType) => void;
  onSelectIsFilter: (type: IsFilterType) => void;
  onSelectTypeFilter: (type: TypeFilterType) => void;
};

export function GlobalSearchDropdownPortal(props: Props) {
  const {
    workspaceId,
    dropdownRect,
    fromPickerOpen,
    withPickerOpen,
    inPickerOpen,
    hasPickerOpen,
    isPickerOpen,
    typePickerOpen,
    filteredMembers,
    filteredWithMembers,
    filteredInChannels,
    filteredInConversations,
    currentUserId,
    memberOverlayMap,
    dropdownWrapRef,
    onSelectFromMember,
    onSelectWithMember,
    onSelectInChannel,
    onSelectInConversation,
    onSelectHasFilter,
    onSelectIsFilter,
    onSelectTypeFilter,
  } = props;

  if (!dropdownRect || typeof document === "undefined") return null;
  if (!fromPickerOpen && !withPickerOpen && !inPickerOpen && !hasPickerOpen && !isPickerOpen && !typePickerOpen) {
    return null;
  }

  return createPortal(
    <div
      ref={dropdownWrapRef}
      className={cn("fixed overflow-hidden", MESSAGE_TARGET_DROPDOWN_CLASS)}
      onMouseDown={(event) => {
        // Keep focus on the search input when selecting a chip option.
        event.preventDefault();
      }}
      style={{
        top: dropdownRect.bottom + 8,
        left: dropdownRect.left,
        width: Math.max(420, dropdownRect.width),
        zIndex: 9999,
      }}
    >
      <div className="max-h-72 overflow-y-auto py-1">
        {fromPickerOpen && filteredMembers.length > 0 ? (
          filteredMembers.map((member) => {
            const label = getMemberLabel(member);
            return (
              <MessageTargetSearchRow
                key={member.id}
                workspaceId={workspaceId}
                kind="member"
                member={{
                  id: member.id,
                  displayName: member.displayName || member.name || label,
                  name: member.name || member.email.split("@")[0] || member.email,
                  email: member.email || "",
                  avatar: member.avatar || null,
                  isAway: member.isAway,
                }}
                onClick={() => onSelectFromMember(member)}
              />
            );
          })
        ) : null}

        {withPickerOpen && filteredWithMembers.length > 0 ? (
          filteredWithMembers.map((member) => {
            const label = getMemberLabel(member);
            return (
              <MessageTargetSearchRow
                key={member.id}
                workspaceId={workspaceId}
                kind="member"
                member={{
                  id: member.id,
                  displayName: member.displayName || member.name || label,
                  name: member.name || member.email.split("@")[0] || member.email,
                  email: member.email || "",
                  avatar: member.avatar || null,
                  isAway: member.isAway,
                }}
                onClick={() => onSelectWithMember(member)}
              />
            );
          })
        ) : null}

        {inPickerOpen && (filteredInChannels.length > 0 || filteredInConversations.length > 0) ? (
          <div>
            <div className="px-3 py-2 text-xs uppercase tracking-wide text-neutral-400">Suggestions</div>
            {filteredInChannels.map((channel) => (
              <MessageTargetSearchRow
                key={channel.id}
                workspaceId={workspaceId}
                kind="channel"
                channel={channel}
                onClick={() => onSelectInChannel(channel)}
              />
            ))}
            {filteredInConversations.map((conversation) => {
              const summary = getConversationSummary(conversation, currentUserId, memberOverlayMap);
              return (
                <MessageTargetConversationRow
                  key={conversation.id}
                  conversation={{
                    id: conversation.id,
                    memberCount: conversation.members.length,
                    memberNames: summary.label,
                    memberAvatars: summary.memberAvatars,
                    isGroup: conversation.isGroup,
                  }}
                  onClick={() => onSelectInConversation(conversation)}
                />
              );
            })}
          </div>
        ) : null}

        {hasPickerOpen ? (
          <>
            {HAS_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  variant="submenu"
                  key={option.id}
                  type="button"
                  onClick={() => onSelectHasFilter(option.id)}
                >
                  <Icon size={16} />
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </>
        ) : null}

        {isPickerOpen ? (
          <>
            {IS_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button
                  variant="submenu"
                  key={option.id}
                  type="button"
                  onClick={() => onSelectIsFilter(option.id)}
                >
                  <Icon size={16} />
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </>
        ) : null}

        {typePickerOpen ? (
          <>
            {TYPE_FILTER_OPTIONS.map((option) => {
              const Icon = option.icon;
              return (
                <Button 
                  variant="submenu"
                  key={option.id}
                  type="button"
                  onClick={() => onSelectTypeFilter(option.id)}
                >
                  <Icon size={16} />
                  <span>{option.label}</span>
                </Button>
              );
            })}
          </>
        ) : null}

        {fromPickerOpen && filteredMembers.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-neutral-500">No people found</div>
        ) : null}
        {withPickerOpen && filteredWithMembers.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-neutral-500">No people found</div>
        ) : null}
        {inPickerOpen && filteredInChannels.length === 0 && filteredInConversations.length === 0 ? (
          <div className="px-4 py-5 text-center text-sm text-neutral-500">No results found</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
