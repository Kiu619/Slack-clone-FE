"use client";

import { useQuery } from "@tanstack/react-query";

import { fetchWorkspaceCustomEmojisPageApi } from "@/apis";
import { workspaceKeys } from "@/lib/query-keys";
import type { WorkspaceCustomEmoji } from "@/lib/types";

type SortKey = "name" | "createdAt" | "createdBy";
type SortDirection = "asc" | "desc";

const DEFAULT_PAGE_SIZE = 100;

export function useWorkspaceCustomEmojis(
  workspaceId: string | undefined,
  options?: {
    pageSize?: number;
    enabled?: boolean;
    sortBy?: SortKey;
    sortDirection?: SortDirection;
    search?: string;
    includeAliases?: boolean;
  },
) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const sortBy = options?.sortBy ?? "name";
  const sortDirection = options?.sortDirection ?? "asc";
  const search = options?.search?.trim() ?? "";
  const includeAliases = options?.includeAliases ?? false;

  return useQuery({
    queryKey: workspaceId
      ? workspaceKeys.customEmojisPage(workspaceId, {
          page: 1,
          pageSize,
          sortKey: sortBy,
          sortDirection,
          search,
        })
      : ["workspaces", "custom-emojis", "idle"],
    queryFn: () =>
      fetchWorkspaceCustomEmojisPageApi(workspaceId!, {
        page: 1,
        pageSize,
        sortBy,
        sortDirection,
        q: search || undefined,
      }),
    enabled: Boolean(workspaceId) && (options?.enabled ?? true),
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
    select: (data) =>
      (includeAliases
        ? data.items
        : data.items.filter(
            (emoji) => !emoji.aliasOfId && !emoji.sourceDefaultEmoji,
          )) as WorkspaceCustomEmoji[],
  });
}
