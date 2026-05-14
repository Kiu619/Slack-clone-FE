import { useCallback } from "react";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useThreadPanelStore } from "@/stores/useThreadPanelStore";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { SavedItem } from "@/lib/types";

export function useLaterNavigation() {
  const { setView, activeSavedItemId: mainActiveId, setActiveSavedItemId: setMainActiveId } = useMainPanelStore();
  const { 
    open: openThread, 
    close: closeThread, 
    activeSavedItemId: threadActiveId,
    setActiveSavedItemId: setThreadActiveId 
  } = useThreadPanelStore();
  const setFocusedMessageId = useMessageFocusStore((state) => state.setFocusedMessageId);

  const navigateToItem = useCallback((item: SavedItem) => {
    closeThread();

    const target = item.type === 'message' ? item.message : item.attachment;
    if (!target) return;

    const messageId = item.type === 'message' ? target.id : (target as any).messageId;
    const parentMessage = (target as any).parentMessage;
    const channelId = (target as any).channelId;
    const conversationId = (target as any).conversationId;

    if (parentMessage) {
      setThreadActiveId(item.id);
      setMainActiveId(null);

      if (channelId) {
        setView({ type: "channel", channelId });
      } else if (conversationId) {
        setView({ type: "dm", conversationId });
      }

      openThread(parentMessage, messageId);
      setFocusedMessageId(parentMessage.id);
    } else {
      if (channelId) {
        setView({ type: "channel", channelId });
      } else if (conversationId) {
        setView({ type: "dm", conversationId });
      }

      setFocusedMessageId(messageId);
      setMainActiveId(item.id);
      setThreadActiveId(null);
    }
  }, [setView, setMainActiveId, openThread, closeThread, setThreadActiveId, setFocusedMessageId]);

  return { navigateToItem, mainActiveId, threadActiveId };
}
