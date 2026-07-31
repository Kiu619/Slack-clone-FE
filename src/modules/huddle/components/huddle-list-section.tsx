"use client";

import type { HuddlePageItem } from "@/lib/huddle";
import { HuddleListItem } from "./huddle-list-item";
import { HuddlePagination } from "./huddle-pagination";

type HuddleListSectionProps = {
  activeHuddles: HuddlePageItem[];
  recentHuddles: HuddlePageItem[];
  totalRecent: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
};

export function HuddleListSection({
  activeHuddles,
  recentHuddles,
  totalRecent,
  currentPage,
  pageSize,
  onPageChange,
}: HuddleListSectionProps) {
  const hasActive = activeHuddles.length > 0;
  const hasRecent = recentHuddles.length > 0;
  const totalRecentPages = Math.ceil(totalRecent / pageSize);

  return (
    <div className="flex flex-col">
      {hasActive && (
        <div className="border-b border-white/5">
          <div className="px-4 py-2">
            <span className="text-[13px] font-semibold uppercase text-gray-400">
              Active Huddles ({activeHuddles.length})
            </span>
          </div>
          <div className="flex flex-col">
            {activeHuddles.map((huddle) => (
              <HuddleListItem key={huddle.id} huddle={huddle} />
            ))}
          </div>
        </div>
      )}

      {hasRecent && (
        <div>
          <div className="px-4 py-2">
            <span className="text-[13px] font-semibold uppercase text-gray-400">
              Recent Huddles ({totalRecent})
            </span>
          </div>
          <div className="flex flex-col">
            {recentHuddles.map((huddle) => (
              <HuddleListItem key={huddle.id} huddle={huddle} />
            ))}
          </div>
          {totalRecentPages > 1 && (
            <div className="border-t border-white/5">
              <HuddlePagination
                currentPage={currentPage}
                totalPages={totalRecentPages}
                pageSize={pageSize}
                onPageChange={onPageChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
