"use client";

import { useState } from "react";
import type { RecentHuddlesFilters } from "@/lib/huddle";
import { HuddleFilterRow } from "./huddle-filter-row";
import { HuddleListItem } from "./huddle-list-item";
import { HuddlePagination } from "./huddle-pagination";
import { RecentHuddlesSkeleton } from "@/components/loading-skeletons";
import { useRecentHuddles } from "@/hooks/use-recent-huddles";
import { useLaterSavedMessageIds } from "@/hooks/use-saved-items";
import { HuddleEmptyState } from "./huddle-empty-state";

type RecentHuddlesSectionProps = {
  workspaceId: string;
};

export function RecentHuddlesSection({
  workspaceId,
}: RecentHuddlesSectionProps) {
  const [filters, setFilters] = useState<RecentHuddlesFilters>({
    page: 1,
    pageSize: 20,
    type: "all",
  });

  const { data, isLoading, error } = useRecentHuddles(workspaceId, filters);

  const allFeedMessageIds = data?.recent
    .map((h) => h.feedMessageId)
    .filter(Boolean) as string[];

  const { savedMessageIdSet } = useLaterSavedMessageIds(
    workspaceId,
    allFeedMessageIds,
  );

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  if (isLoading) {
    return <RecentHuddlesSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-center text-sm text-gray-400">
          Failed to load huddles
        </div>
      </div>
    );
  }

  const recentHuddles = data?.recent ?? [];
  const totalRecent = data?.pagination.totalRecent ?? 0;
  const totalPages = Math.ceil(totalRecent / (filters.pageSize ?? 20));

  if (recentHuddles.length === 0 && totalRecent === 0) {
    return (
      <div>
        <div className="px-4">
          <span className="text-[13px] font-semibold uppercase text-gray-400">
            Recent Huddles
          </span>
        </div>
        <HuddleEmptyState />
      </div>
    );
  }

  return (
    <div>
      <div className="px-4">
        <span className="text-[13px] font-semibold uppercase text-gray-400">
          Recent Huddles ({totalRecent})
        </span>
      </div>
      <div className="flex flex-col">
        {recentHuddles.map((huddle) => (
          <HuddleListItem
            key={huddle.id}
            huddle={huddle}
            isSaved={
              !!huddle.feedMessageId &&
              savedMessageIdSet.has(huddle.feedMessageId)
            }
          />
        ))}
      </div>
      {totalPages > 1 && (
        <div className="border-t border-white/5">
          <HuddlePagination
            currentPage={filters.page ?? 1}
            totalPages={totalPages}
            pageSize={filters.pageSize ?? 20}
            onPageChange={handlePageChange}
          />
        </div>
      )}
    </div>
  );
}

export function RecentHuddlesSectionWithFilters({
  workspaceId,
}: RecentHuddlesSectionProps) {
  const [filters, setFilters] = useState<RecentHuddlesFilters>({
    page: 1,
    pageSize: 20,
    type: "all",
  });

  const { data, isLoading, error } = useRecentHuddles(workspaceId, filters);

  const allFeedMessageIds = data?.recent
    .map((h) => h.feedMessageId)
    .filter(Boolean) as string[];

  const { savedMessageIdSet } = useLaterSavedMessageIds(
    workspaceId,
    allFeedMessageIds,
  );

  const handleFiltersChange = (newFilters: RecentHuddlesFilters) => {
    setFilters({ ...newFilters, page: 1 });
  };

  const handlePageChange = (page: number) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-3">
        <div className="px-4">
          <span className="text-[13px] font-semibold uppercase text-gray-400">
            Recent Huddles
          </span>
        </div>
        <div className="border-b border-white/10 px-4 py-2">
          <HuddleFilterRow
            workspaceId={workspaceId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            hideWith={filters.type === "missed"}
          />
        </div>
        <RecentHuddlesSkeleton />
      </div>
    );
  }

  if (error) {
    return (
      <div className="border-b border-white/10 px-4 py-2">
        <div className="flex flex-col gap-4">
          <HuddleFilterRow
            workspaceId={workspaceId}
            filters={filters}
            onFiltersChange={handleFiltersChange}
            hideWith={filters.type === "missed"}
          />
        </div>
        <div className="flex items-center justify-center py-8">
          <div className="text-center text-sm text-gray-400">
            Failed to load huddles
          </div>
        </div>
      </div>
    );
  }

  const recentHuddles = data?.recent ?? [];
  const totalRecent = data?.pagination.totalRecent ?? 0;
  const totalPages = Math.ceil(totalRecent / (filters.pageSize ?? 20));

  return (
    <div className="flex flex-col overflow-y-scroll">
      <div className="px-4">
        <span className="text-[13px] font-semibold uppercase text-gray-400">
          Recent Huddles
        </span>
      </div>
      <div className="border-b border-white/10 px-4 py-2">
        <HuddleFilterRow
          workspaceId={workspaceId}
          filters={filters}
          onFiltersChange={handleFiltersChange}
          hideWith={filters.type === "missed"}
        />
      </div>

      {recentHuddles.length === 0 && totalRecent === 0 ? (
        <HuddleEmptyState />
      ) : (
        <>
          <div className="flex flex-col px-4 overflow-y-scroll">
            {recentHuddles.map((huddle) => (
              <HuddleListItem
                key={huddle.id}
                huddle={huddle}
                isSaved={
                  !!huddle.feedMessageId &&
                  savedMessageIdSet.has(huddle.feedMessageId)
                }
              />
            ))}
          </div>
          {totalPages > 1 && (
            <div className="border-t border-white/5">
              <HuddlePagination
                currentPage={filters.page ?? 1}
                totalPages={totalPages}
                pageSize={filters.pageSize ?? 20}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
