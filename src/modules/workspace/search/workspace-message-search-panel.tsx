"use client"

import { fetchWorkspaceMembersApi, getMessageByIdApi } from "@/apis"
import MessageSearchDialog, { type FilterValues } from "@/components/dialogs/message-search-dialog"
import { Avatar, AvatarFallback, AvatarGroup, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { useChannels } from "@/hooks/use-channel"
import { useConversations } from "@/hooks/use-conversations"
import { useWorkspaceMessageSearch } from "@/hooks/use-workspace-message-search"
import { useWorkspaceRecents } from "@/hooks/use-workspace-recents"
import type {
  Channel,
  DirectMessageConversation,
  User,
  WorkspaceMember,
  WorkspaceMessageSearchItem,
} from "@/lib/types"
import { cn } from "@/lib/utils"
import { getConversationSummary } from "@/modules/global-search/utils"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import type { ReactNode } from "react"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FiCheck, FiHash } from "react-icons/fi"
import { LiaSlidersHSolid } from "react-icons/lia"
import { MdOutlineLock } from "react-icons/md"
import { useMessageFocusStore } from "@/stores/useMessageFocusStore"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { useMainPanelStore } from "@/stores/useMainPanelStore"
import { useThreadPanelStore } from "@/stores/useThreadPanelStore"
import { useUserStore } from "@/stores/useUserStore"
import { useMessageStore } from "@/stores/useMessageStore"
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore"
import { useShallow } from "zustand/react/shallow"
import MessageSearchResult from "./message-search-result"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { Skeleton } from "@/components/ui/skeleton"

const SORT_SEARCH_OPTIONS = [
  { id: "relevance", label: "Relevance" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
]

type PaginationValue = number | "..."
const PAGE_SIZE = 20
const TOOLBAR_GAP_PX = 8
const DEFAULT_COLLAPSE_WIDTHS = {
  type: 140,
  from: 104,
  in: 72,
}

function getPaginationRange(currentPage: number, totalPages: number) {
  const pages: PaginationValue[] = []
  const push = (value: PaginationValue) => {
    if (pages[pages.length - 1] !== value) pages.push(value)
  }

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) push(page)
    return pages
  }

  push(1)
  if (currentPage > 3) push("...")

  const start = Math.max(2, currentPage - 1)
  const end = Math.min(totalPages - 1, currentPage + 1)
  for (let page = start; page <= end; page += 1) push(page)

  if (currentPage < totalPages - 2) push("...")
  push(totalPages)

  return pages
}

export function WorkspaceMessageSearchPanel({
  workspaceId,
  typeSelect,
  activeResultId,
  onSelectMainResult,
  onSelectThreadResult,
}: {
  workspaceId: string
  typeSelect?: ReactNode
  activeResultId?: string | null
  onSelectMainResult?: (id: string) => void
  onSelectThreadResult?: (id: string) => void
}) {
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  })
  const currentUser = useUserStore((state) => state.user)
  const { data: channels = [] } = useChannels(workspaceId)
  const { data: conversations = [] } = useConversations(workspaceId)
  const { data: recentsData } = useWorkspaceRecents(workspaceId)
  const { setView } = useMainPanelStore()
  const setFocusedMessageId = useMessageFocusStore(
    (state) => state.setFocusedMessageId,
  )
  const { open: openThread, close: closeThread } = useThreadPanelStore()

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )

  const displayMember = (member: WorkspaceMember) =>
    mergeUserForDisplay(member as User, memberOverlayMap[member.id])

  const query = useGlobalSearchStore((state) => state.query)
  const fromUserIds = useGlobalSearchStore((state) => state.fromUserIds)
  const withUserIds = useGlobalSearchStore((state) => state.withUserIds)
  const inChannelIds = useGlobalSearchStore((state) => state.inChannelIds)
  const inConversationIds = useGlobalSearchStore(
    (state) => state.inConversationIds,
  )
  const hasFilterTypes = useGlobalSearchStore((state) => state.hasFilterTypes)
  const isFilterTypes = useGlobalSearchStore((state) => state.isFilterTypes)
  const typeFilterTypes = useGlobalSearchStore((state) => state.typeFilterTypes)
  const afterDate = useGlobalSearchStore((state) => state.afterDate)
  const beforeDate = useGlobalSearchStore((state) => state.beforeDate)
  const setFromUserIds = useGlobalSearchStore((state) => state.setFromUserIds)
  const setInChannelIds = useGlobalSearchStore(
    (state) => state.setInChannelIds,
  )
  const setInConversationIds = useGlobalSearchStore(
    (state) => state.setInConversationIds,
  )
  const addInChannelId = useGlobalSearchStore((state) => state.addInChannelId)
  const removeInChannelId = useGlobalSearchStore(
    (state) => state.removeInChannelId,
  )
  const addInConversationId = useGlobalSearchStore(
    (state) => state.addInConversationId,
  )
  const removeInConversationId = useGlobalSearchStore(
    (state) => state.removeInConversationId,
  )

  const [openFromSearch, setOpenFromSearch] = useState(false)
  const [openSortSearch, setOpenSortSearch] = useState(false)
  const [openInSearch, setOpenInSearch] = useState(false)
  const [sortBy, setSortBy] = useState<string>("relevance")
  const [messageFilterDialogOpen, setMessageFilterDialogOpen] = useState(false)
  const [fromSearch, setFromSearch] = useState("")
  const [inSearch, setInSearch] = useState("")
  const toolbarRef = useRef<HTMLDivElement>(null)
  const leftControlsRef = useRef<HTMLDivElement>(null)
  const typeButtonRef = useRef<HTMLDivElement>(null)
  const fromButtonRef = useRef<HTMLDivElement>(null)
  const inButtonRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLDivElement>(null)
  const cachedWidthsRef = useRef({ ...DEFAULT_COLLAPSE_WIDTHS })
  const [hiddenLevel, setHiddenLevel] = useState(0)
  const [page, setPage] = useState(1)
  const offset = (page - 1) * PAGE_SIZE
  const searchParams = useMemo(
    () => ({
      workspaceId,
      q: query,
      fromUserIds,
      withUserIds,
      channelIds: inChannelIds,
      conversationIds: inConversationIds,
      has: hasFilterTypes,
      is: isFilterTypes,
      types: typeFilterTypes,
      afterDate,
      beforeDate,
      sort: sortBy as "relevance" | "newest" | "oldest",
      limit: PAGE_SIZE,
      offset,
    }),
    [
      workspaceId,
      query,
      fromUserIds,
      withUserIds,
      inChannelIds,
      inConversationIds,
      hasFilterTypes,
      isFilterTypes,
      typeFilterTypes,
      afterDate,
      beforeDate,
      sortBy,
      offset,
    ],
  )

  const {
    data: searchResults,
    isLoading: isSearchLoading,
    isFetching: isSearchFetching,
    isError: isSearchError,
    error: searchError,
  } = useWorkspaceMessageSearch(searchParams)

  const upsertMessageEntities = useMessageStore(
    (state) => state.upsertEntities,
  )

  useEffect(() => {
    if (!searchResults?.items.length) return
    upsertMessageEntities(searchResults.items.map((item) => item.message))
  }, [searchResults?.items, upsertMessageEntities])

  useEffect(() => {
    console.log("[message-search] params", searchParams)
  }, [searchParams])

  useEffect(() => {
    console.log("[message-search] status", {
      isSearchLoading,
      isSearchFetching,
      isSearchError,
      error: searchError instanceof Error ? searchError.message : searchError,
    })
  }, [isSearchError, isSearchFetching, isSearchLoading, searchError])

  useEffect(() => {
    console.log("[message-search] results", searchResults)
  }, [searchResults])

  const activeFilterCount =
    fromUserIds.length +
    withUserIds.length +
    inChannelIds.length +
    inConversationIds.length +
    hasFilterTypes.length +
    isFilterTypes.length +
    typeFilterTypes.length +
    (afterDate || beforeDate ? 1 : 0)

  const selectedFromMembers = useMemo(
    () =>
      fromUserIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter(Boolean) as WorkspaceMember[],
    [fromUserIds, members],
  )

  const selectedInChannels = useMemo(
    () => channels.filter((channel) => inChannelIds.includes(channel.id)),
    [channels, inChannelIds],
  )
  const selectedInConversations = useMemo(
    () =>
      conversations.filter((conversation) =>
        inConversationIds.includes(conversation.id),
      ),
    [conversations, inConversationIds],
  )
  const selectedInCount =
    selectedInChannels.length + selectedInConversations.length

  const fromButtonLabel = (() => {
    if (selectedFromMembers.length === 0) return "From"
    if (selectedFromMembers.length >= 2)
      return `${selectedFromMembers.length} teammates`

    const [firstMember, ...rest] = selectedFromMembers
    const display = displayMember(firstMember)
    const label =
      display.displayName ||
      display.name ||
      display.email ||
      firstMember.id
    return rest.length > 0 ? `${label} +${rest.length}` : label
  })()

  const fromButtonAvatar = selectedFromMembers[0]
  const fromButtonAvatarDisplay = fromButtonAvatar
    ? displayMember(fromButtonAvatar)
    : null

  const selectedInLabel = (() => {
    if (selectedInCount === 0) return "In"
    if (selectedInCount >= 2) return `${selectedInCount} places`

    const channel = selectedInChannels[0]
    if (channel) return channel.name

    const conversation = selectedInConversations[0]
    if (!conversation) return "In"
    return getConversationSummary(
      conversation,
      currentUser?.id,
      memberOverlayMap,
    ).label
  })()

  const selectedInChannel = selectedInChannels[0]
  const selectedInConversation = selectedInConversations[0]
  const selectedInConversationSummary = selectedInConversation
    ? getConversationSummary(
      selectedInConversation,
      currentUser?.id,
      memberOverlayMap,
    )
    : null

  const syncCollapsedControls = useCallback(() => {
    const node = toolbarRef.current
    if (!node) return

    const currentWidth = node.clientWidth
    if (currentWidth <= 0) return

    const measuredTypeWidth = typeButtonRef.current?.offsetWidth ?? 0
    const measuredFromWidth = fromButtonRef.current?.offsetWidth ?? 0
    const measuredInWidth = inButtonRef.current?.offsetWidth ?? 0

    if (measuredTypeWidth > 0) cachedWidthsRef.current.type = measuredTypeWidth
    if (measuredFromWidth > 0) cachedWidthsRef.current.from = measuredFromWidth
    if (measuredInWidth > 0) cachedWidthsRef.current.in = measuredInWidth

    const { type: typeWidth, from: fromWidth, in: inWidth } = cachedWidthsRef.current
    const filterWidth = filterButtonRef.current?.offsetWidth ?? 52
    const sortWidth = sortButtonRef.current?.offsetWidth ?? 100
    const availableWidth = Math.max(
      0,
      currentWidth - sortWidth - TOOLBAR_GAP_PX * 2,
    )

    const gapFor = (count: number) =>
      count > 1 ? (count - 1) * TOOLBAR_GAP_PX : 0

    if (typeWidth + fromWidth + inWidth + filterWidth + gapFor(4) <= availableWidth) {
      setHiddenLevel(0)
      return
    }
    if (typeWidth + inWidth + filterWidth + gapFor(3) <= availableWidth) {
      setHiddenLevel(1)
      return
    }
    if (typeWidth + filterWidth + gapFor(2) <= availableWidth) {
      setHiddenLevel(2)
      return
    }
    setHiddenLevel(3)
  }, [])

  useEffect(() => {
    const node = toolbarRef.current
    if (!node) return

    const resizeObserver = new ResizeObserver(() => {
      syncCollapsedControls()
    })

    resizeObserver.observe(node)
    syncCollapsedControls()
    return () => resizeObserver.disconnect()
  }, [syncCollapsedControls])

  useEffect(() => {
    syncCollapsedControls()
  }, [fromButtonLabel, selectedInLabel, activeFilterCount, sortBy, syncCollapsedControls])

  const toggleFromMember = (memberId: string) => {
    setPage(1)
    setFromUserIds(
      fromUserIds.includes(memberId)
        ? fromUserIds.filter((id) => id !== memberId)
        : [...fromUserIds, memberId],
    )
  }

  const toggleInChannel = (channelId: string) => {
    setPage(1)
    if (inChannelIds.includes(channelId)) {
      removeInChannelId(channelId)
      return
    }
    addInChannelId(channelId)
  }

  const toggleInConversation = (conversationId: string) => {
    setPage(1)
    if (inConversationIds.includes(conversationId)) {
      removeInConversationId(conversationId)
      return
    }
    addInConversationId(conversationId)
  }

  const handleApplyFilters = (values: FilterValues) => {
    setPage(1)
    setFromUserIds(values.userIds)
    setInChannelIds(values.channelIds)
    setInConversationIds(values.conversationIds)
  }

  const filteredFromMembers = members
    .filter((member) => {
      const search = fromSearch.trim().toLowerCase()
      if (!search) return true
      const display = displayMember(member)
      const haystack = `${display.displayName ?? display.name ?? member.name ?? ""
        } ${display.email ?? member.email ?? ""}`
        .trim()
        .toLowerCase()
      return haystack.includes(search)
    })
    .slice(0, 20)

  const suggestedFromMembers = filteredFromMembers.filter(
    (member) => !fromUserIds.includes(member.id),
  )
  const displayedSuggestedFromMembers = suggestedFromMembers.slice(0, 6)

  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )
  const conversationById = useMemo(
    () =>
      new Map(
        conversations.map((conversation) => [conversation.id, conversation]),
      ),
    [conversations],
  )
  const recentInItems = useMemo(() => {
    const items = recentsData?.items ?? []
    const search = inSearch.trim().toLowerCase()
    return items
      .map((item) => {
        if (item.kind === "channel") {
          return {
            kind: "channel" as const,
            channel: channelById.get(item.id) ?? null,
          }
        }

        return {
          kind: "conversation" as const,
          conversation: conversationById.get(item.id) ?? null,
        }
      })
      .filter((item) => {
        if (item.kind === "channel") {
          if (!item.channel) return false
          if (!search) return true
          return item.channel.name.toLowerCase().includes(search)
        }

        if (!item.conversation) return false
        if (!search) return true
        const summary = getConversationSummary(
          item.conversation,
          currentUser?.id,
          memberOverlayMap,
        )
        return summary.label.toLowerCase().includes(search)
      })
  }, [
    channelById,
    conversationById,
    currentUser?.id,
    inSearch,
    memberOverlayMap,
    recentsData?.items,
  ])

  const recentChannelIds = useMemo(
    () =>
      new Set(
        recentInItems.flatMap((item) =>
          item.kind === "channel" && item.channel ? [item.channel.id] : [],
        ),
      ),
    [recentInItems],
  )
  const recentConversationIds = useMemo(
    () =>
      new Set(
        recentInItems.flatMap((item) =>
          item.kind === "conversation" && item.conversation
            ? [item.conversation.id]
            : [],
        ),
      ),
    [recentInItems],
  )

  const filteredInChannels = useMemo(() => {
    const search = inSearch.trim().toLowerCase()
    return channels
      .filter((channel) => !inChannelIds.includes(channel.id))
      .filter((channel) => !recentChannelIds.has(channel.id))
      .filter((channel) =>
        search ? channel.name.toLowerCase().includes(search) : true,
      )
      .slice(0, 6)
  }, [channels, inChannelIds, inSearch, recentChannelIds])

  const filteredInConversations = useMemo(() => {
    const search = inSearch.trim().toLowerCase()
    return conversations
      .filter((conversation) => !inConversationIds.includes(conversation.id))
      .filter((conversation) => !recentConversationIds.has(conversation.id))
      .filter((conversation) => {
        if (!search) return true
        const summary = getConversationSummary(
          conversation,
          currentUser?.id,
          memberOverlayMap,
        )
        return summary.label.toLowerCase().includes(search)
      })
      .slice(0, 6)
  }, [
    conversations,
    currentUser?.id,
    inConversationIds,
    inSearch,
    memberOverlayMap,
    recentConversationIds,
  ])

  const renderInChannelRow = (channel: Channel) => {
    const checked = inChannelIds.includes(channel.id)
    return (
      <label
        key={channel.id}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
      >
        <input
          id={`in-channel-${channel.id}`}
          name={channel.id}
          type="checkbox"
          checked={checked}
          onChange={() => toggleInChannel(channel.id)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
        <div className="flex gap-1 shrink-0 items-center justify-center rounded-md ">
          {channel.isPrivate ? (
            <MdOutlineLock size={14} />
          ) : (
            <FiHash size={14} />
          )}
          <span className="min-w-0 flex-1 truncate">{channel.name}</span>
        </div>
      </label>
    )
  }

  const renderInConversationRow = (conversation: DirectMessageConversation) => {
    const checked = inConversationIds.includes(conversation.id)
    const otherMembers = conversation.members.filter(
      (member) => member.id !== currentUser?.id,
    )
    const avatars = otherMembers.slice(0, 2).map((member) => {
      const display = mergeUserForDisplay(member, memberOverlayMap[member.id])
      return {
        id: member.id,
        avatar: display.avatar || "",
        label:
          display.displayName ||
          display.name ||
          display.email ||
          member.id,
      }
    })
    const summary = getConversationSummary(
      conversation,
      currentUser?.id,
      memberOverlayMap,
    )

    return (
      <label
        key={conversation.id}
        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
      >
        <input
          id={`in-conversation-${conversation.id}`}
          name={conversation.id}
          type="checkbox"
          checked={checked}
          onChange={() => toggleInConversation(conversation.id)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
        <AvatarGroup className="shrink-0">
          {avatars.length > 1 ? (
            avatars.map((avatar) => (
              <Avatar key={avatar.id} className="size-6">
                <AvatarImage src={avatar.avatar} />
                <AvatarFallback className="text-[10px]">
                  {(avatar.label || "U").slice(0, 1).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            ))
          ) : (
            <Avatar className="size-6">
              <AvatarImage src={avatars[0]?.avatar || ""} />
              <AvatarFallback className="text-[10px]">
                {(avatars[0]?.label || "U").slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )}
        </AvatarGroup>
        <span className="min-w-0 flex-1 truncate">{summary.label}</span>
      </label>
    )
  }

  const initialFilters = useMemo<FilterValues>(
    () => ({
      userIds: fromUserIds,
      channelIds: inChannelIds,
      conversationIds: inConversationIds,
      dateRange: "all-time",
    }),
    [fromUserIds, inChannelIds, inConversationIds],
  )

  const totalResults = searchResults?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginationPages = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages],
  )

  const resultCountLabel = useMemo(() => {
    return `${totalResults} result${totalResults === 1 ? "" : "s"}`
  }, [totalResults])
  const visibility = useMemo(
    () => ({
      showFrom: hiddenLevel < 1,
      showIn: hiddenLevel < 2,
      showType: hiddenLevel < 3,
    }),
    [hiddenLevel],
  )

  const openSearchResult = async (item: WorkspaceMessageSearchItem) => {
    console.log("[message-search] open result", item)
    closeThread()

    if (item.message.channelId) {
      setView({ type: "channel", channelId: item.message.channelId })
    } else if (item.message.conversationId) {
      setView({ type: "dm", conversationId: item.message.conversationId })
    }

    if (item.message.parentId) {
      try {
        const parentMessage = await getMessageByIdApi(item.message.parentId)
        openThread(parentMessage, item.message.id)
        onSelectThreadResult?.(item.message.id)
        setFocusedMessageId(parentMessage.id)
        return
      } catch {
        onSelectMainResult?.(item.message.id)
        setFocusedMessageId(item.message.id)
        return
      }
    }

    onSelectMainResult?.(item.message.id)
    setFocusedMessageId(item.message.id)
  }

  const openSearchThread = (item: WorkspaceMessageSearchItem) => {
    console.log("[message-search] open thread", item)
    closeThread()

    if (item.message.channelId) {
      setView({ type: "channel", channelId: item.message.channelId })
    } else if (item.message.conversationId) {
      setView({ type: "dm", conversationId: item.message.conversationId })
    }

    openThread(item.message, null)
    onSelectThreadResult?.(item.message.id)
    setFocusedMessageId(item.message.id)
  }

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={toolbarRef} className="flex items-center justify-between gap-3">
          <div
            ref={leftControlsRef}
            className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden"
          >
            <div
              ref={typeButtonRef}
              data-collapse-key="type"
              className={cn("shrink-0", !visibility.showType && "hidden")}
            >
              {typeSelect}
            </div>
            <div
              ref={fromButtonRef}
              data-collapse-key="from"
              className={cn("shrink-0", !visibility.showFrom && "hidden")}
            >
              <Popover open={openFromSearch} onOpenChange={setOpenFromSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-md bg-transparent p-1",
                      selectedFromMembers.length > 0 &&
                      ACTIVE_ITEM_STYLE,
                    )}
                  >
                    <Typography variant="p" className="text-[13px]" text="From" />
                    {selectedFromMembers.length === 1 ? (
                      <span className="flex max-w-[260px] items-center gap-2 rounded-md text-sm font-medium ">
                        <Avatar className="size-5">
                          <AvatarImage src={fromButtonAvatarDisplay?.avatar || ""} />
                          <AvatarFallback className="text-[10px]">
                            {(
                              fromButtonAvatarDisplay?.displayName ||
                              fromButtonAvatarDisplay?.name ||
                              fromButtonAvatar?.email ||
                              "U"
                            )
                              .slice(0, 2)
                              .toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="max-w-[150px] truncate">
                          {fromButtonLabel}
                        </span>
                      </span>
                    ) : selectedFromMembers.length >= 2 ? (
                      <Typography
                        variant="p"
                        className="text-[13px]"
                        text={fromButtonLabel}
                      />
                    ) : null}
                    <ChevronDown
                      size={13}
                      className={cn(
                        "transition-transform duration-200",
                        openFromSearch ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-80 py-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <div className="px-2 pb-2">
                    <Input
                      value={fromSearch}
                      onChange={(event) => setFromSearch(event.target.value)}
                      placeholder="Search people..."
                      className="h-8 border-[#797c814d] text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {selectedFromMembers.length > 0 ? (
                      <div className="border-b border-[#797c814d] pb-2">
                        {selectedFromMembers.map((member) => {
                          const display = displayMember(member)
                          const label =
                            display.displayName ||
                            display.name ||
                            display.email ||
                            member.id

                          return (
                            <label
                              key={member.id}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
                            >
                              <input
                                id={`from-user-${member.id}`}
                                name={member.id}
                                type="checkbox"
                                checked
                                onChange={() => toggleFromMember(member.id)}
                                className="size-3 cursor-pointer accent-selection-hover"
                              />
                              <Avatar className="size-6">
                                <AvatarImage src={display.avatar || ""} />
                                <AvatarFallback className="text-[10px]">
                                  {(label || "U").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <span className="min-w-0 flex-1 truncate">
                                {label}
                              </span>
                            </label>
                          )
                        })}

                        <span
                          className="px-3 py-2 text-sm hover:underline cursor-pointer text-muted-foreground"
                          onClick={() => setFromUserIds([])}
                        >
                          Clear all
                        </span>
                      </div>
                    ) : null}

                    <div className="px-3 py-2 text-sm text-neutral-400">
                      Suggestions
                    </div>

                    {displayedSuggestedFromMembers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-neutral-400">
                        No people found
                      </div>
                    ) : (
                      displayedSuggestedFromMembers.map((member) => {
                        const display = displayMember(member)
                        const label =
                          display.displayName ||
                          display.name ||
                          display.email ||
                          member.id

                        return (
                          <label
                            key={member.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
                          >
                            <input
                              id={`from-user-${member.id}`}
                              name={member.id}
                              type="checkbox"
                              checked={false}
                              onChange={() => toggleFromMember(member.id)}
                              className="size-3 cursor-pointer accent-selection-hover"
                            />
                            <Avatar className="size-6">
                              <AvatarImage src={display.avatar || ""} />
                              <AvatarFallback className="text-[10px]">
                                {(label || "U").slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="min-w-0 flex-1 truncate">
                              {label}
                            </span>
                          </label>
                        )
                      })
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div
              ref={inButtonRef}
              data-collapse-key="in"
              className={cn("shrink-0", !visibility.showIn && "hidden")}
            >
              <Popover open={openInSearch} onOpenChange={setOpenInSearch}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-md bg-transparent p-1",
                      selectedInCount > 0 &&
                      ACTIVE_ITEM_STYLE,
                    )}
                  >
                    <Typography variant="p" className="text-[13px]" text="In" />
                    {selectedInCount === 1 ? (
                      <span className="flex max-w-[260px] items-center rounded-md text-sm font-medium text-white">
                        {selectedInChannel ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md text-neutral-300">
                            {selectedInChannel.isPrivate ? (
                              <MdOutlineLock size={14} />
                            ) : (
                              <FiHash size={14} />
                            )}
                          </span>
                        ) : selectedInConversation ? (
                          <AvatarGroup className="shrink-0">
                            {selectedInConversationSummary?.memberAvatars
                              ?.slice(0, 2)
                              .map((member) => (
                                <Avatar key={member.id} className="size-5">
                                  <AvatarImage src={member.avatar || ""} />
                                  <AvatarFallback className="text-[10px]">
                                    {(member.displayName || member.name || "U")
                                      .slice(0, 1)
                                      .toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                              ))}
                          </AvatarGroup>
                        ) : null}
                        <span className="max-w-[150px] truncate">
                          {selectedInLabel}
                        </span>
                      </span>
                    ) : selectedInCount >= 2 ? (
                      <Typography
                        variant="p"
                        className="text-[13px]"
                        text={selectedInLabel}
                      />
                    ) : null}
                    <ChevronDown
                      size={13}
                      className={cn(
                        "transition-transform duration-200",
                        openInSearch ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-80 py-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  <div className="px-2 pb-2">
                    <Input
                      value={inSearch}
                      onChange={(event) => setInSearch(event.target.value)}
                      placeholder="Search channels or DMs..."
                      className="h-8 border-[#797c814d] text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {recentInItems.length > 0 ? (
                      <div className="border-b border-[#797c814d] pb-2">
                        <div className="px-3 py-2 text-sm text-neutral-400">
                          Recent
                        </div>
                        {recentInItems.map((item) =>
                          item.kind === "channel" && item.channel
                            ? renderInChannelRow(item.channel)
                            : item.kind === "conversation" && item.conversation
                              ? renderInConversationRow(item.conversation)
                              : null,
                        )}
                      </div>
                    ) : null}

                    <div className={recentInItems.length > 0 ? "pt-1" : ""}>
                      <div className="px-3 py-2 text-sm text-neutral-400">
                        Suggestions
                      </div>
                      {filteredInChannels.length === 0 &&
                        filteredInConversations.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-neutral-400">
                          No results found
                        </div>
                      ) : (
                        <>
                          {filteredInChannels.map((channel) =>
                            renderInChannelRow(channel),
                          )}
                          {filteredInConversations.map((conversation) =>
                            renderInConversationRow(conversation),
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <div ref={filterButtonRef} data-collapse-key="filter" className="shrink-0">
              <Button
                variant="outline"
                className={cn(
                  "items-center justify-between rounded-md bg-transparent p-1",
                  activeFilterCount > 0 &&
                  ACTIVE_ITEM_STYLE,
                )}
                onClick={() => setMessageFilterDialogOpen(true)}
              >
                <LiaSlidersHSolid size={19} />
                {activeFilterCount > 0 ? (
                  <span className="text-xs font-bold">{activeFilterCount}</span>
                ) : null}
              </Button>
            </div>
          </div>

          <div ref={sortButtonRef} className="shrink-0">
            <Popover open={openSortSearch} onOpenChange={setOpenSortSearch}>
              <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-md bg-transparent p-1",
                      ACTIVE_ITEM_STYLE,
                    )}
                  >
                  <Typography
                    variant="p"
                    className="text-[13px]"
                    text={`Sort: ${SORT_SEARCH_OPTIONS.find((option) => option.id === sortBy)
                      ?.label || "Relevance"
                      }`}
                  />
                  <ChevronDown
                    size={13}
                    className={cn(
                      "transition-transform duration-200",
                      openSortSearch ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                withOverlay={true}
                side="bottom"
                align="start"
                sideOffset={8}
                className="py-2"
                onOpenAutoFocus={(event) => event.preventDefault()}
              >
                {SORT_SEARCH_OPTIONS.map((option) => (
                  <Button
                    variant="checkedMenu"
                    key={option.id}
                    onClick={() => {
                      setSortBy(option.id)
                      setPage(1)
                      setOpenSortSearch(false)
                    }}
                    className={cn(
                      sortBy === option.id && ACTIVE_ITEM_STYLE,
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                    {sortBy === option.id ? (
                      <FiCheck size={14} className="text-white" />
                    ) : null}
                  </Button>
                ))}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
            {isSearchLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <span>
                {isSearchFetching && !isSearchLoading
                  ? "Refreshing..."
                  : resultCountLabel}
              </span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 pb-6">
            {isSearchLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#35373B] p-4"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <Skeleton className="size-9 rounded-lg" />
                        <div className="min-w-0 flex-1 space-y-2">
                          <Skeleton className="h-4 w-2/3" />
                          <Skeleton className="h-3 w-1/3" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {isSearchError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {searchError instanceof Error
                  ? searchError.message
                  : "Search failed"}
              </div>
            ) : null}

            {!isSearchLoading &&
              !isSearchError &&
              (searchResults?.items.length ?? 0) === 0 ? (
              <div className="rounded-xl border border-[#35373B] p-6 text-sm text-neutral-400">
                No messages matched the current search.
              </div>
            ) : null}

            {!isSearchLoading && !isSearchError
              ? searchResults?.items.map((item) => (
                <MessageSearchResult
                  key={item.message.id}
                  item={item}
                  workspaceId={workspaceId}
                  currentUserId={currentUser?.id ?? ""}
                  query={query}
                  isActive={activeResultId === item.message.id}
                  onOpen={(nextItem) => void openSearchResult(nextItem)}
                  onOpenThread={(nextItem) => openSearchThread(nextItem)}
                />
              ))
              : null}

            {!isSearchLoading && !isSearchError && totalResults > 0 ? (
              <div className="mt-2 flex flex-col gap-3 rounded-[4px] px-1 py-2 md:flex-row md:items-center md:justify-between">
                <div className="text-[13px] text-neutral-400">
                  Page {currentPage} of {totalPages} · {PAGE_SIZE} per page
                </div>

                <Pagination className="mx-0 w-auto justify-end">
                  <PaginationContent className="flex-nowrap gap-1">
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          if (currentPage > 1) setPage(currentPage - 1)
                        }}
                        className={cn(
                          "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                          currentPage <= 1 && "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>

                    {paginationPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`} className="shrink-0">
                            <PaginationEllipsis />
                          </PaginationItem>
                        )
                      }

                      return (
                        <PaginationItem key={item} className="shrink-0">
                          <PaginationLink
                            href="#"
                            isActive={item === currentPage}
                            className={cn(
                              "h-8 min-w-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                              item === currentPage ? ACTIVE_ITEM_STYLE : "",
                            )}
                            onClick={(event) => {
                              event.preventDefault()
                              setPage(item)
                            }}
                          >
                            {item}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    })}

                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault()
                          if (currentPage < totalPages) setPage(currentPage + 1)
                        }}
                        className={cn(
                          "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                          currentPage >= totalPages && "pointer-events-none opacity-50",
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      <MessageSearchDialog
        open={messageFilterDialogOpen}
        onOpenChange={setMessageFilterDialogOpen}
        workspaceId={workspaceId}
        initialFilters={initialFilters}
        onApply={handleApplyFilters}
      />
    </>
  )
}
