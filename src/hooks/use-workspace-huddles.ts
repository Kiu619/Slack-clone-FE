"use client";

import { useQuery } from "@tanstack/react-query";

import { getWorkspaceHuddlesApi } from "@/apis";
import { huddleKeys } from "@/lib/query-keys";
import type { WorkspaceHuddlesFilters } from "@/lib/huddle";

export function useWorkspaceHuddles(
  workspaceId: string | undefined,
  filters?: WorkspaceHuddlesFilters,
  options?: {
    enabled?: boolean;
  },
) {
  return useQuery({
    queryKey: huddleKeys.workspaceHuddles(workspaceId ?? "", filters),
    queryFn: () => getWorkspaceHuddlesApi(workspaceId!, filters),
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
    staleTime: 30_000,
    refetchOnMount: true,
  });
}
