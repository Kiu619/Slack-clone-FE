"use client";

import { getNotificationSettingApi } from "@/apis";
import { notificationKeys } from "@/lib/query-keys";
import type {
  Channel,
  DirectMessageConversation,
  NotificationOverrideSetting,
} from "@/lib/types";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

type Params = {
  workspaceId: string;
  channels?: Channel[];
  conversations?: DirectMessageConversation[];
};

type UseSidebarMutedItemsResult = {
  mutedChannelIds: Set<string>;
  mutedConversationIds: Set<string>;
  visibleChannels: Channel[];
  mutedChannels: Channel[];
  visibleConversations: DirectMessageConversation[];
  mutedConversations: DirectMessageConversation[];
  hasMutedChannels: boolean;
  hasMutedConversations: boolean;
  isChannelsReady: boolean;
  isConversationsReady: boolean;
  isReady: boolean;
};

export function useSidebarMutedItems({
  workspaceId,
  channels = [],
  conversations = [],
}: Params) {
  const channelQueries = useQueries({
    queries: channels.map((channel) => ({
      queryKey: notificationKeys.setting(workspaceId, "channel", channel.id),
      queryFn: () =>
        getNotificationSettingApi({ workspaceId, channelId: channel.id }),
      enabled: !!workspaceId,
      staleTime: 30_000,
    })),
  });

  const conversationQueries = useQueries({
    queries: conversations.map((conversation) => ({
      queryKey: notificationKeys.setting(
        workspaceId,
        "conversation",
        conversation.id,
      ),
      queryFn: () =>
        getNotificationSettingApi({
          workspaceId,
          conversationId: conversation.id,
        }),
      enabled: !!workspaceId,
      staleTime: 30_000,
    })),
  });

  return useMemo<UseSidebarMutedItemsResult>(() => {
    const mutedChannelIds = new Set<string>();
    const mutedConversationIds = new Set<string>();

    channelQueries.forEach((query, index) => {
      const setting = query.data as NotificationOverrideSetting | undefined;
      if (setting?.mode === "muted") {
        mutedChannelIds.add(channels[index]!.id);
      }
    });

    conversationQueries.forEach((query, index) => {
      const setting = query.data as NotificationOverrideSetting | undefined;
      if (setting?.mode === "muted") {
        mutedConversationIds.add(conversations[index]!.id);
      }
    });

    const isChannelsReady =
      channels.length === 0 ||
      channelQueries.every((query) => query.data !== undefined || query.isError);
    const isConversationsReady =
      conversations.length === 0 ||
      conversationQueries.every(
        (query) => query.data !== undefined || query.isError,
      );

    return {
      mutedChannelIds,
      mutedConversationIds,
      visibleChannels: channels.filter((channel) => !mutedChannelIds.has(channel.id)),
      mutedChannels: channels.filter((channel) => mutedChannelIds.has(channel.id)),
      visibleConversations: conversations.filter(
        (conversation) => !mutedConversationIds.has(conversation.id),
      ),
      mutedConversations: conversations.filter((conversation) =>
        mutedConversationIds.has(conversation.id),
      ),
      hasMutedChannels: mutedChannelIds.size > 0,
      hasMutedConversations: mutedConversationIds.size > 0,
      isChannelsReady,
      isConversationsReady,
      isReady: isChannelsReady && isConversationsReady,
    };
  }, [channelQueries, channels, conversationQueries, conversations]);
}
