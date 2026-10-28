"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";

import { getMessageByIdApi } from "@/apis";
import type { Notification } from "@/lib/types";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useThreadPanelStore } from "@/stores/useThreadPanelStore";

export function useNotificationNavigation() {
  const router = useRouter()
  const { setView } = useMainPanelStore();
  const { open: openThread, close: closeThread } = useThreadPanelStore();
  const setFocusedMessageId = useMessageFocusStore((state) => state.setFocusedMessageId);

  const navigateToNotification = useCallback(
    async (notification: Notification, workspaceId?: string) => {
      closeThread();

      if (!notification.messageId) {
        if (notification.channelId) {
          setView({ type: "channel", channelId: notification.channelId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/channel/${notification.channelId}`)
        } else if (notification.conversationId) {
          setView({ type: "dm", conversationId: notification.conversationId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/dm/${notification.conversationId}`)
        }
        return;
      }

      try {
        const message = await getMessageByIdApi(notification.messageId);
        const channelId = message.channelId ?? notification.channelId;
        const conversationId = message.conversationId ?? notification.conversationId;

        if (channelId) {
          setView({ type: "channel", channelId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/channel/${channelId}`)
        } else if (conversationId) {
          setView({ type: "dm", conversationId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/dm/${conversationId}`)
        } else {
          return;
        }

        if (message.parentId) {
          const parentMessage = await getMessageByIdApi(message.parentId);
          openThread(parentMessage, message.id);
          setFocusedMessageId(parentMessage.id);
          return;
        }

        setFocusedMessageId(message.id);
      } catch {
        if (notification.channelId) {
          setView({ type: "channel", channelId: notification.channelId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/channel/${notification.channelId}`)
        } else if (notification.conversationId) {
          setView({ type: "dm", conversationId: notification.conversationId });
          const targetWs = notification.workspaceId || workspaceId
          if (targetWs) router.push(`/workspace/${targetWs}/dm/${notification.conversationId}`)
        } else {
          return;
        }

        setFocusedMessageId(notification.messageId);
      }
    },
    [closeThread, openThread, router, setFocusedMessageId, setView],
  );

  return { navigateToNotification };
}
