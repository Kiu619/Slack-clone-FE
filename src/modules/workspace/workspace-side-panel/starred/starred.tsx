"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import { MENU_ITEM_STYLE } from "@/constants/styles";
import { useAuth } from "@/hooks/use-auth";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import { useSidebarMutedItems } from "@/hooks/use-sidebar-muted-items";
import { usePrefetchSidebarMutedItems } from "@/hooks/use-prefetch-sidebar-muted-items";
import { useWorkspaceUnreadCounts } from "@/hooks/use-workspace-unread-counts";
import { getDmDisplayName } from "@/lib/dm-members";
import type {
  Channel,
  DirectMessageConversation,
  User,
  Workspace,
} from "@/lib/types";
import { type Theme } from "@/stores/useThemeStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";
import { FiHash } from "react-icons/fi";
import { LuTextSearch } from "react-icons/lu";
import { MdOutlineLock } from "react-icons/md";
import { SlStar } from "react-icons/sl";
import { useShallow } from "zustand/react/shallow";

type StarredRow =
  | { kind: "channel"; channel: Channel; starredAt: string }
  | { kind: "dm"; conversation: DirectMessageConversation; starredAt: string };

interface Props {
  theme: Theme;
  currentWorkspaceData: Workspace;
}

const Starred = ({ theme, currentWorkspaceData }: Props) => {
  const params = useParams<{
    workspaceId: string;
    channelId?: string;
    conversationId?: string;
  }>();
  const { user: currentUser } = useAuth();
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);

  const wid = currentWorkspaceData.id;
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((store) => store.byWorkspace[wid] ?? {}),
  );
  const { channelUnreadById, dmUnreadById } = useWorkspaceUnreadCounts();

  const displayMember = (member: User) =>
    mergeUserForDisplay(member, memberOverlayMap[member.id]);

  const { data: channels = [], isLoading: isChannelsLoading } = useChannels(wid);
  const { data: conversations = [], isLoading: isConversationsLoading } =
    useConversations(wid);

  const starredChannels = useMemo(
    () => channels.filter((channel) => channel.starredAt),
    [channels],
  );
  const starredConversations = useMemo(
    () => conversations.filter((conversation) => conversation.starredAt),
    [conversations],
  );
  usePrefetchSidebarMutedItems({
    workspaceId: wid,
    channels: starredChannels,
    conversations: starredConversations,
  });
  const {
    mutedChannelIds,
    mutedConversationIds,
    isChannelsReady,
    isConversationsReady,
  } = useSidebarMutedItems({
    workspaceId: wid,
    channels: starredChannels,
    conversations: starredConversations,
  });
  const isStarredDataReady =
    !isChannelsLoading &&
    !isConversationsLoading &&
    isChannelsReady &&
    isConversationsReady;

  const rows = useMemo(() => {
    const list: StarredRow[] = [];

    for (const channel of starredChannels) {
      if (channel.starredAt && !mutedChannelIds.has(channel.id)) {
        list.push({
          kind: "channel",
          channel,
          starredAt: channel.starredAt,
        });
      }
    }

    for (const conversation of starredConversations) {
      if (conversation.starredAt && !mutedConversationIds.has(conversation.id)) {
        list.push({
          kind: "dm",
          conversation,
          starredAt: conversation.starredAt,
        });
      }
    }

    list.sort(
      (a, b) => new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime(),
    );
    return list;
  }, [mutedChannelIds, mutedConversationIds, starredChannels, starredConversations]);

  const mutedRows = useMemo(() => {
    const list: StarredRow[] = [];

    for (const channel of starredChannels) {
      if (channel.starredAt && mutedChannelIds.has(channel.id)) {
        list.push({
          kind: "channel",
          channel,
          starredAt: channel.starredAt,
        });
      }
    }

    for (const conversation of starredConversations) {
      if (conversation.starredAt && mutedConversationIds.has(conversation.id)) {
        list.push({
          kind: "dm",
          conversation,
          starredAt: conversation.starredAt,
        });
      }
    }

    list.sort(
      (a, b) => new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime(),
    );
    return list;
  }, [mutedChannelIds, mutedConversationIds, starredChannels, starredConversations]);

  const getConversationName = (members: User[]) => {
    return getDmDisplayName(members, currentUser?.id, displayMember);
  };

  const getConversationAvatar = (members: User[], isGroup: boolean) => {
    const otherMembers = members.filter((member) => member.id !== currentUser?.id);

    if (!isGroup || otherMembers.length === 1) {
      const member = otherMembers[0] ?? currentUser;
      if (!member) {
        return (
          <Avatar className="size-4">
            <AvatarFallback className="bg-sky-500 text-[10px] text-white">
              U
            </AvatarFallback>
          </Avatar>
        );
      }

      const display = displayMember(member as User);
      return (
        <Avatar className="size-4">
          <AvatarImage src={display.avatar || ""} />
          <AvatarFallback className="bg-sky-500 text-[10px] text-white">
            {(display.displayName || display.name || "U")
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <AvatarGroup>
        {otherMembers.slice(0, 2).map((member) => {
          const display = displayMember(member);
          return (
            <Avatar key={member.id} className="size-4">
              <AvatarImage src={display.avatar || ""} />
              <AvatarFallback className="text-[8px]">
                {(display.displayName || display.name || "U")
                  .substring(0, 1)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </AvatarGroup>
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div
          className="flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer hover:bg-[rgba(255,255,255,0.1)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {!hovered ? (
            <SlStar size={15} className="text-workspace-side-panel-text" />
          ) : open ? (
            <FaCaretDown size={15} className="text-workspace-side-panel-text" />
          ) : (
            <FaCaretRight size={15} className="text-workspace-side-panel-text" />
          )}

          <Typography
            text="Starred"
            variant="p"
            className="text-[15px]! text-workspace-side-panel-text"
          />

          <div className="ml-auto">
            {hovered && isStarredDataReady && mutedRows.length > 0 ? (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="rounded p-0.5 text-workspace-side-panel-text hover:bg-white/10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span>
                          <LuTextSearch size={14} />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Muted conversations</p>
                      </TooltipContent>
                    </Tooltip>
                  </button>
                </PopoverTrigger>
                <PopoverContent
                  side="bottom"
                  align="end"
                  className="w-80 border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                  onClick={(e) => e.stopPropagation()}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  <div className="flex flex-col gap-1 py-1">
                    <Typography
                      text="Muted conversations"
                      variant="p"
                      className="px-3 pb-1 text-xs font-semibold text-workspace-side-panel-text/70"
                    />
                    {mutedRows.map((row) => {
                      if (row.kind === "channel") {
                        const channel = row.channel;
                        const unreadCount = channelUnreadById[channel.id] ?? 0;
                        const hasUnread = unreadCount > 0;

                        return (
                          <Link
                            key={`muted-starred-channel-${channel.id}`}
                            href={`/workspace/${wid}/channel/${channel.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={MENU_ITEM_STYLE}>
                              {channel.isPrivate ? (
                                <MdOutlineLock
                                  size={14}
                                  className="shrink-0 text-workspace-side-panel-text"
                                />
                              ) : (
                                <FiHash
                                  size={14}
                                  className="shrink-0 text-workspace-side-panel-text"
                                />
                              )}
                              <Typography
                                text={channel.name}
                                variant="p"
                                className="min-w-0 flex-1 truncate text-[14px]! text-workspace-side-panel-text"
                              />
                              {hasUnread ? (
                                <span className="min-w-5 rounded-full bg-[#e01e5a] px-1 text-center text-[11px] font-bold leading-5 text-white h-5">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        );
                      }

                      const conversation = row.conversation;
                      const unreadCount =
                        conversation.unreadCount ?? dmUnreadById[conversation.id] ?? 0;
                      const hasUnread = unreadCount > 0;

                      return (
                        <Link
                          key={`muted-starred-dm-${conversation.id}`}
                          href={`/workspace/${wid}/dm/${conversation.id}`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-black/5 dark:hover:bg-white/10">
                            {getConversationAvatar(
                              conversation.members,
                              conversation.isGroup,
                            )}
                            <Typography
                              text={getConversationName(conversation.members)}
                              variant="p"
                              className="min-w-0 flex-1 truncate text-[14px]! text-workspace-side-panel-text"
                            />
                            {hasUnread ? (
                              <span className="min-w-5 rounded-full bg-[#e01e5a] px-1 text-center text-[11px] font-bold leading-5 text-white h-5">
                                {unreadCount > 99 ? "99+" : unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
          </div>
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {!isStarredDataReady ? (
          <div className="px-3 py-2" aria-hidden="true" />
        ) : rows.length === 0 ? (
          <div className="px-9 py-2">
            <Typography
              text="Gắn sao channel hoặc DM để truy cập nhanh."
              variant="p"
              className="text-xs text-workspace-side-panel-text/50"
            />
          </div>
        ) : (
          rows.map((row) => {
            if (row.kind === "channel") {
              const channel = row.channel;
              const isActive = params.channelId === channel.id;

              return (
                <Link
                  key={`s-ch-${channel.id}`}
                  href={`/workspace/${wid}/channel/${channel.id}`}
                >
                  <div
                    className={`flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer transition-colors ${
                      isActive ? "text-workspace-text-active" : "hover:bg-[rgba(255,255,255,0.1)]"
                    }`}
                    style={isActive ? { backgroundColor: theme.selectedItems } : {}}
                  >
                    {channel.isPrivate ? (
                      <MdOutlineLock
                        size={14}
                        className={isActive ? "shrink-0 text-workspace-text-active" : "shrink-0 text-workspace-side-panel-text"}
                      />
                    ) : (
                      <FiHash
                        size={14}
                        className={isActive ? "shrink-0 text-workspace-text-active" : "shrink-0 text-workspace-side-panel-text"}
                      />
                    )}
                    <Typography
                      text={channel.name}
                      variant="p"
                      className={isActive ? "truncate text-[14px]! text-workspace-text-active" : "truncate text-[14px]! text-workspace-side-panel-text"}
                    />
                  </div>
                </Link>
              );
            }

            const conversation = row.conversation;
            const isActive = params.conversationId === conversation.id;

            return (
              <Link
                key={`s-dm-${conversation.id}`}
                href={`/workspace/${wid}/dm/${conversation.id}`}
              >
                <div
                  className={`flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer transition-colors ${
                    isActive ? "text-workspace-text-active" : "hover:bg-[rgba(255,255,255,0.1)]"
                  }`}
                  style={isActive ? { backgroundColor: theme.selectedItems } : {}}
                >
                  {getConversationAvatar(conversation.members, conversation.isGroup)}
                  <Typography
                    text={getConversationName(conversation.members)}
                    variant="p"
                    className={isActive ? "truncate text-[14px]! text-workspace-text-active" : "truncate text-[14px]! text-workspace-side-panel-text"}
                  />
                </div>
              </Link>
            );
          })
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default Starred;
