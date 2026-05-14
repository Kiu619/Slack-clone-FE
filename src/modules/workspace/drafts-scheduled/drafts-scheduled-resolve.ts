import type { Channel, DirectMessageConversation } from '@/lib/types'
import type { MessageDraftSummary } from '@/lib/message-drafts'
import type { ScheduledMessageRow } from '@/lib/scheduled-messages-api'

type ResolveCtx = {
  channels: Channel[]
  conversations: DirectMessageConversation[]
  userId?: string
}

export const resolveDraftSummaryTitle = (
  row: MessageDraftSummary,
  { channels, conversations, userId }: ResolveCtx,
) => {
  if (row.isThread && row.channelId) {
    const ch = channels.find((c) => c.id === row.channelId)
    return `Thread · #${ch?.name ?? row.channelId}`
  }
  if (row.isThread && row.conversationId) {
    const c = conversations.find((x) => x.id === row.conversationId)
    const label =
      c?.members
        ?.filter((m) => m.id !== userId)
        .map((m) => m.displayName || m.name || 'User')
        .join(', ') || 'DM'
    return `Thread · ${label}`
  }
  if (row.isComposeNew && row.channelId) {
    const ch = channels.find((c) => c.id === row.channelId)
    return `Soạn mới · #${ch?.name ?? row.channelId}`
  }
  if (row.isComposeNew && row.conversationId) {
    const c = conversations.find((x) => x.id === row.conversationId)
    const label =
      c?.members
        ?.filter((m) => m.id !== userId)
        .map((m) => m.displayName || m.name || 'User')
        .join(', ') || 'DM'
    return `Soạn mới · ${label}`
  }
  if (row.channelId) {
    const ch = channels.find((c) => c.id === row.channelId)
    return `#${ch?.name ?? row.channelId}`
  }
  if (row.conversationId) {
    const c = conversations.find((x) => x.id === row.conversationId)
    return (
      c?.members
        ?.filter((m) => m.id !== userId)
        .map((m) => m.displayName || m.name || 'User')
        .join(', ') || 'Direct message'
    )
  }
  return 'Draft'
}

export const resolveScheduledRowTitle = (
  row: ScheduledMessageRow,
  { channels, conversations, userId }: ResolveCtx,
) => {
  if (row.parentId && row.channelId) {
    const ch = channels.find((c) => c.id === row.channelId)
    return `Thread · #${ch?.name ?? row.channelId}`
  }
  if (row.parentId && row.conversationId) {
    const c = conversations.find((x) => x.id === row.conversationId)
    const label =
      c?.members
        ?.filter((m) => m.id !== userId)
        .map((m) => m.displayName || m.name || 'User')
        .join(', ') || 'DM'
    return `Thread · ${label}`
  }
  if (row.channelId) {
    const ch = channels.find((c) => c.id === row.channelId)
    return `#${ch?.name ?? row.channelId}`
  }
  if (row.conversationId) {
    const c = conversations.find((x) => x.id === row.conversationId)
    return (
      c?.members
        ?.filter((m) => m.id !== userId)
        .map((m) => m.displayName || m.name || 'User')
        .join(', ') || 'Direct message'
    )
  }
  return 'Scheduled'
}
