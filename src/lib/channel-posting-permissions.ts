import type { Channel } from '@/lib/types'

export function canUserPostInChannel(
  channel: Channel | null | undefined,
  userId?: string | null,
  role?: string | null,
) {
  if (!channel) {
    return {
      canPost: false,
      canReply: false,
      canSendToChannel: false,
      canMentionChannelWide: false,
    }
  }

  const settings = channel.postingSettings
  if (!settings) {
    return {
      canPost: true,
      canReply: true,
      canSendToChannel: true,
      canMentionChannelWide: true,
    }
  }

  const isAdmin =
    role === 'primary_owner' || role === 'owner' || role === 'admin'
  const isWhitelisted = Boolean(userId && settings.specificUserIds.includes(userId))
  const canPost =
    settings.mode === 'everyone'
      ? true
      : settings.mode === 'admin_only'
        ? isAdmin
        : isAdmin || isWhitelisted

  return {
    canPost,
    canReply: settings.allowThreads ? true : canPost,
    canSendToChannel: canPost,
    canMentionChannelWide: settings.allowMentions,
  }
}

export function getRestrictedPostingLabel(
  channel: Channel | null | undefined,
  userId?: string | null,
  role?: string | null,
) {
  return canUserPostInChannel(channel, userId, role).canPost
    ? null
    : 'Only certain people can post in this channel'
}
