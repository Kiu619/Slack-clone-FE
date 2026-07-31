'use client'

import { useAuth } from '@/hooks/use-auth'
import type { HuddleParticipantSnapshot, HuddleSessionSnapshot } from '@/lib/huddle'
import type { User } from '@/lib/types'
import { cn } from '@/lib/utils'
import Avatar from '@/components/avatar'
import Typography from '@/components/ui/typography'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { RiHeadphoneLine } from 'react-icons/ri'
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
  type WorkspaceMemberDisplay,
} from '@/stores/useWorkspaceMemberStore'
import { useWorkspaceHuddlesStore } from '@/stores/useWorkspaceHuddlesStore'
import { useShallow } from 'zustand/react/shallow'

type ParticipantAvatarProps = {
  displayUser: User
  className?: string
}

function ParticipantAvatar({ displayUser, className }: ParticipantAvatarProps) {
  const alt = displayUser.displayName?.trim() || displayUser.name?.trim() || 'User'

  return (
    <Avatar
      src={displayUser.avatar ?? null}
      alt={alt}
      className={cn('h-5 w-5 rounded-full border border-white/10 bg-[#0f2f1d]', className)}
    />
  )
}

type ParticipantStackProps = {
  participants: HuddleParticipantSnapshot[]
  overlayMap: Record<string, WorkspaceMemberDisplay>
  workspaceId: string
}

function toDisplayUser(
  participant: HuddleParticipantSnapshot,
  workspaceId: string,
): User {
  return {
    id: participant.userId,
    email: '',
    name: participant.name,
    displayName: participant.displayName,
    avatar: participant.avatar,
    membershipStatus: participant.membershipStatus,
    workspaceId,
  }
}

function ParticipantStack({ participants, overlayMap, workspaceId }: ParticipantStackProps) {
  if (participants.length === 0) return null

  const displayParticipants = participants.map((participant) =>
    mergeUserForDisplay(
      toDisplayUser(participant, workspaceId),
      overlayMap[participant.userId] ?? null,
    ),
  )

  if (displayParticipants.length <= 3) {
    return (
      <div className="flex items-center">
        {displayParticipants.map((displayUser, index) => (
          <div
            key={displayUser.id}
            className={cn(index > 0 && '-ml-1')}
          >
            <ParticipantAvatar displayUser={displayUser} />
          </div>
        ))}
      </div>
    )
  }

  const visibleParticipants = displayParticipants.slice(0, 2)
  const remainingCount = displayParticipants.length - visibleParticipants.length

  return (
    <div className="flex items-center">
      {visibleParticipants.map((displayUser, index) => (
        <div key={displayUser.id} className={cn(index > 0 && '-ml-1')}>
          <ParticipantAvatar displayUser={displayUser} />
        </div>
      ))}
      <div className="-ml-1 flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-[#0f2f1d] px-1 text-[10px] font-bold text-white">
        +{remainingCount}
      </div>
    </div>
  )
}

type HuddleSidebarIndicatorProps = {
  workspaceId: string
  entityType: 'channel' | 'dm'
  entityId: string
}

export function HuddleSidebarIndicator({
  workspaceId,
  entityType,
  entityId,
}: HuddleSidebarIndicatorProps) {
  const { user: currentUser } = useAuth()
  const overlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )

  // Read activeSession from Zustand store - Zustand-first pattern
  const huddleEntry = useWorkspaceHuddlesStore(
    useShallow((s) => s.huddlesByEntity[`${entityType}:${entityId}`]),
  )
  const activeSession = huddleEntry?.state.activeSession ?? null

  // Filter to only active participants (leftAt === null and active membership)
  const activeParticipants = (() => {
    if (!activeSession?.participants?.length) return []

    const uniqueParticipants = new Map<string, HuddleParticipantSnapshot>()
    for (const participant of activeSession.participants) {
      if (participant.leftAt !== null) continue
      if (participant.membershipStatus !== 'active') continue
      if (!uniqueParticipants.has(participant.userId)) {
        uniqueParticipants.set(participant.userId, participant)
      }
    }

    return Array.from(uniqueParticipants.values())
  })()

  const hasActiveHuddle = Boolean(activeSession && activeParticipants.length > 0)

  if (!hasActiveHuddle) return null

  const participantCount = activeParticipants.length

  // Build tooltip text based on participant count
  const getTooltipText = () => {
    if (participantCount === 1) {
      const participant = activeParticipants[0]
      const isCurrentUser = participant.userId === currentUser?.id

      if (isCurrentUser) {
        return 'Just you in the huddle'
      }

      const displayName = participant.displayName || participant.name || 'User'
      return `${displayName} is in the huddle`
    }

    return `${participantCount} people in the huddle`
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex items-center gap-1 text-[#2ea55f]">
          <ParticipantStack
            participants={activeParticipants}
            overlayMap={overlayMap}
            workspaceId={workspaceId}
          />
          <RiHeadphoneLine size={14} className="shrink-0" />
          <Typography
            text={participantCount.toString()}
            variant="p"
            className="text-[12px]! leading-none"
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" align="center">
        <Typography text={getTooltipText()} variant="p" className="text-[13px]!" />
      </TooltipContent>
    </Tooltip>
  )
}
