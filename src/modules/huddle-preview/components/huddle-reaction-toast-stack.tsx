"use client"

import { cn } from "@/lib/utils"

export type HuddleReactionToastItem = {
  id: string
  displayName: string
  emoji: string
}

type HuddleReactionToastStackProps = {
  items: HuddleReactionToastItem[]
}

const MAX_VISIBLE_TOASTS = 4

export function HuddleReactionToastStack({ items }: HuddleReactionToastStackProps) {
  const visibleItems = items.slice(0, MAX_VISIBLE_TOASTS)
  if (visibleItems.length === 0) return null

  return (
    <div className="pointer-events-none absolute bottom-3 right-3 z-30 flex max-w-[min(100%,280px)] flex-col items-end gap-2">
      {visibleItems.map((item) => {
        const isSelf = item.displayName === "You"

        return (
        <div
          key={item.id}
          className={cn(
            "flex max-w-full items-center gap-2 rounded-full border px-3 py-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.22)] backdrop-blur-sm animate-in fade-in slide-in-from-bottom-2 duration-200",
            isSelf
              ? "border-white/70 bg-white/95"
              : "border-[#cfe39a]/90 bg-[#e8f5c3]/96",
          )}
        >
          <span
            className={cn(
              "truncate text-[13px] font-semibold",
              isSelf ? "text-[#1d2b1d]" : "text-[#2f4a22]",
            )}
          >
            {item.displayName}
          </span>
          <span className="shrink-0 text-[18px] leading-none">{item.emoji}</span>
        </div>
        )
      })}
    </div>
  )
}
