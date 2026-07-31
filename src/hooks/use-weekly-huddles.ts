"use client";

import { useQuery } from "@tanstack/react-query";

import { getWeeklyHuddlesApi } from "@/apis";
import { huddleKeys } from "@/lib/query-keys";

export function useWeeklyHuddles(workspaceId: string | undefined) {
  return useQuery({
    queryKey: huddleKeys.weeklyHuddles(workspaceId ?? ""),
    queryFn: () => getWeeklyHuddlesApi(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 60_000,
  });
}
