export const HUDDLE_REACTION_TOPIC = "huddle-reaction"

export const HUDDLE_REACTION_FLOAT_TTL_MS = 2500

export const HUDDLE_REACTION_TOAST_TTL_MS = HUDDLE_REACTION_FLOAT_TTL_MS + 1000

export type HuddleReactionMessage = {
  v: 1
  type: "reaction"
  id: string
  emoji: string
  senderId: string
}

export type ActiveHuddleReaction = {
  id: string
  participantId: string
  emoji: string
  createdAt: number
}

export function encodeHuddleReactionMessage(message: HuddleReactionMessage): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(message))
}

export function parseHuddleReactionMessage(
  payload: Uint8Array,
  topic?: string,
): HuddleReactionMessage | null {
  if (topic !== HUDDLE_REACTION_TOPIC) return null

  try {
    const parsed = JSON.parse(new TextDecoder().decode(payload)) as Record<string, unknown>
    if (parsed.v !== 1 || parsed.type !== "reaction") return null
    if (typeof parsed.id !== "string" || !parsed.id) return null
    if (typeof parsed.emoji !== "string" || !parsed.emoji) return null
    if (typeof parsed.senderId !== "string" || !parsed.senderId) return null

    return {
      v: 1,
      type: "reaction",
      id: parsed.id,
      emoji: parsed.emoji,
      senderId: parsed.senderId,
    }
  } catch {
    return null
  }
}

export function createHuddleReactionMessage(
  emoji: string,
  senderId: string,
): HuddleReactionMessage {
  return {
    v: 1,
    type: "reaction",
    id: crypto.randomUUID(),
    emoji,
    senderId,
  }
}

export function groupReactionsByParticipant(
  reactions: ActiveHuddleReaction[],
): Record<string, ActiveHuddleReaction[]> {
  return reactions.reduce<Record<string, ActiveHuddleReaction[]>>((acc, reaction) => {
    if (!acc[reaction.participantId]) {
      acc[reaction.participantId] = []
    }
    acc[reaction.participantId].push(reaction)
    return acc
  }, {})
}

export function pruneExpiredReactions(
  reactions: ActiveHuddleReaction[],
  ttlMs: number,
  now = Date.now(),
): ActiveHuddleReaction[] {
  return reactions.filter((reaction) => now - reaction.createdAt < ttlMs)
}

export function filterReactionsForFloat(
  reactions: ActiveHuddleReaction[],
  now = Date.now(),
): ActiveHuddleReaction[] {
  return pruneExpiredReactions(reactions, HUDDLE_REACTION_FLOAT_TTL_MS, now)
}

export function filterReactionsForToast(
  reactions: ActiveHuddleReaction[],
  now = Date.now(),
): ActiveHuddleReaction[] {
  return pruneExpiredReactions(reactions, HUDDLE_REACTION_TOAST_TTL_MS, now)
}
