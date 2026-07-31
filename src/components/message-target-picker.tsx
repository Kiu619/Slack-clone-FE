"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { FiHash, FiX } from "react-icons/fi";
import { MdOutlineLock } from "react-icons/md";
import { UserPresenceIndicator } from "./user-presence-indicator";
import { MENU_ITEM_STYLE } from "@/constants/styles";

export const MESSAGE_TARGET_ROW_CLASS =
  "flex w-full items-center gap-x-2 px-3 py-2 text-left hover:bg-selection-hover cursor-pointer group"

export const MESSAGE_TARGET_CHIP_CLASS =
  "inline-flex max-w-full items-center gap-x-2 rounded-md bg-sky-500/20 px-2 py-1 text-sm font-medium text-sky-500"

export const MESSAGE_TARGET_REMOVE_CLASS =
  "rounded p-0.5 text-sky-400 hover:text-sky-300"

export const MESSAGE_TARGET_INPUT_WRAP_CLASS =
  "flex min-h-[36px] flex-1 flex-wrap items-center gap-1 rounded-md border border-[#797c814d] bg-white/5 p-1 focus-within:border-selection-hover focus-within:ring-[3px] focus-within:ring-focus-ring"

export const MESSAGE_TARGET_DROPDOWN_CLASS =
  "absolute top-full right-0 left-0 z-50 mt-1 max-h-[300px] overflow-y-auto rounded-md border border-[#797c814d] py-1 shadow-lg bg-white dark:bg-[#1A1D21]"

export type MessageTargetMemberData = {
  id: string;
  displayName?: string | null;
  name?: string | null;
  email: string;
  avatar?: string | null;
  isAway?: boolean | null;
};

export type MessageTargetChannelData = {
  id: string;
  name: string;
  isPrivate: boolean;
};

export type MessageTargetConversationData = {
  id: string;
  memberCount: number;
  memberNames: string;
  memberAvatars?: Array<{
    id: string;
    avatar?: string | null;
    displayName?: string | null;
    name?: string | null;
  }>;
  isGroup?: boolean;
};

type TargetKind = "member" | "channel";

function getMemberLabel(member: MessageTargetMemberData) {
  return member.displayName?.trim() || member.name?.trim() || member.email;
}

function getMemberSecondaryLabel(member: MessageTargetMemberData) {
  return member.name?.trim() || member.email.split("@")[0] || member.email;
}

function getAvatarFallback(label: string) {
  return label.substring(0, 2).toUpperCase();
}

function ChannelIcon({ isPrivate }: { isPrivate: boolean }) {
  return isPrivate ? (
    <MdOutlineLock className="size-4 shrink-0" />
  ) : (
    <FiHash className="size-4 shrink-0" />
  );
}

export function MessageTargetConversationRow({
  conversation,
  onClick,
  className,
}: {
  conversation: MessageTargetConversationData;
  onClick: () => void;
  className?: string;
}) {
  return (
    <div
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(MENU_ITEM_STYLE, className)}
    >
      <ConversationAvatar conversation={conversation} />
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-semibold ">
          {conversation.memberNames}
        </span>
      </div>
    </div>
  );
}

export function MessageTargetConversationChip({
  conversation,
  onRemove,
}: {
  conversation: MessageTargetConversationData;
  onRemove: () => void;
}) {
  return (
    <div className={MESSAGE_TARGET_CHIP_CLASS}>
      <ConversationAvatar conversation={conversation} />
      <span className="max-w-[180px] truncate">{conversation.memberNames}</span>
      <button
        type="button"
        onClick={onRemove}
        className={MESSAGE_TARGET_REMOVE_CLASS}
        aria-label={`Remove ${conversation.memberNames}`}
      >
        <FiX size={14} />
      </button>
    </div>
  );
}

function ConversationAvatar({
  conversation,
}: {
  conversation: MessageTargetConversationData;
}) {
  const members = conversation.memberAvatars ?? [];
  const otherMembers = members;
  const isGroup = conversation.isGroup ?? otherMembers.length > 1;

  if (!isGroup || otherMembers.length === 1) {
    const member = otherMembers[0];
    const label = member?.displayName?.trim() || member?.name?.trim() || "U";
    return (
      <Avatar className="size-5 shrink-0 rounded-md">
        <AvatarImage src={member?.avatar || ""} />
        <AvatarFallback className="rounded-md bg-sky-500 text-xs ">
          {getAvatarFallback(label)}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <AvatarGroup className="shrink-0">
      {otherMembers.slice(0, 2).map((member, index) => {
        const label = member.displayName?.trim() || member.name?.trim() || "U";
        const showCount = index === 1 && otherMembers.length > 2;
        return (
          <Avatar key={member.id} className="size-5">
            <AvatarImage src={member.avatar || ""} />
            <AvatarFallback className="text-[8px]">
              {showCount
                ? `+${otherMembers.length - 1 > 9 ? "9+" : otherMembers.length - 1}`
                : getAvatarFallback(label).substring(0, 1)}
            </AvatarFallback>
          </Avatar>
        );
      })}
    </AvatarGroup>
  );
}

export function MessageTargetSearchRow({
  workspaceId,
  kind,
  member,
  channel,
  onClick,
  className,
}: {
  workspaceId: string;
  kind: TargetKind;
  member?: MessageTargetMemberData;
  channel?: MessageTargetChannelData;
  onClick: () => void;
  className?: string;
}) {
  if (kind === "member") {
    if (!member) return null;
    const primary = getMemberLabel(member);
    const secondary = getMemberSecondaryLabel(member);
    return (
      <div
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
        className={cn(
          MENU_ITEM_STYLE,
          className,
        )}
      >
        <Avatar className="size-5 rounded-lg shrink-0">
          <AvatarImage src={member.avatar || ""} />
          <AvatarFallback className="bg-sky-500 rounded-lg text-xs">
            {getAvatarFallback(primary)}
          </AvatarFallback>
        </Avatar>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span className="truncate text-sm font-bold ">{primary}</span>
          <UserPresenceIndicator
            workspaceId={workspaceId}
            userId={member.id}
            isAway={member.isAway}
            size="sm"
          />
          <span className="truncate text-sm text-gray-300 group-hover:text-sky-100">
            {secondary}
          </span>
        </div>
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      className={cn(MENU_ITEM_STYLE, className)}
    >
      <div className="flex size-5 shrink-0 items-center justify-center rounded-lg">
        <ChannelIcon isPrivate={channel.isPrivate} />
      </div>
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="truncate text-sm font-semibold ">
          {channel.name}
        </span>
      </div>
    </div>
  );
}

export function MessageTargetChip({
  kind,
  member,
  channel,
  onRemove,
}: {
  kind: TargetKind;
  member?: MessageTargetMemberData;
  channel?: MessageTargetChannelData;
  onRemove: () => void;
}) {
  if (kind === "member") {
    if (!member) return null;
    const label = getMemberLabel(member);
    return (
      <div className={MESSAGE_TARGET_CHIP_CLASS}>
        <Avatar className="size-5 rounded-md">
          <AvatarImage src={member.avatar || ""} />
          <AvatarFallback className="rounded-md bg-sky-500 text-[10px] ">
            {getAvatarFallback(label)}
          </AvatarFallback>
        </Avatar>
        <span className="max-w-[180px] truncate">{label}</span>
        <button
          type="button"
          onClick={onRemove}
          className={MESSAGE_TARGET_REMOVE_CLASS}
          aria-label={`Remove ${label}`}
        >
          <FiX size={14} />
        </button>
      </div>
    );
  }

  if (!channel) return null;

  return (
    <div className={MESSAGE_TARGET_CHIP_CLASS}>
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-sky-500/10">
        <ChannelIcon isPrivate={channel.isPrivate} />
      </span>
      <span className="max-w-45 truncate">{channel.name}</span>
      <button
        type="button"
        onClick={onRemove}
        className={MESSAGE_TARGET_REMOVE_CLASS}
        aria-label={`Remove ${channel.name}`}
      >
        <FiX size={14} />
      </button>
    </div>
  );
}
