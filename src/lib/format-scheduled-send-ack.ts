/** IANA time zone string accepted by Intl (throws if invalid). */
export const isValidIanaTimeZone = (tz: string): boolean => {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz }).format()
    return true
  } catch {
    return false
  }
}

/**
 * English sentence for the post-schedule composer banner (Slack-style).
 * Uses workspace IANA zone when valid; otherwise omits timeZone (browser default).
 */
export const formatScheduledSendAckSentence = (
  scheduledAtIso: string,
  workspaceTimeZone?: string | null,
): string => {
  const scheduled = new Date(scheduledAtIso)
  if (Number.isNaN(scheduled.getTime())) {
    return 'Your message will be sent at the scheduled time.'
  }

  const tz =
    workspaceTimeZone && isValidIanaTimeZone(workspaceTimeZone)
      ? workspaceTimeZone
      : undefined

  const dayKeyFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
  const sameCalendarDay =
    dayKeyFmt.format(scheduled) === dayKeyFmt.format(new Date())

  const yearFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
  })
  const sameCalendarYear =
    yearFmt.format(scheduled) === yearFmt.format(new Date())

  const timeFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
  const timeStr = timeFmt.format(scheduled)

  if (sameCalendarDay) {
    return `Your message will be sent today at ${timeStr}.`
  }

  const dateFmt = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    ...(sameCalendarYear ? {} : { year: 'numeric' as const }),
  })
  const dateStr = dateFmt.format(scheduled)
  return `Your message will be sent on ${dateStr} at ${timeStr}.`
}
