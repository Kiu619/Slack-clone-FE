"use client";

import { Suspense, useEffect, useState } from "react";
import { isAxiosError } from "axios";
import { useChannel } from "@/hooks/use-channel";
import { useRecordRecentVisit } from "@/hooks/use-workspace-recents";
import { useOpenThreadFromSearchParams } from "@/hooks/use-open-thread-from-search-params";
import Header, { type ChannelViewTab } from "@/modules/channels/header";
import MessageTab from "@/components/header-tabs/message-tab";
import FilesTab from "@/components/header-tabs/files-tab";
import { Skeleton } from "@/components/ui/skeleton";
import type { Channel } from "@/lib/types";
import FolderTab from "@/components/header-tabs/folder-tab";
import { CreateFolderDialog } from "@/components/dialogs/create-folder-dialog";
import { ChannelFolderActionsProvider } from "@/contexts/channel-folder-actions";
import PinsTab from "@/components/header-tabs/pins-tab";
import { getChannelMemberStatusApi } from "@/apis";
import { useQuery } from "@tanstack/react-query";

function ChannelThreadDeepLink({ enabled }: { enabled: boolean }) {
  useOpenThreadFromSearchParams(enabled);
  return null;
}

function ChannelWorkspaceBody({
  channel,
  isMember,
  fromChannelPage,
}: {
  channel: Channel;
  isMember: boolean;
  fromChannelPage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<ChannelViewTab>("messages");
  const [createFolderOpen, setCreateFolderOpen] = useState(false);

  return (
    <ChannelFolderActionsProvider
      value={{
        requestNewFolder: () => {
          setActiveTab("folders");
          setCreateFolderOpen(true);
        },
      }}
    >
      <div className="flex min-h-0 min-w-0 flex-1 flex-col h-full">
        <Header
          currentChannelData={channel}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          isMember={isMember}
          showXIcon={!fromChannelPage}
        />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <ChannelThreadDeepLink enabled={activeTab === "messages"} />
        </Suspense>
        {activeTab === "messages" && (
            <MessageTab currentChannelData={channel} isMember={isMember} />
          )}
          {activeTab === "files" && (
            <FilesTab currentChannelData={channel} isMember={isMember} />
          )}
          {activeTab === "folders" && (
            <FolderTab
              currentChannelData={channel}
              isMember={isMember}
              onGoToFilesTab={() => setActiveTab("files")}
            />
          )}
          {activeTab === "pins" && (
            <PinsTab
              currentChannelData={channel}
              isMember={isMember}
              onGoToMessagesTab={() => setActiveTab("messages")}
            />
          )}
        </div>
        <CreateFolderDialog
          open={createFolderOpen}
          onOpenChange={setCreateFolderOpen}
          targetId={channel.id}
        />
      </div>
    </ChannelFolderActionsProvider>
  );
}

interface ChannelViewProps {
  channelId: string;
  workspaceId: string;
  fromChannelPage?: boolean;
}

/**
 * Standalone channel view — giống ChannelPage nhưng không gắn với routing.
 * Dùng để render channel trong main area mà không cần navigate URL.
 */
export default function ChannelView({ channelId, workspaceId, fromChannelPage = false }: ChannelViewProps) {
  const { data: memberStatus } = useQuery({
    queryKey: ["channel-member-status", workspaceId, channelId],
    queryFn: () => getChannelMemberStatusApi(workspaceId, channelId),
    enabled: !!workspaceId && !!channelId,
    staleTime: 30_000,
  });

  const { data: channel, isLoading, isError, error } = useChannel(
    workspaceId,
    channelId
  );

  const recordRecent = useRecordRecentVisit(workspaceId);

  useEffect(() => {
    if (!channel?.id || !workspaceId) return;
    if (!memberStatus?.isMember) return;
    recordRecent.recordVisit({ kind: "channel", id: channel.id });
  }, [channel?.id, workspaceId, memberStatus?.isMember, recordRecent.recordVisit]);

  const isForbidden = isAxiosError(error) && error.response?.status === 403;

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
      <div className="flex flex-col h-full items-center justify-center gap-3 px-4 text-center">
        {isForbidden ? (
          <>
            <p className="text-gray-200 text-lg font-semibold">
              You haven&apos;t joined this channel yet
            </p>
            {/* <p className="text-gray-500 text-sm max-w-md">
              Bạn có thể mở đúng URL channel nhưng cần được thêm hoặc tự tham
              gia (Join) trước khi xem nội dung.
            </p> */}
          </>
        ) : (
          <>
            <p className="text-gray-400 text-lg font-semibold">
              Channel not found
            </p>
            <p className="text-gray-500 text-sm">
              This channel may have been deleted or you don&apos;t have access.
            </p>
          </>
        )}
      </div>
    );
  }

  return (
    <ChannelWorkspaceBody
      key={channelId}
      channel={channel}
      isMember={memberStatus?.isMember ?? false}
      fromChannelPage={fromChannelPage}
    />
  );
}
