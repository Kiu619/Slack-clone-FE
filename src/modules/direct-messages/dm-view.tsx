"use client";

import { useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { useConversation } from "@/hooks/use-conversation";
import { useRecordRecentVisit } from "@/hooks/use-workspace-recents";
import { useAppTranslation } from "@/hooks/use-translation";
import Main from "@/modules/direct-messages/main";

interface DMViewProps {
  conversationId: string;
  workspaceId: string;
  showXIcon?: boolean;
}

/**
 * Standalone DM view — giống DMPage nhưng không gắn với routing.
 * Dùng để render DM conversation trong main area mà không cần navigate URL.
 */
export default function DMView({
  conversationId,
  workspaceId,
  showXIcon = true,
}: DMViewProps) {
  const {
    data: conversation,
    isLoading,
    isError,
  } = useConversation(workspaceId, conversationId);

  const { recordVisit } = useRecordRecentVisit(workspaceId);
  const t = useAppTranslation("directMessages");

  useEffect(() => {
    if (!conversation?.id) return;
    recordVisit({ kind: "dm", id: conversation.id });
  }, [conversation?.id, recordVisit]);

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
          {t("conversationNotFound")}
        </p>
        <p className="text-gray-500 text-sm">
          {t("conversationNotFoundDescription")}
        </p>
      </div>
    );
  }

  return <Main key={conversationId} conversation={conversation} showXIcon={showXIcon} />;
}
