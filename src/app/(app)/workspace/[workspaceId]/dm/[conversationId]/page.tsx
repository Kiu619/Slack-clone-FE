"use client";

import dynamic from "next/dynamic";
import { WorkspacePanelSkeleton } from "@/components/loading-skeletons";
import { use } from "react";

const DMView = dynamic(() => import("@/modules/direct-messages/dm-view"), {
  ssr: false,
  loading: () => (
    <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />
  ),
});

interface DMPageProps {
  params: Promise<{ conversationId: string; workspaceId: string }>;
}

export default function DMPage({ params }: DMPageProps) {
  const { conversationId, workspaceId } = use(params);
  return (
    <DMView
      conversationId={conversationId}
      workspaceId={workspaceId}
      showXIcon={false}
    />
  );
}
