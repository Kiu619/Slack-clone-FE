"use client"

import {
  createHuddleReactionMessage,
  encodeHuddleReactionMessage,
  filterReactionsForFloat,
  filterReactionsForToast,
  groupReactionsByParticipant,
  HUDDLE_REACTION_TOPIC,
  HUDDLE_REACTION_TOAST_TTL_MS,
  parseHuddleReactionMessage,
  pruneExpiredReactions,
  type ActiveHuddleReaction,
} from "@/modules/huddle-preview/huddle-reactions"
import { Room, RoomEvent, type Participant } from "livekit-client"
import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from "react"
import { toast } from "sonner"
import { useHuddle } from "@/hooks/use-translation"

type UseHuddleReactionsOptions = {
  enabled: boolean
  roomRef: RefObject<Room | null>
  roomVersion: number
}

export function useHuddleReactions({ enabled, roomRef, roomVersion }: UseHuddleReactionsOptions) {
  const t = useHuddle()
  const room = roomRef.current
  const [reactions, setReactions] = useState<ActiveHuddleReaction[]>([])
  const [reactionClock, setReactionClock] = useState(() => Date.now())
  const seenReactionIdsRef = useRef(new Set<string>())

  const addReaction = useCallback((reaction: ActiveHuddleReaction) => {
    if (seenReactionIdsRef.current.has(reaction.id)) return false
    seenReactionIdsRef.current.add(reaction.id)
    setReactionClock(Date.now())
    setReactions((current) => [...current, reaction])
    return true
  }, [])

  const removeReaction = useCallback((reactionId: string) => {
    seenReactionIdsRef.current.delete(reactionId)
    setReactions((current) => current.filter((reaction) => reaction.id !== reactionId))
  }, [])

  const clearReactions = useCallback(() => {
    seenReactionIdsRef.current.clear()
    setReactions([])
  }, [])

  const handleDataReceived = useCallback(
    (
      payload: Uint8Array,
      participant?: Participant,
      _kind?: unknown,
      topic?: string,
    ) => {
      const message = parseHuddleReactionMessage(payload, topic)
      if (!message) return

      const participantId = message.senderId || participant?.identity
      if (!participantId) return

      addReaction({
        id: message.id,
        participantId,
        emoji: message.emoji,
        createdAt: Date.now(),
      })
    },
    [addReaction],
  )

  useEffect(() => {
    if (!enabled || !room) return

    room.on(RoomEvent.DataReceived, handleDataReceived)
    room.on(RoomEvent.Disconnected, clearReactions)

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived)
      room.off(RoomEvent.Disconnected, clearReactions)
    }
  }, [clearReactions, enabled, handleDataReceived, room, roomVersion])

  const pruneIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (pruneIntervalRef.current) {
        clearInterval(pruneIntervalRef.current);
        pruneIntervalRef.current = null;
      }
      return;
    }

    // Only start interval if there are reactions
    if (reactions.length > 0 && !pruneIntervalRef.current) {
      pruneIntervalRef.current = setInterval(() => {
        const now = Date.now();
        setReactionClock(now);
        setReactions((current) =>
          pruneExpiredReactions(current, HUDDLE_REACTION_TOAST_TTL_MS, now),
        );
      }, 200);
    }

    // Clear interval when no reactions
    if (reactions.length === 0 && pruneIntervalRef.current) {
      clearInterval(pruneIntervalRef.current);
      pruneIntervalRef.current = null;
    }

    return () => {
      if (pruneIntervalRef.current) {
        clearInterval(pruneIntervalRef.current);
        pruneIntervalRef.current = null;
      }
    };
  }, [enabled, reactions.length]);

  useEffect(() => {
    if (!enabled) {
      clearReactions()
    }
  }, [clearReactions, enabled])

  const sendReaction = useCallback(
    async (emoji: string) => {
      if (!room) return

      const trimmedEmoji = emoji.trim()
      if (!trimmedEmoji) return

      const senderId = room.localParticipant.identity
      if (!senderId) return

      const message = createHuddleReactionMessage(trimmedEmoji, senderId)
      const optimisticReaction: ActiveHuddleReaction = {
        id: message.id,
        participantId: senderId,
        emoji: message.emoji,
        createdAt: Date.now(),
      }

      const added = addReaction(optimisticReaction)
      if (!added) return

      try {
        await room.localParticipant.publishData(encodeHuddleReactionMessage(message), {
          reliable: false,
          topic: HUDDLE_REACTION_TOPIC,
        })
      } catch (error) {
        removeReaction(message.id)
        toast.error(
          error instanceof Error ? error.message : t("couldNotSendReaction"),
        )
      }
    },
    [addReaction, removeReaction, room],
  )

  const activeReactionsByParticipant = useMemo(
    () => groupReactionsByParticipant(filterReactionsForFloat(reactions, reactionClock)),
    [reactionClock, reactions],
  )

  const recentReactionToasts = useMemo(
    () =>
      filterReactionsForToast(reactions, reactionClock).toSorted(
        (left, right) => right.createdAt - left.createdAt,
      ),
    [reactionClock, reactions],
  )

  return {
    activeReactionsByParticipant,
    recentReactionToasts,
    sendReaction,
    clearReactions,
  }
}
