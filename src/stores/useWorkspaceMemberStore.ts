import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import type { ChannelMember, User, WorkspaceMemberStatus } from '@/lib/types'

/** Snapshot hiển thị user trong workspace — merge từ API + socket `user_profile_updated` */
export type WorkspaceMemberDisplay = Pick<User, 'id'> & Partial<Omit<User, 'id'>>

interface WorkspaceMemberState {
  byWorkspace: Record<string, Record<string, WorkspaceMemberDisplay>>
  patchFromSocket: (workspaceId: string, data: Record<string, unknown>) => void
  upsertMany: (workspaceId: string, users: WorkspaceMemberDisplay[]) => void
  resetWorkspace: (workspaceId: string) => void
}

export const useWorkspaceMemberStore = create<WorkspaceMemberState>((set) => ({
  byWorkspace: {},

  patchFromSocket: (workspaceId, data) => {
    const userId = data.id as string | undefined
    if (!userId) return
    const payloadWs = data.workspaceId as string | undefined
    if (payloadWs !== undefined && payloadWs !== workspaceId) return

    set((state) => {
      const prevMap = state.byWorkspace[workspaceId] || {}
      const prev = prevMap[userId] || { id: userId }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, workspaceId: _ws, ...rest } = data as Record<string, unknown>
      const incoming = Object.fromEntries(
        Object.entries(rest).filter(([, v]) => v !== undefined),
      ) as Partial<Omit<WorkspaceMemberDisplay, 'id'>>
      const next: WorkspaceMemberDisplay = { ...prev, ...incoming, id: userId }
      return {
        byWorkspace: {
          ...state.byWorkspace,
          [workspaceId]: { ...prevMap, [userId]: next },
        },
      }
    })
  },

  upsertMany: (workspaceId, users) => {
    if (!users.length) return
    set((state) => {
      const prevMap = state.byWorkspace[workspaceId] || {}
      const nextMap = { ...prevMap }
      for (const u of users) {
        if (!u.id) continue
        const prev = nextMap[u.id] || { id: u.id }
        nextMap[u.id] = { ...prev, ...u, id: u.id }
      }
      return { byWorkspace: { ...state.byWorkspace, [workspaceId]: nextMap } }
    })
  },

  resetWorkspace: (workspaceId) => {
    set((state) => {
      const { [workspaceId]: _, ...rest } = state.byWorkspace
      return { byWorkspace: rest }
    })
  },
}))

/** Message API từng chỉ gửi `status` (copy status_text); UI đọc `statusText`. */
function withMessageUserStatusText<T extends User>(u: T): T {
  const statusText = u.statusText ?? u.status ?? null
  if (statusText === u.statusText) return u
  return { ...u, statusText }
}

/** Ưu tiên overlay từ store (realtime); thiếu field thì giữ `base` từ API/message. */
export function mergeUserForDisplay(
  base: User,
  overlay?: WorkspaceMemberDisplay | null,
): User {
  const baseNorm = withMessageUserStatusText(base)
  if (!overlay) return baseNorm
  return withMessageUserStatusText({ ...baseNorm, ...overlay, id: base.id })
}

export function useWorkspaceMemberOverlay(
  workspaceId: string,
  userId: string | undefined,
): WorkspaceMemberDisplay | undefined {
  return useWorkspaceMemberStore(
    useShallow((s) => (userId ? s.byWorkspace[workspaceId]?.[userId] : undefined)),
  )
}

/** Merge GET .../status với slice realtime (profile panel). */
export function mergeMemberStatusWithOverlay(
  api: WorkspaceMemberStatus | undefined,
  overlay: WorkspaceMemberDisplay | undefined,
): WorkspaceMemberStatus | undefined {
  if (!overlay) return api
  if (!api) {
    return {
      id: overlay.id,
      name: overlay.name ?? null,
      displayName: overlay.displayName,
      email: overlay.email ?? '',
      avatar: overlay.avatar ?? null,
      isAway: overlay.isAway ?? false,
      status: overlay.status ?? null,
      namePronunciation: overlay.namePronunciation ?? null,
      phone: overlay.phone ?? null,
      description: overlay.description ?? null,
      timeZone: overlay.timeZone ?? null,
      statusText: overlay.statusText ?? null,
      statusEmoji: overlay.statusEmoji ?? null,
      statusExpiration: (overlay.statusExpiration ?? null) as string | null,
      notificationsPausedUntil: (overlay.notificationsPausedUntil ?? null) as string | null,
    }
  }
  return {
    ...api,
    ...(overlay.name !== undefined && { name: overlay.name ?? null }),
    ...(overlay.displayName !== undefined && { displayName: overlay.displayName }),
    ...(overlay.avatar !== undefined && { avatar: overlay.avatar ?? null }),
    ...(overlay.email !== undefined && { email: overlay.email }),
    ...(overlay.isAway !== undefined && { isAway: overlay.isAway }),
    ...(overlay.statusText !== undefined && { statusText: overlay.statusText ?? null }),
    ...(overlay.statusEmoji !== undefined && { statusEmoji: overlay.statusEmoji ?? null }),
    ...(overlay.statusExpiration !== undefined && {
      statusExpiration: (overlay.statusExpiration ?? null) as string | null,
    }),
    ...(overlay.notificationsPausedUntil !== undefined && {
      notificationsPausedUntil: (overlay.notificationsPausedUntil ?? null) as string | null,
    }),
    ...(overlay.status !== undefined && { status: overlay.status ?? null }),
    ...(overlay.namePronunciation !== undefined && {
      namePronunciation: overlay.namePronunciation ?? null,
    }),
    ...(overlay.phone !== undefined && { phone: overlay.phone ?? null }),
    ...(overlay.description !== undefined && { description: overlay.description ?? null }),
    ...(overlay.timeZone !== undefined && { timeZone: overlay.timeZone ?? null }),
  }
}

/** Merge hàng channel member với slice realtime (Members tab). */
export function mergeChannelMemberWithOverlay(
  m: ChannelMember,
  overlay: WorkspaceMemberDisplay | undefined | null,
): ChannelMember {
  if (!overlay) return m
  return {
    ...m,
    ...(overlay.name !== undefined && { name: overlay.name ?? null }),
    ...(overlay.displayName !== undefined && { displayName: overlay.displayName }),
    ...(overlay.avatar !== undefined && { avatar: overlay.avatar ?? null }),
    ...(overlay.isAway !== undefined && { isAway: overlay.isAway }),
    ...(overlay.statusEmoji !== undefined && { statusEmoji: overlay.statusEmoji }),
    ...(overlay.statusText !== undefined && { statusText: overlay.statusText }),
    ...(overlay.email !== undefined &&
      typeof overlay.email === 'string' && { email: overlay.email }),
  }
}
