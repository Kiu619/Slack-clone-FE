/** IANA time zone string accepted by Intl (throws if invalid). */
export const isValidIanaTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format()
    return true
  } catch {
    return false
  }
}

export type ScheduledSendAckI18n =
  | {
      key: "draftsScheduled.ackSentence.today"
      params: { time: string }
    }
  | {
      key: "draftsScheduled.ackSentence.future"
      params: { date: string; time: string }
    }
  | {
      key: "draftsScheduled.ackSentence.invalid"
      params: Record<string, never>
    }

/**
 * Compute the i18n key + params for the post-schedule composer banner.
 * Caller passes the time-zone they want to display (workspace IANA when valid,
 * else browser default). Returns `null` if the date is invalid.
 *
 * The component renders the sentence using `useTranslations("draftsScheduled")(key, params)`,
 * so both EN and VI localizations work without hard-coded English strings.
 */
export const computeScheduledSendAckI18n = (
  scheduledAtIso: string,
  workspaceTimeZone?: string | null,
): ScheduledSendAckI18n | null => {
  const scheduled = new Date(scheduledAtIso)
  if (Number.isNaN(scheduled.getTime())) {
    return { key: "draftsScheduled.ackSentence.invalid", params: {} }
  }

  const tz =
    workspaceTimeZone && isValidIanaTimeZone(workspaceTimeZone)
      ? workspaceTimeZone
      : undefined

  const dayKeyFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const sameCalendarDay =
    dayKeyFmt.format(scheduled) === dayKeyFmt.format(new Date())

  const timeFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const timeStr = timeFmt.format(scheduled)

  if (sameCalendarDay) {
    return {
      key: "draftsScheduled.ackSentence.today",
      params: { time: timeStr },
    }
  }

  const dateFmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    month: "short",
    day: "numeric",
  })
  const dateStr = dateFmt.format(scheduled)
  return {
    key: "draftsScheduled.ackSentence.future",
    params: { date: dateStr, time: timeStr },
  }
}
