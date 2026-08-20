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
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";
import { MENU_ITEM_STYLE } from "@/constants/styles";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import { useSidebarMutedItems } from "@/hooks/use-sidebar-muted-items";
import { useWorkspaceUnreadCounts } from "@/hooks/use-workspace-unread-counts";
import { useAppTranslation } from "@/hooks/use-translation";
import {
  getDmDisplayName,
  isDeactivatedUser,
  isOneToOneWithDeactivatedPeer,
} from "@/lib/dm-members";
import type { User, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Theme } from "@/stores/useThemeStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useMemo, useState } from "react";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";
import { LuTextSearch } from "react-icons/lu";
import { useShallow } from "zustand/react/shallow";
import { HuddleSidebarIndicator } from "@/components/huddle-sidebar-indicator";

const DirectMessages = ({
  theme,
  currentWorkspaceData,
}: {
  theme: Theme;
  currentWorkspaceData: Workspace;
}) => {
  const params = useParams<{ workspaceId: string; conversationId?: string }>();
  const { user: currentUser } = useAuth();
  const { data: conversations, isLoading } = useConversations(params.workspaceId);
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const { dmUnreadById } = useWorkspaceUnreadCounts();
  const t = useAppTranslation("directMessages");

  const workspaceId = params.workspaceId ?? currentWorkspaceData.id;
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = useCallback(
    (member: User) => mergeUserForDisplay(member, memberOverlayMap[member.id]),
    [memberOverlayMap],
  );

  const navigableConversations = useMemo(
    () =>
      (conversations ?? []).filter(
        (conversation) =>
          !isOneToOneWithDeactivatedPeer(
            conversation,
            currentUser?.id,
            displayMember,
          ),
      ),
    [conversations, currentUser?.id, displayMember],
  );

  const unstarredConversations = useMemo(
    () => navigableConversations.filter((conversation) => !conversation.starredAt),
    [navigableConversations],
  );
  const { visibleConversations, mutedConversations, isConversationsReady } =
    useSidebarMutedItems({
      workspaceId,
      conversations: unstarredConversations,
    });
  const activeMutedConversation = useMemo(
    () =>
      mutedConversations.find(
        (conversation) => conversation.id === params.conversationId,
      ) ?? null,
    [mutedConversations, params.conversationId],
  );
  const conversationsToRender = useMemo(
    () =>
      activeMutedConversation
        ? [...visibleConversations, activeMutedConversation]
        : visibleConversations,
    [activeMutedConversation, visibleConversations],
  );
  const mutedConversationsInPopover = useMemo(
    () =>
      activeMutedConversation
        ? mutedConversations.filter(
            (conversation) => conversation.id !== activeMutedConversation.id,
          )
        : mutedConversations,
    [activeMutedConversation, mutedConversations],
  );

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
        {otherMembers.slice(0, 2).map((member, index) => {
          const display = displayMember(member);
          const showCount = index === 1 && otherMembers.length > 2;
          return (
            <Avatar key={member.id} className="size-4">
              <AvatarImage src={display.avatar || ""} />
              <AvatarFallback className="text-[8px]">
                {showCount
                  ? `+${otherMembers.length - 1 > 9 ? "9+" : otherMembers.length - 1}`
                  : (display.displayName || display.name || "U")
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
          className="flex items-center justify-between gap-x-2 rounded-md px-3 py-1 cursor-pointer hover:bg-[rgba(255,255,255,0.1)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <div className="flex min-w-0 flex-1 items-center gap-x-2">
            {open ? (
              <FaCaretDown size={15} className="text-workspace-side-panel-text" />
            ) : (
              <FaCaretRight size={15} className="text-workspace-side-panel-text" />
            )}
            <Typography
              text={t("directMessages")}
              variant="p"
              className="flex-1 text-[15px]! font-medium text-workspace-side-panel-text"
            />
          </div>

          {hovered && isConversationsReady && mutedConversationsInPopover.length > 0 ? (
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
                      <p>{t("mutedConversations")}</p>
                    </TooltipContent>
                  </Tooltip>
                </button>
              </PopoverTrigger>
              <PopoverContent
                side="bottom"
                align="end"

                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
              >
                <div className="flex flex-col gap-1 py-1">
                  <Typography
                    text={t("mutedConversations")}
                    variant="p"
                    className="px-3 pb-1 text-xs font-semibold text-workspace-side-panel-text/70"
                  />
                  {mutedConversationsInPopover.map((conversation) => {
                    const unreadCount =
                      conversation.unreadCount ?? dmUnreadById[conversation.id] ?? 0;
                    const hasUnread = unreadCount > 0;

                    return (
                      <Link
                        href={`/workspace/${currentWorkspaceData.id}/dm/${conversation.id}`}
                        key={`muted-dm-${conversation.id}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className={MENU_ITEM_STYLE}>
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
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-y-0.5">
        {isLoading || !isConversationsReady ? (
          <div className="px-2 py-2" aria-hidden="true" />
        ) : (
          conversationsToRender.map((conversation) => {
            const isActive = params.conversationId === conversation.id;
            const unreadCount =
              conversation.unreadCount ?? dmUnreadById[conversation.id] ?? 0;
            const hasUnread = unreadCount > 0;
            const others = conversation.members.filter(
              (member) => member.id !== currentUser?.id,
            );
            const isOneToOne = !conversation.isGroup && others.length === 1;
            const peer = isOneToOne ? displayMember(others[0]!) : null;
            const peerIsDeactivated = isDeactivatedUser(peer);

            return (
              <Link
                href={`/workspace/${currentWorkspaceData.id}/dm/${conversation.id}`}
                key={conversation.id}
              >
                <div
                  className={`flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer transition-colors ${
                    isActive ? "text-workspace-text-active" : "hover:bg-[rgba(255,255,255,0.1)]"
                  }`}
                  style={isActive ? { backgroundColor: theme.selectedItems } : {}}
                >
                  <div className="relative shrink-0">
                    {getConversationAvatar(conversation.members, conversation.isGroup)}
                    {isOneToOne && peer && !peerIsDeactivated ? (
                      <div className="absolute -right-0.5 -bottom-2">
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
                        text={getConversationName(conversation.members)}
                        variant="p"
                        className={cn(
                          "text-[14px]!",
                          isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text",
                          hasUnread && "font-bold",
                        )}
                      />
                      {!peerIsDeactivated ? (
                        <UserStatusEmojiInline
                          statusEmoji={peer.statusEmoji}
                          statusText={peer.statusText}
                          emojiClassName={cn("text-[13px]", isActive && "text-white")}
                          interactive={Boolean(peer.statusText?.trim())}
                          className={
                            isActive
                              ? "hover:bg-white/15 focus-visible:ring-white/80"
                              : undefined
                          }
                        />
                      ) : null}
                    </div>
                  ) : (
                    <Typography
                      text={getConversationName(conversation.members)}
                      variant="p"
                      className={cn(
                        "min-w-0 flex-1 truncate text-[14px]!",
                        isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text",
                        hasUnread && "font-bold",
                      )}
                    />
                  )}
                  {hasUnread ? (
                    <span className="ml-auto min-w-5 rounded-full bg-[#e01e5a] px-1 text-center text-[11px] font-bold leading-5 text-white h-5">
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  ) : null}
                  <HuddleSidebarIndicator
                    workspaceId={workspaceId}
                    entityType="dm"
                    entityId={conversation.id}
                  />
                </div>
              </Link>
            );
          })
        )}

        {!isLoading && isConversationsReady && visibleConversations.length === 0 ? (
          <div className="px-9 py-2">
            <Typography
              text={t("noMessagesYet")}
              variant="p"
              className="text-xs text-workspace-side-panel-text/50"
            />
          </div>
        ) : null}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DirectMessages;
