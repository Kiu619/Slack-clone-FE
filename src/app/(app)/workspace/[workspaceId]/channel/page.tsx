import { redirect } from 'next/navigation'

/**
 * Redirect route: /workspace/:id/channel → /workspace/:id
 * Vì channel cần channelId nên route này chỉ redirect về workspace
 */
export default function ChannelIndexPage({
  params,
}: {
  params: { workspaceId: string }
}) {
  redirect(`/workspace/${params.workspaceId}`)
}
