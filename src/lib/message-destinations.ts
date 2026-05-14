import { getOrCreateDirectMessageApi, type ForwardMessageDestination } from '@/apis'
import type { ForwardSelectedTarget } from '@/hooks/use-forward-recipient-search'

/**
 * Resolve selected chips into channel / conversation destinations (deduped).
 * Used by forward-message and share-file flows.
 */
export async function buildForwardDestinations(
  workspaceId: string,
  targets: ForwardSelectedTarget[],
): Promise<ForwardMessageDestination[]> {
  const out: ForwardMessageDestination[] = []
  const seen = new Set<string>()

  for (const t of targets) {
    if (t.type === 'channel') {
      const key = `channel:${t.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ type: 'channel', channelId: t.id })
      continue
    }

    if (t.type === 'conversation') {
      const key = `conversation:${t.id}`
      if (seen.has(key)) continue
      seen.add(key)
      out.push({ type: 'conversation', conversationId: t.id })
      continue
    }

    const conv = await getOrCreateDirectMessageApi(workspaceId, [t.id])
    const key = `conversation:${conv.id}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ type: 'conversation', conversationId: conv.id })
  }

  return out
}
