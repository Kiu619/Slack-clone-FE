import type { Channel } from './types'

/** Ưu tiên kênh có isDefaultChannel, không thì kênh đầu danh sách. */
export function getDefaultOrFirstChannelId(
  channels: Channel[],
): string | null {
  const def = channels.find((c) => c.isDefaultChannel)
  if (def) return def.id
  return channels[0]?.id ?? null
}
