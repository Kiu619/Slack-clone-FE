export type MessagesSearchSort = "most_relevant" | "newest" | "oldest"

export type MessagesSearchFilters = {
  fromUserId: string | null
  inChannelId: string | null
  inConversationId: string | null
  datePreset: "any" | "today" | "7d" | "30d"
  fileType: "any" | "pdf" | "image" | "video" | "code" | "audio"
  reactionsQuery: string
  hasFile: boolean
  hasLink: boolean
  hasAction: boolean
  isDm: boolean
  inThread: boolean
  saved: boolean
  pinned: boolean
}

export const createDefaultMessagesSearchFilters = (): MessagesSearchFilters => ({
  fromUserId: null,
  inChannelId: null,
  inConversationId: null,
  datePreset: "any",
  fileType: "any",
  reactionsQuery: "",
  hasFile: false,
  hasLink: false,
  hasAction: false,
  isDm: false,
  inThread: false,
  saved: false,
  pinned: false,
})

const DEFAULT = createDefaultMessagesSearchFilters()

export const countActiveMessagesFilters = (
  filters: MessagesSearchFilters,
  sort: MessagesSearchSort,
): number => {
  let n = 0
  const keys = Object.keys(DEFAULT) as (keyof MessagesSearchFilters)[]
  for (const k of keys) {
    if (filters[k] !== DEFAULT[k]) n += 1
  }
  if (sort !== "newest") n += 1
  return n
}
