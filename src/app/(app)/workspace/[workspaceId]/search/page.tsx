"use client";

import { use } from "react";
import { WorkspaceMessagesSearch } from "@/modules/workspace/search/workspace-messages-search";

interface SearchPageProps {
  params: Promise<{ workspaceId: string }>;
}

export default function WorkspaceSearchPage({ params }: SearchPageProps) {
  const { workspaceId } = use(params);
  return <WorkspaceMessagesSearch workspaceId={workspaceId} />;
}
