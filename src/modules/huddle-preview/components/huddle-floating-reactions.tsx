"use client"

import type { ActiveHuddleReaction } from "@/modules/huddle-preview/huddle-reactions"

type HuddleFloatingReactionsProps = {
  reactions: ActiveHuddleReaction[]
}

export function HuddleFloatingReactions({ reactions }: HuddleFloatingReactionsProps) {
  if (reactions.length === 0) return null

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden">
      {reactions.map((reaction, index) => {
        const offsetX = (index - (reactions.length - 1) / 2) * 18

        return (
          <div
            key={reaction.id}
            className="absolute bottom-8"
            style={{ left: `calc(50% + ${offsetX}px)` }}
          >
            <span className="block -translate-x-1/2 animate-[huddle-reaction-float_2.5s_ease-out_forwards] text-[34px] leading-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]">
              {reaction.emoji}
            </span>
          </div>
        )
      })}
    </div>
  )
}
