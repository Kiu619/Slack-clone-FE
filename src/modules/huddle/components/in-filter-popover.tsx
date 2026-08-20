"use client";

import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";
import { useAuth } from "@/hooks/use-auth";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import type { Channel, DirectMessageConversation, User } from "@/lib/types";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { ChevronDown } from "lucide-react";
import { FiHash } from "react-icons/fi";
import { MdOutlineLock } from "react-icons/md";
import { useCallback, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useAppTranslation } from "@/hooks/use-translation";

type InFilterPopoverProps = {
  workspaceId: string;
  selectedChannelIds: string[];
  selectedConversationIds: string[];
  onSelectionChange: (channelIds: string[], conversationIds: string[]) => void;
};

type ConversationSummary = {
  label: string;
  memberAvatars: Array<{
    id: string;
    avatar: string;
    displayName: string;
    name: string;
  }>;
};

type MemberOverlayMap = Record<string, Partial<User>>;

function getMemberOverlay(overlayMap: MemberOverlayMap, memberId: string) {
  return overlayMap[memberId] as User | undefined;
}

function getConversationSummary(
  conversation: DirectMessageConversation,
  currentUserId: string | undefined,
  overlayMap: MemberOverlayMap,
): ConversationSummary {
  const others = conversation.members.filter((m) => m.id !== currentUserId);
  if (!others.length) return { label: "You", memberAvatars: [] };
  const label = others
    .map((member) => {
      const display = mergeUserForDisplay(member as User, getMemberOverlay(overlayMap, member.id));
      return display.displayName || display.name || member.email || "";
    })
    .join(", ");
  const memberAvatars = others.slice(0, 2).map((member) => {
    const display = mergeUserForDisplay(member as User, getMemberOverlay(overlayMap, member.id));
    return {
      id: member.id,
      avatar: display.avatar || "",
      displayName: display.displayName || display.name || member.email || "",
      name: member.name || "",
    };
  });
  return { label, memberAvatars };
}

export function InFilterPopover({
  workspaceId,
  selectedChannelIds,
  selectedConversationIds,
  onSelectionChange,
}: InFilterPopoverProps) {
  const t = useAppTranslation('huddle.filter.inFilter')
  const { user: currentUser } = useAuth();
  const { data: channelsData } = useChannels(workspaceId);
  const { data: conversationsData } = useConversations(workspaceId);

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const [inSearch, setInSearch] = useState("");
  const [openInSearch, setOpenInSearch] = useState(false);

  const toggleChannel = useCallback(
    (channelId: string) => {
      if (selectedChannelIds.includes(channelId)) {
        onSelectionChange(
          selectedChannelIds.filter((id) => id !== channelId),
          selectedConversationIds,
        );
      } else {
        onSelectionChange([...selectedChannelIds, channelId], selectedConversationIds);
      }
    },
    [selectedChannelIds, selectedConversationIds, onSelectionChange],
  );

  const toggleConversation = useCallback(
    (conversationId: string) => {
      if (selectedConversationIds.includes(conversationId)) {
        onSelectionChange(
          selectedChannelIds,
          selectedConversationIds.filter((id) => id !== conversationId),
        );
      } else {
        onSelectionChange(selectedChannelIds, [...selectedConversationIds, conversationId]);
      }
    },
    [selectedChannelIds, selectedConversationIds, onSelectionChange],
  );

  const clearAll = useCallback(() => {
    onSelectionChange([], []);
  }, [onSelectionChange]);

  const selectedChannels = useMemo(
    () => (channelsData ?? []).filter((c: Channel) => selectedChannelIds.includes(c.id)),
    [channelsData, selectedChannelIds],
  );

  const selectedConversations = useMemo(
    () =>
      (conversationsData ?? []).filter((c: DirectMessageConversation) =>
        selectedConversationIds.includes(c.id),
      ),
    [conversationsData, selectedConversationIds],
  );

  const filteredInChannels = useMemo(() => {
    const search = inSearch.trim().toLowerCase();
    return (channelsData ?? [])
      .filter((channel: Channel) => !selectedChannelIds.includes(channel.id))
      .filter((channel: Channel) => (search ? channel.name.toLowerCase().includes(search) : true))
      .slice(0, 6);
  }, [channelsData, selectedChannelIds, inSearch]);

  const filteredInConversations = useMemo(() => {
    const search = inSearch.trim().toLowerCase();
    return (conversationsData ?? [])
      .filter((conversation: DirectMessageConversation) => !selectedConversationIds.includes(conversation.id))
      .filter((conversation: DirectMessageConversation) => {
        if (!search) return true;
        const summary = getConversationSummary(conversation, currentUser?.id, memberOverlayMap);
        return summary.label.toLowerCase().includes(search);
      })
      .slice(0, 6);
  }, [conversationsData, selectedConversationIds, inSearch, currentUser?.id, memberOverlayMap]);

  const selectedInCount = selectedChannels.length + selectedConversations.length;

  const getConversationLabel = useCallback(
    (conv: DirectMessageConversation): string => {
      const summary = getConversationSummary(conv, currentUser?.id, memberOverlayMap);
      return summary.label;
    },
    [currentUser?.id, memberOverlayMap],
  );

  const selectedInLabel = useMemo(() => {
    if (selectedInCount === 0) return t('in');
    if (selectedInCount >= 2) return t('places', { count: selectedInCount });

    const channel = selectedChannels[0];
    if (channel) return channel.name;

    const conversation = selectedConversations[0];
    if (!conversation) return t('in');
    return getConversationLabel(conversation);
  }, [selectedInCount, selectedChannels, selectedConversations, getConversationLabel, t]);

  const selectedInChannel = selectedChannels[0];
  const selectedInConversation = selectedConversations[0];
  const selectedInConversationSummary = selectedInConversation
    ? getConversationSummary(selectedInConversation, currentUser?.id, memberOverlayMap)
    : null;

  const renderChannelRow = (channel: Channel) => {
    const checked = selectedChannelIds.includes(channel.id);
    return (
      <label
        key={channel.id}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleChannel(channel.id)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
        <div className="flex shrink-0 items-center justify-center gap-1 rounded-md">
          {channel.isPrivate ? <MdOutlineLock size={14} /> : <FiHash size={14} />}
          <span className="min-w-0 flex-1 truncate">{channel.name}</span>
        </div>
      </label>
    );
  };

  const renderConversationRow = (conversation: DirectMessageConversation) => {
    const checked = selectedConversationIds.includes(conversation.id);
    const summary = getConversationSummary(conversation, currentUser?.id, memberOverlayMap);
    const avatars = summary.memberAvatars.slice(0, 2);

    return (
      <label
        key={conversation.id}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggleConversation(conversation.id)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
        <AvatarGroup className="shrink-0">
          {avatars.length > 1 ? (
            avatars.map((avatar) => (
              <Avatar key={avatar.id} className="size-6">
                <AvatarImage src={avatar.avatar} />
                <AvatarFallback className="text-[10px]">
                  {(avatar.displayName || avatar.name || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))
          ) : avatars.length === 1 ? (
            <Avatar className="size-6">
              <AvatarImage src={avatars[0]?.avatar || ""} />
              <AvatarFallback className="text-[10px]">
                {(avatars[0]?.displayName || avatars[0]?.name || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          ) : null}
        </AvatarGroup>
        <span className="min-w-0 flex-1 truncate">{summary.label}</span>
      </label>
    );
  };

  return (
    <Popover open={openInSearch} onOpenChange={setOpenInSearch}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "rounded-md bg-transparent p-1",
            selectedInCount > 0 && ACTIVE_ITEM_STYLE,
          )}
        >
          <Typography variant="p" className="text-[13px]" text={t('in')} />
          {selectedInCount === 1 ? (
            <span className="flex max-w-[260px] items-center gap-1 rounded-md text-sm font-medium text-white">
              {selectedInChannel ? (
                <span className="flex size-5 shrink-0 items-center justify-center rounded-md text-neutral-300">
                  {selectedInChannel.isPrivate ? <MdOutlineLock size={14} /> : <FiHash size={14} />}
                </span>
              ) : selectedInConversation ? (
                <AvatarGroup className="shrink-0">
                  {selectedInConversationSummary?.memberAvatars
                    ?.slice(0, 2)
                    .map((member) => (
                      <Avatar key={member.id} className="size-5">
                        <AvatarImage src={member.avatar || ""} />
                        <AvatarFallback className="text-[10px]">
                          {(member.displayName || member.name || "U")
                            .slice(0, 1)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                </AvatarGroup>
              ) : null}
              <span className="max-w-[150px] truncate">{selectedInLabel}</span>
            </span>
          ) : selectedInCount >= 2 ? (
            <Typography variant="p" className="text-[13px]" text={selectedInLabel} />
          ) : null}
          <ChevronDown
            size={13}
            className={cn(
              "transition-transform duration-200",
              openInSearch ? "rotate-180" : "rotate-0",
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
            value={inSearch}
            onChange={(event) => setInSearch(event.target.value)}
            placeholder={t('searchChannelsOrDMs')}
            className="h-8 border-[#797c814d] text-sm"
          />
        </div>
        <div className="max-h-64 overflow-y-auto">
          {selectedInCount > 0 ? (
            <div className="border-b border-[#797c814d] pb-2">
              <div className="px-3 py-2 text-sm text-neutral-400">{t('selected')}</div>
              {selectedChannels.map((channel: Channel) => renderChannelRow(channel))}
              {selectedConversations.map((conversation: DirectMessageConversation) =>
                renderConversationRow(conversation),
              )}
              <span
                className="cursor-pointer px-3 py-2 text-sm text-muted-foreground hover:underline"
                onClick={clearAll}
              >
                {t('clearAll')}
              </span>
            </div>
          ) : null}

          <div className={selectedInCount > 0 ? "pt-1" : ""}>
            <div className="px-3 py-2 text-sm text-neutral-400">{t('suggestions')}</div>
            {filteredInChannels.length === 0 && filteredInConversations.length === 0 ? (
              <div className="px-4 py-3 text-sm text-neutral-400">{t('noResultsFound')}</div>
            ) : (
              <>
                {filteredInChannels.map((channel: Channel) => renderChannelRow(channel))}
                {filteredInConversations.map((conversation: DirectMessageConversation) =>
                  renderConversationRow(conversation),
                )}
              </>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}
