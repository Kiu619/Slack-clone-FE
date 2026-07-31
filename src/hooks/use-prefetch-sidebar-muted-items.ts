"use client";

import { getNotificationSettingApi } from "@/apis";
import { notificationKeys } from "@/lib/query-keys";
import type { Channel, DirectMessageConversation } from "@/lib/types";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";

type Params = {
  workspaceId: string;
  channels?: Channel[];
  conversations?: DirectMessageConversation[];
  enabled?: boolean;
};

function normalizeIds(items: Array<{ id: string }>) {
  return Array.from(new Set(items.map((item) => item.id).filter(Boolean)));
}

export function usePrefetchSidebarMutedItems({
  workspaceId,
  channels = [],
  conversations = [],
  enabled = true,
}: Params) {
  const queryClient = useQueryClient();

  const channelIds = useMemo(() => normalizeIds(channels), [channels]);
  const conversationIds = useMemo(
    () => normalizeIds(conversations),
    [conversations],
  );
  const signature = useMemo(
    () => `${channelIds.join("|")}::${conversationIds.join("|")}`,
    [channelIds, conversationIds],
  );

  useEffect(() => {
    if (!enabled || !workspaceId) return;
    if (channelIds.length === 0 && conversationIds.length === 0) return;

    const channelTasks = channelIds.map((channelId) =>
      queryClient.prefetchQuery({
        queryKey: notificationKeys.setting(workspaceId, "channel", channelId),
        queryFn: () =>
          getNotificationSettingApi({ workspaceId, channelId }),
        staleTime: 30_000,
      }),
    );

    const conversationTasks = conversationIds.map((conversationId) =>
      queryClient.prefetchQuery({
        queryKey: notificationKeys.setting(
          workspaceId,
          "conversation",
          conversationId,
        ),
        queryFn: () =>
          getNotificationSettingApi({ workspaceId, conversationId }),
        staleTime: 30_000,
      }),
    );

    void Promise.allSettled([...channelTasks, ...conversationTasks]);
  }, [channelIds, conversationIds, enabled, queryClient, signature, workspaceId]);
}
