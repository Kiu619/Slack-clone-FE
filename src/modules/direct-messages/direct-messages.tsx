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
import Typography from "@/components/ui/typography";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-conversations";
import type { User, Workspace } from "@/lib/types";
import { Theme } from "@/stores/useThemeStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";

const DirectMessages = ({ theme, currentWorkspaceData }: { theme: Theme; currentWorkspaceData: Workspace }) => {
  const params = useParams<{ workspaceId: string; conversationId?: string }>();
  const { user: currentUser } = useAuth();
  const { data: conversations, isLoading } = useConversations(
    params.workspaceId,
  );
  const [open, setOpen] = useState(true);

  const workspaceId = params.workspaceId ?? currentWorkspaceData.id;
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: User) =>
    mergeUserForDisplay(m, memberOverlayMap[m.id]);

  /** Đã star → chỉ hiện dưới Starred, không lặp ở Direct Messages */
  const conversationsInSidebar = useMemo(
    () => (conversations ?? []).filter((c) => !c.starredAt),
    [conversations],
  );

  const getConversationName = (members: User[]) => {
    const otherMembers = members.filter((m) => m.id !== currentUser?.id);
    if (otherMembers.length === 0) return "You";
    return otherMembers
      .map((m) => {
        const d = displayMember(m);
        return d.displayName || d.name || d.email || "";
      })
      .join(", ");
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
            {(d.displayName || d.name || "U")
              .substring(0, 2)
              .toUpperCase()}
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
                {(d.displayName || d.name || "U")
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
        <div className="flex items-center justify-between gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md">
          {open ? (
            <FaCaretDown size={15} className="text-workspace-side-panel-text" />
          ) : (
            <FaCaretRight
              size={15}
              className="text-workspace-side-panel-text"
            />
          )}
          <Typography
            text="Direct Messages"
            variant="p"
            className="text-[15px]! font-medium text-workspace-side-panel-text flex-1"
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent className="flex flex-col gap-y-0.5">
        {isLoading ? (
          <div className="px-9 py-2">
            <Typography
              text="Loading..."
              variant="p"
              className="text-xs text-workspace-side-panel-text/50"
            />
          </div>
        ) : (
          conversationsInSidebar.map((conv) => {
            const isActive = params.conversationId === conv.id;
            const others = conv.members.filter((m) => m.id !== currentUser?.id);
            const isOneToOne = !conv.isGroup && others.length === 1;
            const peer = isOneToOne ? displayMember(others[0]!) : null;

            return (
              <Link
                href={`/workspace/${currentWorkspaceData.id}/dm/${conv.id}`}
                key={conv.id}
              >
                <div
                  className={`flex items-center gap-x-2 px-3 py-1 cursor-pointer rounded-md transition-colors ${
                    isActive ? "text-white" : "hover:bg-[rgba(255,255,255,0.1)]"
                  }`}
                  style={
                    isActive ? { backgroundColor: theme.selectedItems } : {}
                  }
                >
                  {getConversationAvatar(conv.members, conv.isGroup)}
                  {isOneToOne && peer ? (
                    <div className="flex min-w-0 flex-1 items-center gap-1">
                      <Typography
                        text={getConversationName(conv.members)}
                        variant="p"
                        className="text-[14px]! text-workspace-side-panel-text"
                      />
                      <UserStatusEmojiInline
                        statusEmoji={peer.statusEmoji}
                        statusText={peer.statusText}
                        emojiClassName={cn(
                          "text-[13px]",
                          isActive && "text-white",
                        )}
                        interactive={Boolean(peer.statusText?.trim())}
                        className={
                          isActive
                            ? "hover:bg-white/15 focus-visible:ring-white/80"
                            : undefined
                        }
                      />
                    </div>
                  ) : (
                    <Typography
                      text={getConversationName(conv.members)}
                      variant="p"
                      className="text-[14px]! min-w-0 flex-1 truncate text-workspace-side-panel-text"
                    />
                  )}
                </div>
              </Link>
            );
          })
        )}

        {!isLoading && conversationsInSidebar.length === 0 && (
          <div className="px-9 py-2">
            <Typography
              text="No messages yet"
              variant="p"
              className="text-xs text-workspace-side-panel-text/50"
            />
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
};

export default DirectMessages;
