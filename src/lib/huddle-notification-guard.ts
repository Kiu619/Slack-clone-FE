import type { MemberPreferencesResponse } from '@/apis'
import type { NotificationOverrideSetting } from '@/lib/types'

/**
 * Decide whether the current user should be notified (sound + browser notification)
 * when a new huddle starts.
 *
 * Rules:
 *  - Never notify the user who started the huddle.
 *  - Workspace-level pref `notifyOnHuddle` must be true (default true if not set).
 *  - Entity-level (channel/DM): if the override setting is in cache,
 *    - muted → blocked
 *    - override.notifyOnHuddle === false → blocked
 *    - otherwise → allow (fallback to workspace default)
 *    If the override is not in cache yet, skip entity-level check (allow).
 */
export function shouldNotifyHuddle({
  memberPrefs,
  entitySetting,
  currentUserId,
  startedById,
}: {
  memberPrefs?: MemberPreferencesResponse | null
  entitySetting?: NotificationOverrideSetting | null
  currentUserId: string
  startedById: string | null
}): boolean {
  // Don't notify the user who started the huddle.
  if (startedById && startedById === currentUserId) return false

  // (1) Workspace-level default
  const workspaceAllow = memberPrefs?.notifyOnHuddle ?? true
  if (!workspaceAllow) return false

  // (2) Entity-level override (only when cache has it)
  if (entitySetting) {
    if (entitySetting.mode === 'muted') return false
    if (entitySetting.override?.notifyOnHuddle === false) return false
  }

  return true
}
