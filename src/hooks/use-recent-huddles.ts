"use client";

import { useQuery } from "@tanstack/react-query";

import { getRecentHuddlesApi } from "@/apis";
import { huddleKeys } from "@/lib/query-keys";
import type { RecentHuddlesFilters } from "@/lib/huddle";

export function useRecentHuddles(
  workspaceId: string | undefined,
  filters?: RecentHuddlesFilters,
  options?: {
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: huddleKeys.recentHuddles(workspaceId ?? "", filters),
    queryFn: () => getRecentHuddlesApi(workspaceId!, filters),
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnMount: true,
  });
}
