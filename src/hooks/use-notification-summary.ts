"use client";

import { getUnreadNotificationsCountApi } from "@/apis";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

export function useUnreadNotificationsCount() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId;

  const query = useQuery({
    queryKey: ["notifications-unread-count", workspaceId],
    queryFn: () => getUnreadNotificationsCountApi(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  return {
    unreadCount: query.data?.count ?? 0,
    isLoading: query.isLoading,
  };
}
