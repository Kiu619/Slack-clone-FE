'use client'

import type { TypingUser } from '@/lib/types'

interface TypingIndicatorProps {
  typingUsers: TypingUser[]
}

/**
 * TypingIndicator — hiển thị ai đang gõ tin nhắn
 *
 * Logic giống Slack:
 * - 0 người: ẩn hoàn toàn
 * - 1 người: "Kiuu đang nhập..."
 * - 2 người: "Kiuu và Nam đang nhập..."
 * - 3+ người: "Kiuu, Nam và 1 người khác đang nhập..."
 * - 5+ người: "Nhiều người đang nhập..."
 */
function getTypingText(users: TypingUser[]): string {
  if (users.length === 0) return ''

  const names = users.map((u) => u.name ?? 'Ai đó')

  if (users.length === 1) return `${names[0]} đang nhập...`
  if (users.length === 2) return `${names[0]} và ${names[1]} đang nhập...`
  if (users.length <= 4) {
    const rest = users.length - 2
    return `${names[0]}, ${names[1]} và ${rest} người khác đang nhập...`
  }
  return 'Nhiều người đang nhập...'
}

export default function TypingIndicator({ typingUsers }: TypingIndicatorProps) {
  if (typingUsers.length === 0) return null

  return (
    <div className="flex items-center gap-2 px-4 py-1 min-h-[24px]">
      {/* Animated dots */}
      <div className="flex items-center gap-0.5">
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#797c81] animate-bounce"
          style={{ animationDelay: '0ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#797c81] animate-bounce"
          style={{ animationDelay: '200ms', animationDuration: '1s' }}
        />
        <span
          className="w-1.5 h-1.5 rounded-full bg-[#797c81] animate-bounce"
          style={{ animationDelay: '400ms', animationDuration: '1s' }}
        />
      </div>

      <span className="text-[12px] text-[#797c81]">
        {getTypingText(typingUsers)}
      </span>
    </div>
  )
}
