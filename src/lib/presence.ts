/**
 * Socket presence only tells us whether a user currently has a workspace
 * connection. "Online" in the UI is derived from socket presence + away flag.
 */
export function getEffectiveOnline(
  hasSocketConnection: boolean,
  isAway?: boolean | null,
) {
  return hasSocketConnection && !Boolean(isAway)
}

export function getPresenceLabel(isOnline: boolean) {
  return isOnline ? 'Online' : 'Offline'
}

export function getPresenceDotClass(isOnline: boolean) {
  return isOnline ? 'bg-[#007a5a]' : 'bg-gray-400'
}
