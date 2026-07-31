"use client";

import { use } from "react";
import dynamic from "next/dynamic";
import { SearchResultsSkeleton } from "@/components/loading-skeletons";

const WorkspaceGlobalSearch = dynamic(
  () =>
    import("@/modules/workspace/search/workspace-global-search").then(
      (mod) => mod.WorkspaceGlobalSearch,
    ),
  {
    ssr: false,
    loading: () => <SearchResultsSkeleton titleWidth="w-40" resultCount={6} />,
  },
);

interface SearchPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspaceSearchPage({ params }: SearchPageProps) {
  const { workspaceId } = use(params);
  return <WorkspaceGlobalSearch workspaceId={workspaceId} />;
}
