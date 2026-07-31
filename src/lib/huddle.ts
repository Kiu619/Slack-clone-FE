import type { HuddlePreviewTargetType } from "@/lib/open-huddle-preview-window"
import { mergeUserForDisplay } from "@/stores/useWorkspaceMemberStore"
import type { WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore"
import type { User } from "@/lib/types"

export type HuddleEntityType = HuddlePreviewTargetType

export type HuddleSessionStatus = "pending" | "active" | "ended"

export type HuddleTarget = {
  workspaceId: string
  entityType: HuddleEntityType
  entityId: string
}

export type HuddleParticipantSnapshot = {
  id: string
  sessionId: string
  userId: string
  email: string | null
  name: string | null
  displayName: string | null
  avatar: string | null
  membershipStatus: 'active' | 'deactivated'
  joinedAt: string
  leftAt: string | null
  isMuted: boolean
  isCameraOn: boolean
  isScreenSharing: boolean
  isSpeaking: boolean
}

export type HuddleSessionSnapshot = {
  id: string
  workspaceId: string
  entityType: HuddleEntityType
  entityId: string
  roomName: string
  entityActiveKey: string | null
  feedMessageId: string | null
  status: HuddleSessionStatus
  startedById: string | null
  startedAt: string
  endedAt: string | null
  lastActivityAt: string
  participantCount: number
  activeParticipantCount: number
  participants: HuddleParticipantSnapshot[]
  topic: string | null
}

export type HuddleMessageSnapshot = HuddleSessionSnapshot & {
  entityLabel: string | null
}

export type HuddleStateSnapshot = {
  activeSession: HuddleSessionSnapshot | null
  recentSessions: HuddleSessionSnapshot[]
}

export type HuddleJoinResponse = {
  livekitUrl: string
  token: string
  session: HuddleSessionSnapshot
}

export type HuddlePageItem = {
  id: string
  workspaceId: string
  entityType: 'channel' | 'dm'
  entityId: string
  entityLabel: string | null
  status: 'active' | 'ended'
  topic: string | null
  startedAt: string
  endedAt: string | null
  durationSeconds: number
  participantCount: number
  replyCount: number
  feedMessageId: string | null
  participants: HuddleParticipantSnapshot[]
}

export type WorkspaceHuddlesResponse = {
  active: HuddlePageItem[]
  recent: HuddlePageItem[]
  pagination: {
    page: number
    pageSize: number
    totalActive: number
    totalRecent: number
  }
}

export type WeeklyHuddleItem = {
  entityType: 'channel' | 'dm'
  entityId: string
  entityLabel: string | null
  huddleCount: number
}

export type WeeklyHuddlesResponse = {
  weekly: WeeklyHuddleItem[]
}

export type RecentHuddlesResponse = {
  recent: HuddlePageItem[]
  pagination: {
    page: number
    pageSize: number
    totalRecent: number
  }
}

export type WorkspaceHuddlesFilters = {
  filter_entityTypes?: 'channel' | 'dm' | 'all'
  filter_channelIds?: string[]
  filter_conversationIds?: string[]
  filter_participantIds?: string[]
  sort?: 'recent' | 'participants'
  status?: 'active' | 'ended' | 'all'
  missedOnly?: boolean
  page?: number
  pageSize?: number
}

// Filter type for recent huddles page
export type RecentHuddlesType = 'all' | 'missed'

export type RecentHuddlesFilters = {
  type?: RecentHuddlesType
  filter_entityTypes?: 'channel' | 'dm' | 'all'
  filter_channelIds?: string[]
  filter_conversationIds?: string[]
  filter_participantIds?: string[]
  sort?: 'recent' | 'participants'
  page?: number
  pageSize?: number
}

// Fields that need CSV serialization (arrays -> comma-separated string)
const HUDDLE_ARRAY_FIELDS = [
  'filter_channelIds',
  'filter_conversationIds',
  'filter_participantIds',
] as const

/**
 * Serialize huddle filters for API call.
 * Arrays are joined to CSV strings, empty arrays are removed.
 */
export function serializeHuddleFilters(
  filters: RecentHuddlesFilters
): Record<string, unknown> {
  const serialized: Record<string, unknown> = { ...filters }

  for (const field of HUDDLE_ARRAY_FIELDS) {
    const value = filters[field as keyof RecentHuddlesFilters]
    if (Array.isArray(value) && value.length > 0) {
      serialized[field] = value.join(',')
    } else {
      delete serialized[field]
    }
  }

  return serialized
}

/**
 * Input data for resolving huddle display title.
 */
export type HuddleDisplayData = {
  entityType: 'channel' | 'dm'
  entityId: string
  topic: string | null
  entityLabel: string | null
}

/**
 * Options for resolving huddle display title.
 */
export type ResolveHuddleTitleOptions = {
  /** List of channels in the workspace */
  channels?: { id: string; name: string }[]
  /** List of conversations in the workspace */
  conversations?: {
    id: string
    members: Pick<User, 'id' | 'name' | 'displayName' | 'avatar'>[]
  }[]
  /** Current user ID (for DM name resolution) */
  currentUserId?: string
  /** Member overlay map for real-time updates */
  memberOverlayMap?: Record<string, WorkspaceMemberDisplay>
}

/**
 * Resolve a huddle's display title from topic + entity info.
 *
 * Priority:
 * 1. If topic exists: show "#channel: topic" for channels, or just "topic" for DMs
 * 2. If no topic: show "#channel" for channels, or DM member name for DMs
 * 3. Fallback: "#unknown" or "Huddle"
 */
export function resolveHuddleDisplayTitle(
  data: HuddleDisplayData,
  options: ResolveHuddleTitleOptions = {},
): string {
  const { channels = [], conversations = [], currentUserId, memberOverlayMap = {} } = options

  // Resolve entityLabel from channels/conversations if not provided
  let resolvedEntityLabel = data.entityLabel
  if (!resolvedEntityLabel) {
    if (data.entityType === 'channel') {
      const channel = channels.find((c) => c.id === data.entityId)
      resolvedEntityLabel = channel?.name ?? null
    } else if (data.entityType === 'dm') {
      // For DMs, find the other member's name
      const conversation = conversations.find((c) => c.id === data.entityId)
      if (conversation) {
        const otherMember = conversation.members.find((m) => m.id !== currentUserId)
        if (otherMember) {
          // Cast to User since mergeUserForDisplay requires it; only display fields are used
          const merged = mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
          resolvedEntityLabel =
            merged.displayName?.trim() || merged.name?.trim() || null
        }
      }
    }
  }

  // Priority 1: Topic exists
  if (data.topic) {
    if (data.entityType === 'channel') {
      return `#${resolvedEntityLabel || 'unknown'}: ${data.topic}`
    }
    return data.topic
  }

  // Priority 2: No topic - use entity label
  if (data.entityType === 'channel') {
    return resolvedEntityLabel ? `#${resolvedEntityLabel}` : '#unknown'
  }
  return resolvedEntityLabel || 'Huddle'
}
