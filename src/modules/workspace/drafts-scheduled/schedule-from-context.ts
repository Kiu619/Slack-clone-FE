import type { MessageDraftSummary } from '@/lib/message-drafts'
import type {
  CreateScheduledMessageBody,
  ScheduledMessageRow,
} from '@/lib/scheduled-messages-api'

/** Khớp backend `MIN_LEAD_MS` (60s) — UI dùng 61s cho an toàn làm tròn */
export const SCHEDULE_MIN_LEAD_MS = 61_000

export function buildCreateScheduledBodyFromDraftSummary(
  row: MessageDraftSummary,
  scheduledAtIso: string,
): CreateScheduledMessageBody {
  const channelId = row.channelId ?? undefined
  const conversationId = row.conversationId ?? undefined
  if (!channelId && !conversationId) {
    throw new Error('Draft không gắn channel hoặc DM — không thể lên lịch')
  }
  return {
    content: row.html,
    channelId,
    conversationId,
    parentId: row.parentId ?? undefined,
    alsoSendToChannel: false,
    scheduledAt: scheduledAtIso,
  }
}

export function scheduledRowToDraftContextKey(
  row: ScheduledMessageRow,
): string {
  const ws = row.workspaceId
  if (row.parentId && row.channelId) {
    return `ws:${ws}:ch:${row.channelId}:thread:${row.parentId}`
  }
  if (row.parentId && row.conversationId) {
    return `ws:${ws}:dm:${row.conversationId}:thread:${row.parentId}`
  }
  if (row.channelId) return `ws:${ws}:ch:${row.channelId}`
  if (row.conversationId) return `ws:${ws}:dm:${row.conversationId}`
  return `ws:${ws}:unknown`
}

/** Giá trị mặc định cho ScheduleSendDialog khi reschedule */
export function scheduledAtIsoToFormDefaults(iso: string): {
  date: Date
  time: string
} {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}
