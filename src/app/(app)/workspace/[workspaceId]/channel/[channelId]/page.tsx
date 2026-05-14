import ChannelView from "@/modules/channels/channel-view";
import { use } from "react";

interface ChannelPageProps {
  params: Promise<{ channelId: string; workspaceId: string }>;
}

export default function ChannelPage({ params }: ChannelPageProps) {
  const { channelId, workspaceId } = use(params)
  return <ChannelView channelId={channelId} workspaceId={workspaceId} fromChannelPage={true} />;
}
