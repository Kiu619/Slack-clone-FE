"use client";

import { getWorkspaceUnreadCountsApi } from "@/apis";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export function useWorkspaceUnreadCounts() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId;

  const query = useQuery({
    queryKey: ["workspace-unread-counts", workspaceId],
    queryFn: () => getWorkspaceUnreadCountsApi(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  const channelUnreadById: Record<string, number> = {};
  const dmUnreadById: Record<string, number> = {};

  for (const row of query.data?.channels ?? []) {
    channelUnreadById[row.id] = row.unreadCount ?? 0;
  }
  for (const row of query.data?.conversations ?? []) {
    dmUnreadById[row.id] = row.unreadCount ?? 0;
  }

  return {
    ...query,
    channelUnreadById,
    dmUnreadById,
  };
}
