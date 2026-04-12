"use client";

import { use, useState } from "react";
import { useChannel } from "@/hooks/use-channel";
import Header, { type ChannelViewTab } from "@/modules/channels/header";
import Main from "@/modules/channels/main";
import FilesTab from "@/modules/channels/files-tab";
import { Skeleton } from "@/components/ui/skeleton";
import type { Channel } from "@/lib/types";

interface ChannelPageProps {
  params: Promise<{ channelId: string; workspaceId: string }>;
}

function ChannelWorkspaceBody({ channel }: { channel: Channel }) {
  const [activeTab, setActiveTab] = useState<ChannelViewTab>("messages");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col h-full">
      <Header
        currentChannelData={channel}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        {activeTab === "messages" ? (
          <Main currentChannelData={channel} />
        ) : (
          <FilesTab currentChannelData={channel} />
          // <Main currentChannelData={channel} />
        )}
      </div>
    </div>
  );
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId, workspaceId } = use(params);
  const {
    data: channel,
    isLoading,
    isError,
  } = useChannel(workspaceId, channelId);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full p-4 gap-4">
        <Skeleton className="h-12 w-full bg-[#2a2d31]" />
        <div className="flex-1 space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-16 w-full bg-[#2a2d31]" />
          ))}
        </div>
        <Skeleton className="h-24 w-full bg-[#2a2d31]" />
      </div>
    );
  }

  if (isError || !channel) {
    return (
      <div className="flex flex-col h-full items-center justify-center gap-3">
        <p className="text-gray-400 text-lg font-semibold">Channel not found</p>
        <p className="text-gray-500 text-sm">
          This channel may have been deleted or you don&apos;t have access.
        </p>
      </div>
    );
  }

  return <ChannelWorkspaceBody key={channelId} channel={channel} />;
}
