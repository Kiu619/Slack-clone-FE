"use client"

import Avatar from "@/components/avatar"
import Typography from "@/components/ui/typography"
import { getHuddleStateApi, leaveHuddleApi } from "@/apis"
import { useAuth } from "@/hooks/use-auth"
import { useSocket, leaveHuddleSocket } from "@/hooks/use-socket"
import {
  openHuddlePreviewWindow,
  requestHuddlePreviewLeave,
} from "@/lib/open-huddle-preview-window"
import { huddleKeys } from "@/lib/query-keys"
import type {
  HuddleEntityType,
  HuddleParticipantSnapshot,
  HuddleSessionSnapshot,
  HuddleTarget,
} from "@/lib/huddle"
import type { User } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { IoChevronDownOutline } from "react-icons/io5"
import { RiHeadphoneLine } from "react-icons/ri"
import { toast } from "sonner"
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
  type WorkspaceMemberDisplay,
} from "@/stores/useWorkspaceMemberStore"
import { useShallow } from "zustand/react/shallow"
import { useAppTranslation } from "@/hooks/use-translation"

type HuddleHeaderBadgeProps = {
  workspaceId: string
  entityType: HuddleEntityType
  entityId: string
  label: string
  canInteract?: boolean
  blockedJoinMessage?: string | null
}

function toDisplayUser(
  participant: HuddleParticipantSnapshot,
  workspaceId: string,
): User {
  return {
    id: participant.userId,
    email: "",
    name: participant.name,
    displayName: participant.displayName,
    avatar: participant.avatar,
    membershipStatus: participant.membershipStatus,
    workspaceId,
  }
}

function ParticipantAvatar({ displayUser }: { displayUser: User }) {
  const alt = displayUser.displayName?.trim() || displayUser.name?.trim() || "User"

  return (
    <Avatar
      src={displayUser.avatar ?? null}
      alt={alt}
      className="h-6 w-6 rounded-full border border-white/10 bg-[#0f2f1d]"
    />
  )
}

function ParticipantStack({
  participants,
  overlayMap,
  workspaceId,
}: {
  participants: HuddleParticipantSnapshot[]
  overlayMap: Record<string, WorkspaceMemberDisplay>
  workspaceId: string
}) {
  if (participants.length === 0) return null

  const displayParticipants = participants.map((participant) =>
    mergeUserForDisplay(
      toDisplayUser(participant, workspaceId),
      overlayMap[participant.userId] ?? null,
    ),
  )

  if (participants.length <= 3) {
    return (
      <div className="flex items-center">
        {displayParticipants.map((displayUser, index) => (
          <div
            key={displayUser.id}
            className={cn(index > 0 && "-ml-1.5")}
          >
            <ParticipantAvatar displayUser={displayUser} />
          </div>
        ))}
      </div>
    )
  }

  const visibleParticipants = displayParticipants.slice(0, 2)
  const remainingCount = participants.length - visibleParticipants.length

  return (
    <div className="flex items-center">
      {visibleParticipants.map((displayUser, index) => (
        <div key={displayUser.id} className={cn(index > 0 && "-ml-1.5")}>
          <ParticipantAvatar displayUser={displayUser} />
        </div>
      ))}
      <div className="-ml-1.5 flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-[#0f2f1d] px-1 text-[10px] font-bold text-white">
        +{remainingCount}
      </div>
    </div>
  )
}

export function HuddleHeaderBadge({
  workspaceId,
  entityType,
  entityId,
  label,
  canInteract = true,
  blockedJoinMessage = null,
}: HuddleHeaderBadgeProps) {
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuth()
  const [isLeaving, setIsLeaving] = useState(false)
  const { socket } = useSocket()
  const t = useAppTranslation('huddle.header')
  const overlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )

  const target = useMemo<HuddleTarget>(
    () => ({ workspaceId, entityType, entityId }),
    [workspaceId, entityType, entityId],
  )

  const queryKey = huddleKeys.state(workspaceId, entityType, entityId)
  const { data: huddleState } = useQuery({
    queryKey,
    queryFn: () => getHuddleStateApi(target),
    enabled: Boolean(workspaceId && entityId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
  })

  const activeSession: HuddleSessionSnapshot | null = huddleState?.activeSession ?? null
  const activeParticipants = useMemo(() => {
    if (!activeSession?.participants?.length) return []

    const uniqueParticipants = new Map<string, HuddleParticipantSnapshot>()
    for (const participant of activeSession.participants) {
      if (participant.leftAt !== null) continue
      if (participant.membershipStatus !== "active") continue
      if (!uniqueParticipants.has(participant.userId)) {
        uniqueParticipants.set(participant.userId, participant)
      }
    }

    return Array.from(uniqueParticipants.values())
  }, [activeSession])

  const activeParticipantCount = activeParticipants.length
  const hasActiveHuddle = Boolean(activeSession && activeParticipantCount > 0)
  const joinedByCurrentUser = Boolean(
    currentUser?.id &&
      activeParticipants.some((participant) => participant.userId === currentUser.id),
  )
  const showParticipantStack = hasActiveHuddle && !joinedByCurrentUser
  const showJoinAction = hasActiveHuddle && !joinedByCurrentUser
  const showLeaveAction = hasActiveHuddle && joinedByCurrentUser
  const tooltipText = showLeaveAction
    ? t('leaveHuddle')
    : showJoinAction
      ? t('joinHuddle')
      : t('startHuddle')

  const badgeClassName = cn(
    "flex items-center gap-1 rounded-md border px-2 py-1 transition-colors",
    showLeaveAction
      ? "border-[#2ea55f] bg-[#1f8f4a] text-white hover:bg-[#248a4b]"
      : showJoinAction
        ? "border-[#276842] bg-[#134f31] text-white hover:bg-[#155333]"
        : "border-[#797c814d] text-workspace-side-panel-text hover:bg-[rgba(255,255,255,0.1)] dark:hover:bg-[#222529]",
    (!canInteract && !showLeaveAction) && "cursor-pointer opacity-60",
    isLeaving && "pointer-events-none opacity-50",
  )

  const handleClick = () => {
    if (isLeaving) return

    if (showLeaveAction) {
      setIsLeaving(true)
      requestHuddlePreviewLeave(target)

      // Optimistic update: remove self from participants
      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old?.activeSession) return old
        return {
          ...old,
          activeSession: {
            ...old.activeSession,
            participants: old.activeSession.participants?.filter(
              (p: any) => p.userId !== currentUser?.id
            )
          }
        }
      })

      // Fire-and-forget
      if (socket?.connected) {
        void leaveHuddleSocket(target, socket).catch(() => {})
      } else {
        void leaveHuddleApi(target).catch(() => {})
      }

      // Immediately invalidate to trigger re-render
      queryClient.invalidateQueries({
        queryKey: huddleKeys.workspaceHuddles(workspaceId, undefined)
      })

      setTimeout(() => setIsLeaving(false), 100)
      return
    }

    if (!canInteract) {
      if (blockedJoinMessage) toast.message(blockedJoinMessage)
      return
    }

    openHuddlePreviewWindow({
      workspaceId,
      entityType,
      entityId,
      label,
      mode: showJoinAction ? "join" : "start",
    })
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={tooltipText}
          aria-disabled={!canInteract && !showLeaveAction}
          className={badgeClassName}
          onClick={handleClick}
        >
          {showParticipantStack ? (
            <ParticipantStack
              participants={activeParticipants}
              overlayMap={overlayMap}
              workspaceId={workspaceId}
            />
          ) : null}
          <RiHeadphoneLine size={18} />
          {showJoinAction ? (
            <span className="min-w-[0.9rem] text-center text-[13px] font-semibold leading-none">
              {activeParticipantCount}
            </span>
          ) : null}
          <IoChevronDownOutline size={16} className="shrink-0" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="center">
        <Typography text={tooltipText} variant="p" className="text-[14px]!" />
      </TooltipContent>
    </Tooltip>
  )
}
