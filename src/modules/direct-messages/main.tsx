"use client";

import { Suspense, useState } from "react";
import { CreateFolderDialog } from "@/components/dialogs/create-folder-dialog";
import FilesTab from "@/components/header-tabs/files-tab";
import FolderTab from "@/components/header-tabs/folder-tab";
import MessageTab from "@/components/header-tabs/message-tab";
import PinsTab from "@/components/header-tabs/pins-tab";
import { ChannelFolderActionsProvider } from "@/contexts/channel-folder-actions";
import { DirectMessageConversation } from "@/lib/types";
import DMHeader, { DMViewTab } from "@/modules/direct-messages/dm-header";
import { useOpenThreadFromSearchParams } from "@/hooks/use-open-thread-from-search-params";

function DmThreadDeepLink({ enabled }: { enabled: boolean }) {
  useOpenThreadFromSearchParams(enabled);
  return null;
}

export default function Main({
  conversation,
  showXIcon = false,
}: {
  conversation: DirectMessageConversation;
  showXIcon?: boolean;
}) {
  const [activeTab, setActiveTab] = useState<DMViewTab>("messages");

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col h-full">
      <DMHeader
        conversation={conversation}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        showXIcon={showXIcon}
      />
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <Suspense fallback={null}>
          <DmThreadDeepLink enabled={activeTab === "messages"} />
        </Suspense>
        {activeTab === "messages" && (
          <MessageTab currentConversationData={conversation} />
        )}
        {activeTab === "files" && (
          <FilesTab currentConversationData={conversation} />
        )}
        {activeTab === "folders" && (
          <FolderTab
            currentConversationData={conversation}
            onGoToFilesTab={() => setActiveTab("files")}
          />
        )}
        {activeTab === "pins" && (
          <PinsTab
            currentConversationData={conversation}
            onGoToMessagesTab={() => setActiveTab("messages")}
          />
        )}
      </div>
    </div>
  );
}
