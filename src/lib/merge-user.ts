import type { AccountUser, User } from './types'

/** Gộp tài khoản + profile workspace cho sidebar / shell */
export function mergeAccountWithWorkspaceProfile(
  account: AccountUser | null | undefined,
  profile: User | null | undefined,
): User | null {
  if (!account) return null
  if (!profile) {
    return {
      id: account.id,
      email: account.email,
      name: account.name ?? null,
      displayName: account.name ?? null,
      avatar: account.avatar ?? null,
      isAway: false,
      status: null,
      namePronunciation: null,
      phone: null,
      description: null,
      timeZone: null,
      statusText: null,
      statusEmoji: null,
      statusExpiration: null,
      notificationsPausedUntil: null,
    }
  }
  return {
    ...profile,
    email: account.email,
    name: profile.name ?? account.name ?? null,
    avatar: profile.avatar ?? account.avatar ?? null,
  }
}
