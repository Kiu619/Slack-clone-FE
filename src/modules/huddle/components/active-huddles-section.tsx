"use client";

import type {
  HuddlePageItem,
  HuddleStateSnapshot,
  HuddleTarget,
} from "@/lib/huddle";
import { ActiveHuddleCard } from "./active-huddle-card";
import { useWorkspaceHuddlesStore } from "@/stores/useWorkspaceHuddlesStore";
import { useShallow } from "zustand/react/shallow";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import { useUserStore } from "@/stores/useUserStore";

type ActiveHuddlesSectionProps = {
  workspaceId: string;
};

/**
 * Helper to convert store entry to HuddlePageItem with resolved entityLabel.
 */
function storeEntryToPageItem(
  entry: { target: HuddleTarget; state: HuddleStateSnapshot },
  workspaceId: string,
  channels: { id: string; name: string }[],
  conversations: { id: string; members: { id: string }[] }[],
  currentUserId?: string,
): HuddlePageItem | null {
  const session = entry.state.activeSession;
  if (!session) return null;

  // Resolve entityLabel from channels/conversations
  let entityLabel: string | null = null;
  if (session.entityType === 'channel') {
    const channel = channels.find((c) => c.id === session.entityId);
    entityLabel = channel?.name ?? null;
  } else if (session.entityType === 'dm') {
    // For DMs, use a placeholder - the card will resolve the display name
    const conversation = conversations.find((c) => c.id === session.entityId);
    if (conversation) {
      const otherMember = conversation.members.find((m) => m.id !== currentUserId);
      if (otherMember) {
        entityLabel = otherMember.id; // Will be resolved in card
      }
    }
  }

  return {
    id: session.id,
    workspaceId: session.workspaceId || workspaceId,
    entityType: session.entityType as 'channel' | 'dm',
    entityId: session.entityId,
    entityLabel,
    status: 'active',
    topic: session.topic ?? null,
    startedAt: session.startedAt,
    endedAt: null,
    durationSeconds: Math.floor(
      (Date.now() - new Date(session.startedAt).getTime()) / 1000,
    ),
    participantCount: session.participantCount,
    replyCount: 0,
    feedMessageId: session.feedMessageId,
    participants: session.participants,
  };
}

export function ActiveHuddlesSection({
  workspaceId,
}: ActiveHuddlesSectionProps) {
  // Get channels and conversations for label resolution
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useConversations(workspaceId);
  const currentUser = useUserStore((s) => s.user);

  // Read from Zustand store - no TanStack Query needed
  const huddlesByEntity = useWorkspaceHuddlesStore(
    useShallow((s) => s.huddlesByEntity),
  );

  // Convert store entries to HuddlePageItem format with resolved entityLabel
  const activeHuddles = Object.values(huddlesByEntity)
    .filter((entry) => {
      // Only show huddles from the current workspace
      if (entry.target.workspaceId !== workspaceId) return false;
      // Only show if there's an active session
      return entry.state.activeSession !== null;
    })
    .map((entry) =>
      storeEntryToPageItem(
        entry,
        workspaceId,
        channels,
        conversations,
        currentUser?.id,
      ),
    )
    .filter((item): item is HuddlePageItem => item !== null);

  if (activeHuddles.length === 0) {
    return null;
  }

  return (
    <div className="px-4 py-2">
      <div className="flex gap-2 overflow-x-auto pb-2">
        {activeHuddles.map((huddle) => (
          <ActiveHuddleCard
            key={huddle.id}
            huddle={huddle}
            workspaceId={workspaceId}
          />
        ))}
      </div>
    </div>
  );
}
