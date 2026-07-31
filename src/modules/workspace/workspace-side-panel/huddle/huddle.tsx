"use client";

import Avatar from "@/components/avatar";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import { useAuth } from "@/hooks/use-auth";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import type {
    HuddleParticipantSnapshot,
    HuddleSessionSnapshot,
    HuddleTarget,
} from "@/lib/huddle";
import { openHuddlePreviewWindow } from "@/lib/open-huddle-preview-window";
import { cn } from "@/lib/utils";
import { Theme } from "@/stores/useThemeStore";
import { useWorkspaceHuddlesStore } from "@/stores/useWorkspaceHuddlesStore";
import {
    mergeUserForDisplay,
    useWorkspaceMemberStore,
    type WorkspaceMemberDisplay,
} from "@/stores/useWorkspaceMemberStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo } from "react";
import { RiHeadphoneLine } from "react-icons/ri";
import { useShallow } from "zustand/react/shallow";
type ParticipantAvatarProps = {
  displayUser: {
    id: string;
    name?: string | null;
    displayName?: string | null;
    avatar?: string | null;
  };
  className?: string;
};

function ParticipantAvatar({ displayUser, className }: ParticipantAvatarProps) {
  const alt =
    displayUser.displayName?.trim() || displayUser.name?.trim() || "User";

  return (
    <Avatar
      src={displayUser.avatar ?? null}
      alt={alt}
      className={cn(
        "h-5 w-5 rounded-md border border-white/10 bg-[#0f2f1d]",
        className,
      )}
    />
  );
}

type ParticipantStackProps = {
  participants: HuddleParticipantSnapshot[];
  overlayMap: Record<string, WorkspaceMemberDisplay>;
};

function ParticipantStack({ participants, overlayMap }: ParticipantStackProps) {
  if (participants.length === 0) return null;

  const displayParticipants = participants.map((participant) => {
    const user = {
      id: participant.userId,
      email: "",
      name: participant.name,
      displayName: participant.displayName,
      avatar: participant.avatar,
    };
    return mergeUserForDisplay(user, overlayMap[participant.userId] ?? null);
  });

  if (displayParticipants.length <= 3) {
    return (
      <div className="flex items-center">
        {displayParticipants.map((displayUser, index) => (
          <div key={displayUser.id} className={cn(index > 0 && "-ml-1")}>
            <ParticipantAvatar displayUser={displayUser} />
          </div>
        ))}
      </div>
    );
  }

  const visibleParticipants = displayParticipants.slice(0, 2);
  const remainingCount =
    displayParticipants.length - visibleParticipants.length;

  return (
    <div className="flex items-center">
      {visibleParticipants.map((displayUser, index) => (
        <div key={displayUser.id} className={cn(index > 0 && "-ml-1")}>
          <ParticipantAvatar displayUser={displayUser} />
        </div>
      ))}
      <div className="-ml-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-[#0f2f1d] px-1 text-[10px] font-bold text-white">
        +{remainingCount}
      </div>
    </div>
  );
}

type HuddleEntry = {
  target: HuddleTarget;
  activeSession: HuddleSessionSnapshot | null;
  label: string;
};

interface HuddleItemProps {
  huddle: HuddleEntry;
  workspaceId: string;
  overlayMap: Record<string, WorkspaceMemberDisplay>;
  onOpen: () => void;
}

function HuddleItem({
  huddle,
  workspaceId,
  overlayMap,
  onOpen,
}: HuddleItemProps) {
  const { user: currentUser } = useAuth();
  const { activeSession, label, target } = huddle;

  if (!activeSession) return null;

  // Filter to active participants only
  const activeParticipants = (() => {
    if (!activeSession.participants?.length) return [];

    const uniqueParticipants = new Map<string, HuddleParticipantSnapshot>();
    for (const participant of activeSession.participants) {
      if (participant.leftAt !== null) continue;
      if (participant.membershipStatus !== "active") continue;
      if (!uniqueParticipants.has(participant.userId)) {
        uniqueParticipants.set(participant.userId, participant);
      }
    }

    return Array.from(uniqueParticipants.values());
  })();

  if (activeParticipants.length === 0) return null;

  const participantCount = activeParticipants.length;

  // Build tooltip text
  const getTooltipText = () => {
    const inLabel =
      target.entityType === "channel" ? `in ${label}` : `with ${label}`;

    if (participantCount === 1) {
      const participant = activeParticipants[0];
      const isCurrentUser = participant.userId === currentUser?.id;

      if (isCurrentUser) {
        return `Only you in the huddle ${inLabel}`;
      }

      const displayName = participant.displayName || participant.name || "User";
      return `${displayName} in the huddle ${inLabel}`;
    }

    return `${participantCount} people in the huddle ${inLabel}`;
  };

  const handleOpen = () => {
    openHuddlePreviewWindow({
      workspaceId,
      entityType: target.entityType,
      entityId: target.entityId,
      label,
      mode: "join",
    });
    onOpen();
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-x-2 rounded-md"
          onClick={handleOpen}
        >
          <ParticipantStack
            participants={activeParticipants}
            overlayMap={overlayMap}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <Typography
          text={getTooltipText()}
          variant="p"
          className="text-[13px]!"
        />
      </TooltipContent>
    </Tooltip>
  );
}

interface HuddleListProps {
  workspaceId: string;
}

function HuddleList({ workspaceId }: HuddleListProps) {
  const { user: currentUser } = useAuth();
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useConversations(workspaceId);

  const huddlesByEntity = useWorkspaceHuddlesStore(
    useShallow((s) => s.huddlesByEntity),
  );
  const overlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  // Get DM display name helper
  const getDmName = useMemo(() => {
    return (conversationId: string) => {
      const conversation = conversations.find((c) => c.id === conversationId);
      if (!conversation) return conversationId;

      const otherMembers = conversation.members.filter(
        (m) => m.id !== currentUser?.id,
      );
      if (otherMembers.length === 0) return "Yourself";

      return otherMembers
        .map((m) => {
          const display = mergeUserForDisplay(m, overlayMap[m.id] ?? null);
          return display.displayName || display.name || "User";
        })
        .join(", ");
    };
  }, [conversations, currentUser?.id, overlayMap]);

  // Build list of active huddles the user can join
  const activeHuddles = useMemo((): HuddleEntry[] => {
    const result: HuddleEntry[] = [];

    for (const [, entry] of Object.entries(huddlesByEntity)) {
      // Skip if workspace doesn't match
      if (entry.target.workspaceId !== workspaceId) continue;

      // Skip if no active session
      if (!entry.state.activeSession) continue;

      const { target, state } = entry;
      const activeSession = state.activeSession;

      if (!activeSession) continue;

      // Get label based on entity type
      let label: string;
      if (target.entityType === "channel") {
        const channel = channels.find((c) => c.id === target.entityId);
        label = channel ? `#${channel.name}` : `#${target.entityId}`;
      } else {
        // DM
        const dmName = getDmName(target.entityId);
        label = dmName;
      }

      result.push({
        target,
        activeSession,
        label,
      });
    }

    // Sort: huddles with current user first, then by participant count (desc)
    result.sort((a, b) => {
      if (!a.activeSession || !b.activeSession) return 0;
      const aHasCurrentUser = a.activeSession.participants.some(
        (p) => p.userId === currentUser?.id && p.leftAt === null,
      );
      const bHasCurrentUser = b.activeSession.participants.some(
        (p) => p.userId === currentUser?.id && p.leftAt === null,
      );

      if (aHasCurrentUser && !bHasCurrentUser) return -1;
      if (!aHasCurrentUser && bHasCurrentUser) return 1;

      return (
        b.activeSession.activeParticipantCount -
        a.activeSession.activeParticipantCount
      );
    });

    return result;
  }, [huddlesByEntity, workspaceId, channels, getDmName, currentUser?.id]);

  return (
    <div className="flex gap-2">
      {activeHuddles.map((huddle) => (
        <HuddleItem
          key={`${huddle.target.entityType}:${huddle.target.entityId}`}
          huddle={huddle}
          workspaceId={workspaceId}
          overlayMap={overlayMap}
          onOpen={() => {}}
        />
      ))}
    </div>
  );
}

interface HuddleProps {
  theme: Theme;
  workspaceId: string;
}

const Huddle = ({ theme, workspaceId }: HuddleProps) => {
  const pathname = usePathname();
  const isActive = pathname === `/workspace/${workspaceId}/huddles`;
  return (
    <Link
      href={`/workspace/${workspaceId}/huddles`}
      style={isActive ? { backgroundColor: theme.selectedItems } : {}}
      className="flex w-full justify-between items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md"
    >
      <div className="flex items-center gap-x-2">
        <RiHeadphoneLine size={20} className={` ${isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text"}`} />
        <Typography
          text="Huddle"
          variant="p"
          className={`min-w-0 flex-1 text-[15px]! ${isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text"}`}
        />
      </div>
      <HuddleList workspaceId={workspaceId} />
    </Link>
  );
};

export default Huddle;
