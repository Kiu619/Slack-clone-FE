"use client";

import MessageItem from "@/components/message-item";
import { useConversations } from "@/hooks/use-conversations";
import { getConversationSummary } from "@/modules/global-search/utils";
import type { WorkspaceMessageSearchItem } from "@/lib/types";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";

type MessageSearchResultProps = {
  item: WorkspaceMessageSearchItem;
  workspaceId: string;
  currentUserId: string;
  query: string;
  isActive?: boolean;
  onOpen: (item: WorkspaceMessageSearchItem) => void;
  onOpenThread: (item: WorkspaceMessageSearchItem) => void;
};

export default function MessageSearchResult({
  item,
  workspaceId,
  currentUserId,
  query,
  isActive = false,
  onOpen,
  onOpenThread,
}: MessageSearchResultProps) {
  const { data: conversations = [] } = useConversations(workspaceId);
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  );

  const resolvedLocationLabel = useMemo(() => {
    const location = item.location;

    if (location.kind === "channel") {
      return location.channelName;
    }

    const conversation = conversations.find(
      (candidate) => candidate.id === location.conversationId,
    );
    if (!conversation) {
      return location.conversationLabel;
    }

    return getConversationSummary(
      conversation,
      currentUserId,
      memberOverlayMap,
    ).label;
  }, [conversations, currentUserId, item.location, memberOverlayMap]);

  return (
    <div className="cursor-pointer"><MessageItem
      key={item.message.id}
      messageId={item.message.id}
      message={item.message}
      workspaceId={workspaceId}
      currentUserId={currentUserId}
      searchResult
      searchResultActive={isActive}
      searchQuery={query}
      searchExcerpt={item.excerpt}
      searchLocation={item.location}
      searchLocationPrefix={item.message.parentId ? "Thread in" : undefined}
      searchLocationLabel={resolvedLocationLabel}
      onSearchOpen={(nextMessage) =>
        void onOpen({
          ...item,
          message: nextMessage,
        })
      }
      onSearchOpenThread={() => void onOpenThread(item)}
    /></div>
  );
}
