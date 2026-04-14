import { notFound, redirect } from 'next/navigation'
import { getDefaultOrFirstChannelId } from '@/lib/default-channel'
import { getServerChannels } from '@/lib/server-fetch'

export default async function WorkspaceRootPage({
  params,
}: {
  params: Promise<{ workspaceId: string }>
}) {
  const { workspaceId } = await params
  const channels = await getServerChannels(workspaceId)
  const channelId = getDefaultOrFirstChannelId(channels)
  if (!channelId) {
    notFound()
  }
  redirect(`/workspace/${workspaceId}/channel/${channelId}`)
}
