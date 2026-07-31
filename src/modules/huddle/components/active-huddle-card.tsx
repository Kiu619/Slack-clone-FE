"use client";

import { getWorkspaceProfileApi, leaveHuddleApi } from "@/apis";
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { HuddlePageItem } from "@/lib/huddle";
import {
  openHuddlePreviewWindow,
  requestHuddlePreviewLeave,
} from "@/lib/open-huddle-preview-window";
import { authKeys, huddleKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import {
  buildWorkspaceShellBackground,
  parseTheme,
} from "@/modules/huddle-preview/huddle-preview.utils";
import { useCurrentHuddleStore } from "@/stores/useCurrentHuddleStore";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useWorkspaceHuddlesStore } from "@/stores/useWorkspaceHuddlesStore";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useSocket, leaveHuddleSocket } from "@/hooks/use-socket";
import { resolveHuddleDisplayTitle } from "@/lib/huddle";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import { useUserStore } from "@/stores/useUserStore";

type ActiveHuddleCardProps = {
  huddle: HuddlePageItem;
  workspaceId: string;
  className?: string;
};

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}d`);
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(" ");
}

export function ActiveHuddleCard({
  huddle,
  workspaceId,
  className,
}: ActiveHuddleCardProps) {
  const queryClient = useQueryClient();
  const { currentHuddle, clearCurrentHuddle } = useCurrentHuddleStore();
  const { socket } = useSocket();
  const currentUser = useUserStore((s) => s.user);
  const isJoined =
    currentHuddle?.target.entityId === huddle.entityId &&
    currentHuddle?.target.workspaceId === huddle.workspaceId;
  const [isLeaving, setIsLeaving] = useState(false);

  // Get channels and conversations for label resolution
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useConversations(workspaceId);

  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(huddle.workspaceId),
    queryFn: () => getWorkspaceProfileApi(huddle.workspaceId),
    enabled: !!huddle.workspaceId,
    staleTime: 60_000,
  });

  const workspaceTheme = useMemo(
    () => parseTheme(workspaceProfile?.theme),
    [workspaceProfile?.theme],
  );
  const workspaceBackground = useMemo(
    () => buildWorkspaceShellBackground(workspaceTheme),
    [workspaceTheme],
  );

  // Subscribe to real-time updates from Zustand store
  const realtimeHuddle = useWorkspaceHuddlesStore(
    useShallow(
      (s) => s.huddlesByEntity[`${huddle.entityType}:${huddle.entityId}`],
    ),
  );

  // Use real-time participants from store when available, fallback to prop
  const activeParticipants = useMemo(() => {
    const session = realtimeHuddle?.state.activeSession ?? huddle;
    if (!session?.participants) return huddle.participants;
    // Filter to active participants only (not left)
    return session.participants.filter((p) => p.leftAt === null);
  }, [realtimeHuddle?.state.activeSession, huddle]);

  // Use real-time topic from store when available
  const displayTopic =
    realtimeHuddle?.state.activeSession?.topic ?? huddle.topic;

  // Real-time duration counter that updates every second
  // Use startedAt from real-time store if available
  const startedAt =
    realtimeHuddle?.state.activeSession?.startedAt ?? huddle.startedAt;
  const [durationSeconds, setDurationSeconds] = useState(() =>
    Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setDurationSeconds(
        Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  // Get realtime overlays from store for participant data sync
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[huddle.workspaceId] || {}),
  );

  const target = {
    workspaceId: huddle.workspaceId,
    entityType: huddle.entityType,
    entityId: huddle.entityId,
  };

  const handleCardClick = () => {
    if (isJoined) {
      return;
    }
    openHuddlePreviewWindow({
      ...target,
      label: displayTitle,
      mode: "join",
    });
  };

  const handleLeave = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isLeaving) return;
    setIsLeaving(true);

    // Optimistic: clear immediately
    requestHuddlePreviewLeave(target);
    clearCurrentHuddle();

    // Fire-and-forget
    if (socket?.connected) {
      void leaveHuddleSocket(target, socket).catch(() => {});
    } else {
      void leaveHuddleApi(target).catch(() => {});
    }

    // Invalidate to update other components immediately
    queryClient.invalidateQueries({
      queryKey: huddleKeys.workspaceHuddles(huddle.workspaceId, undefined),
    });

    setTimeout(() => {
      setIsLeaving(false);
    }, 100);
  };

  // Display title using the helper
  const displayTitle = resolveHuddleDisplayTitle(
    {
      entityType: huddle.entityType,
      entityId: huddle.entityId,
      topic: displayTopic,
      entityLabel: huddle.entityLabel,
    },
    {
      channels,
      conversations,
      currentUserId: currentUser?.id,
      memberOverlayMap,
    },
  );

  // Use real-time participant count
  const participantCount = activeParticipants.length;

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative h-50 min-w-60 flex flex-col cursor-pointer gap-3 rounded-lg border border-[#797c814d] bg-white transition-all hover:border-[#797c81] dark:bg-[#1A1D21] overflow-hidden",
        className,
      )}
    >
      {/* Duration - top left */}
      <div className="absolute top-3 left-3 flex shrink-0 items-center justify-center rounded bg-black px-1.5 py-0.5">
        <span className="text-xs font-medium text-white">
          {formatDuration(durationSeconds)}
        </span>
      </div>

      <div
        className="flex-1 flex items-center justify-center"
        style={{ background: workspaceBackground }}
      >
        {/* Avatar group */}
        <AvatarGroup className="shrink-0">
          {activeParticipants.slice(0, 3).map((participant) => {
            const overlay = memberOverlayMap[participant.userId];
            const label =
              overlay?.displayName?.trim() ||
              overlay?.name?.trim() ||
              participant.displayName?.trim() ||
              participant.name?.trim() ||
              "U";
            const avatar = overlay?.avatar || participant.avatar;
            return (
              <Avatar key={participant.id} className="size-6 rounded-md">
                <AvatarImage src={avatar || ""} />
                <AvatarFallback className="rounded-lg bg-sky-500 text-xs">
                  {label.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            );
          })}
          {participantCount > 3 && (
            <Avatar className="size-6 rounded-md">
              <AvatarFallback className="rounded-lg bg-slate-500 text-xs">
                +{participantCount - 3}
              </AvatarFallback>
            </Avatar>
          )}
        </AvatarGroup>
      </div>

      <div className="flex flex-col px-3">
        {/* Title */}
        <div className="flex flex-col">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {displayTitle}
          </span>

          {/* Participant count */}
          <span className="shrink-0 text-xs text-gray-400">
            {participantCount} {participantCount === 1 ? "person" : "people"}
          </span>
        </div>
        {isJoined ? (
          <Button
            className="mb-2"
            type="button"
            variant="error"
            size="sm"
            onClick={handleLeave}
          >
            Leave
          </Button>
        ) : (
          <Button
            className="mb-2"
            type="button"
            variant="success"
            size="sm"
            onClick={handleCardClick}
          >
            Join
          </Button>
        )}
      </div>

      {/* Join/Leave button */}
    </div>
  );
}
