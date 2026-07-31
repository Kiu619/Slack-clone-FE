"use client";

import { useState } from "react";
import Link from "next/link";
import { TbHistoryToggle } from "react-icons/tb";
import { FiHash } from "react-icons/fi";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { useAuth } from "@/hooks/use-auth";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import { useWorkspaceRecents } from "@/hooks/use-workspace-recents";
import { getDmDisplayName, isDeactivatedUser } from "@/lib/dm-members";
import type { Channel, DirectMessageConversation, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { UserPresenceIndicator } from "./user-presence-indicator";
import { MdOutlineLock } from "react-icons/md";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface RecentToolbarPopoverProps {
  workspaceId: string;
}

export const RecentToolbarPopover = ({
  workspaceId,
}: RecentToolbarPopoverProps) => {
  const [open, setOpen] = useState(false);
  const { user: currentUser } = useAuth();
  const { data: recentsData, isLoading } = useWorkspaceRecents(workspaceId);
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useConversations(workspaceId);

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: User) =>
    mergeUserForDisplay(m, memberOverlayMap[m.id]);

  const channelById = new Map(channels.map((c) => [c.id, c]));
  const convById = new Map(conversations.map((c) => [c.id, c]));

  const getConversationName = (members: User[]) => {
    return getDmDisplayName(members, currentUser?.id, displayMember);
  };

  const getConversationAvatar = (members: User[], isGroup: boolean) => {
    const otherMembers = members.filter((m) => m.id !== currentUser?.id);

    if (!isGroup || otherMembers.length === 1) {
      const member = otherMembers[0] ?? currentUser;
      if (!member) {
        return (
          <Avatar className="size-4">
            <AvatarFallback className="bg-sky-500 text-white text-[10px]">
              U
            </AvatarFallback>
          </Avatar>
        );
      }
      const d = displayMember(member as User);
      return (
        <Avatar className="size-4">
          <AvatarImage src={d.avatar || ""} />
          <AvatarFallback className="bg-sky-500 text-white text-[10px]">
            {(d.displayName || d.name || "U").substring(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      );
    }

    return (
      <AvatarGroup>
        {otherMembers.slice(0, 2).map((member) => {
          const d = displayMember(member);
          return (
            <Avatar key={member.id} className="size-4">
              <AvatarImage src={d.avatar || ""} />
              <AvatarFallback className="text-[8px]">
                {(d.displayName || d.name || "U").substring(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          );
        })}
      </AvatarGroup>
    );
  };

  const items = recentsData?.items ?? [];

  const close = () => setOpen(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="rounded-md p-1 text-white/90 outline-none transition-colors hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="Recent channels and conversations"
            >
              <TbHistoryToggle size={18} />
            </button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>
          <Typography
            text="Recent channels and conversations"
            variant="p"
            className="text-[13px] font-medium text-neutral-300"
          />
        </TooltipContent>
      </Tooltip>
      <PopoverContent
        withOverlay
        side="bottom"
        align="start"
        sideOffset={6}
        className="w-72 max-h-80 overflow-y-auto border border-[#797c814d] p-0 shadow-lg"
      >
        <div className="border-b border-[#797c814d] px-3 py-2">
          <Typography
            text="Recent"
            variant="p"
            className="text-[13px] font-medium text-neutral-300"
          />
        </div>
        {isLoading ? (
          <div className="space-y-2 px-3 py-4">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="flex items-center gap-2">
                <Skeleton className="size-4 rounded-full bg-white/10" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3 w-2/3 bg-white/10" />
                  <Skeleton className="h-3 w-1/3 bg-white/10" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="px-3 py-4">
            <Typography
              text="No recent channels or DMs yet."
              variant="p"
              className="text-xs text-neutral-500"
            />
          </div>
        ) : (
          <div className="flex flex-col py-2">
            {items.map((entry) => {
              if (entry.kind === "channel") {
                const ch: Channel | undefined = channelById.get(entry.id);
                if (!ch) return null;
                return (
                  <Link
                    key={`r-ch-${entry.id}`}
                    href={`/workspace/${workspaceId}/channel/${ch.id}`}
                    onClick={close}
                  >
                    <Button variant="submenu">
                      {ch.isPrivate ? (
                        <MdOutlineLock
                          size={14}
                          className="shrink-0 text-neutral-400"
                        />
                      ) : (
                        <FiHash
                          size={14}
                          className="shrink-0 text-neutral-400"
                        />
                      )}
                      <Typography
                        text={ch.name}
                        variant="p"
                        className="text-[14px]! truncate text-inherit"
                      />
                    </Button>
                  </Link>
                );
              }

              const conv: DirectMessageConversation | undefined = convById.get(
                entry.id,
              );
              if (!conv) return null;
              const others = conv.members.filter(
                (m) => m.id !== currentUser?.id,
              );
              const isOneToOne = !conv.isGroup && others.length === 1;
              const peer = isOneToOne ? displayMember(others[0]!) : null;
              const peerIsDeactivated = isDeactivatedUser(peer);

              return (
                <Link
                  key={`r-dm-${entry.id}`}
                  href={`/workspace/${workspaceId}/dm/${conv.id}`}
                  onClick={close}
                >
                  <Button variant="submenu">
                    <div className="relative shrink-0">
                      {getConversationAvatar(conv.members, conv.isGroup)}
                      {isOneToOne && peer && !peerIsDeactivated ? (
                        <div className="absolute -right-0.5 -bottom-0.5">
                          <UserPresenceIndicator
                            workspaceId={workspaceId}
                            userId={peer.id}
                            isAway={peer.isAway}
                            size="sm"
                          />
                        </div>
                      ) : null}
                    </div>
                    {isOneToOne && peer ? (
                      <div className="flex min-w-0 flex-1 items-center gap-1">
                        <Typography
                          text={getConversationName(conv.members)}
                          variant="p"
                          className="text-[14px]! text-inherit"
                        />
                        {!peerIsDeactivated ? (
                          <UserStatusEmojiInline
                            statusEmoji={peer.statusEmoji}
                            statusText={peer.statusText}
                            emojiClassName="text-[13px]"
                            interactive={false}
                          />
                        ) : null}
                      </div>
                    ) : (
                      <Typography
                        text={getConversationName(conv.members)}
                        variant="p"
                        className="text-[14px]! min-w-0 flex-1 truncate text-inherit"
                      />
                    )}
                  </Button>
                </Link>
              );
            })}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
};
