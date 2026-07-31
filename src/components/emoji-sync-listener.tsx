'use client'

import { useWorkspaceEmojiSync } from '@/hooks/use-workspace-emoji-sync'

/**
 * Headless client component that subscribes to the workspace emoji broadcast
 * (`entity:sync` with `domain: 'emoji'`) and keeps the custom-emoji cache
 * fresh for every screen mounted under the workspace layout.
 *
 * Mounted once at the workspace layout level so the WebSocket listener is
 * shared across every page in the workspace.
 */
export function EmojiSyncListener({ workspaceId }: { workspaceId: string }) {
  useWorkspaceEmojiSync(workspaceId)
  return null
}
