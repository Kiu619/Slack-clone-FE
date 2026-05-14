"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation } from "@/hooks/use-conversation";
import { useRecordRecentVisit } from "@/hooks/use-workspace-recents";
import Main from "@/modules/direct-messages/main";

interface DMViewProps {
  conversationId: string;
  workspaceId: string;
}

/**
 * Standalone DM view — giống DMPage nhưng không gắn với routing.
 * Dùng để render DM conversation trong main area mà không cần navigate URL.
 */
export default function DMView({ conversationId, workspaceId }: DMViewProps) {
  const {
    data: conversation,
    isLoading,
    isError,
  } = useConversation(workspaceId, conversationId);

  const recordRecent = useRecordRecentVisit(workspaceId);

  useEffect(() => {
    if (!conversation?.id) return;
    recordRecent.mutate({ kind: "dm", id: conversation.id });
  }, [conversation?.id, recordRecent]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-4">
        <Skeleton className="h-12 w-full bg-[#2a2d31]" />
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full bg-[#2a2d31]" />
          ))}
        </div>
        <Skeleton className="h-24 w-full bg-[#2a2d31]" />
      </div>
    );
  }

  if (isError || !conversation) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3 px-4 text-center">
        <p className="text-gray-400 text-lg font-semibold">
          Conversation not found
        </p>
        <p className="text-gray-500 text-sm">
          This conversation may have been deleted or you don&apos;t have access.
        </p>
      </div>
    );
  }

  return <Main key={conversationId} conversation={conversation} showXIcon={true} />;
}
