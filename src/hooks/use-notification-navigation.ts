"use client";

import { useCallback } from "react";

import { getMessageByIdApi } from "@/apis";
import type { Notification } from "@/lib/types";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useThreadPanelStore } from "@/stores/useThreadPanelStore";

export function useNotificationNavigation() {
  const { setView } = useMainPanelStore();
  const { open: openThread, close: closeThread } = useThreadPanelStore();
  const setFocusedMessageId = useMessageFocusStore((state) => state.setFocusedMessageId);

  const navigateToNotification = useCallback(
    async (notification: Notification) => {
      closeThread();

      if (!notification.messageId) {
        if (notification.channelId) {
          setView({ type: "channel", channelId: notification.channelId });
        } else if (notification.conversationId) {
          setView({ type: "dm", conversationId: notification.conversationId });
        }
        return;
      }

      try {
        const message = await getMessageByIdApi(notification.messageId);
        const channelId = message.channelId ?? notification.channelId;
        const conversationId = message.conversationId ?? notification.conversationId;

        if (channelId) {
          setView({ type: "channel", channelId });
        } else if (conversationId) {
          setView({ type: "dm", conversationId });
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
        } else if (notification.conversationId) {
          setView({ type: "dm", conversationId: notification.conversationId });
        } else {
          return;
        }

        setFocusedMessageId(notification.messageId);
      }
    },
    [closeThread, openThread, setFocusedMessageId, setView],
  );

  return { navigateToNotification };
}
