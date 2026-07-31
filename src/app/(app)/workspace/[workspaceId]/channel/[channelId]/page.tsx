"use client";

import { WorkspacePanelSkeleton } from "@/components/loading-skeletons";
import dynamic from "next/dynamic";
import { use } from "react";

const ChannelView = dynamic(() => import("@/modules/channels/channel-view"), {
  ssr: false,
  loading: () => (
    <WorkspacePanelSkeleton titleWidth="w-44" rowCount={5} includeComposer />
  ),
});

interface ChannelPageProps {
  params: Promise<{ channelId: string; workspaceId: string }>;
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId, workspaceId } = use(params)
  return <ChannelView channelId={channelId} workspaceId={workspaceId} fromChannelPage={true} />;
}
