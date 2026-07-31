"use client";

import { useWorkspaceHuddles } from "@/hooks/use-workspace-huddles";
import type { WorkspaceHuddlesFilters } from "@/lib/huddle";
import {
  ActiveHuddlesSection,
  WeeklyHuddleSection,
  RecentHuddlesSectionWithFilters,
} from "./components";

type HuddlePageProps = {
  workspaceId: string;
};

export function HuddlePage({ workspaceId }: HuddlePageProps) {
  // This query is only for initial load / fallback
  // Real-time updates come through Zustand store
  const filters: WorkspaceHuddlesFilters = {
    status: "active",
    pageSize: 20,
  };

  const { data } = useWorkspaceHuddles(workspaceId, filters);
  const hasActive = (data?.active ?? []).length > 0;

  return (
    <div className="flex h-full min-w-0 flex-col bg-white dark:bg-[#1A1D21]">
      <div className="mx-auto flex h-full w-full max-w-330 min-w-0 flex-col xl:px-4">
        {/* ActiveHuddlesSection reads from Zustand store - no prop needed */}
        <ActiveHuddlesSection workspaceId={workspaceId} />

        {!hasActive && (
          <WeeklyHuddleSection workspaceId={workspaceId} />
        )}

        <RecentHuddlesSectionWithFilters workspaceId={workspaceId} />
      </div>
    </div>
  );
}
