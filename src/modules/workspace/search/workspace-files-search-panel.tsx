"use client"

import MessageSearchDialog, { type FilterValues } from "@/components/dialogs/message-search-dialog"
import FilePreview from "@/components/attachment-previews/file-preview"
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
import { useAppTranslation } from "@/hooks/use-translation"
import { useSearchAttachments, type SearchAttachmentsFilters } from "@/hooks/use-attachments"
import { useChannels } from "@/hooks/use-channel"
import { useConversations } from "@/hooks/use-conversations"
import { useWorkspace{t("recent")}s } from "@/hooks/use-workspace-recents"
import { fetchWorkspaceMembersApi } from "@/apis"
import { FILE_TYPES } from "@/lib/file-filter-options"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { useUserStore } from "@/stores/useUserStore"
import { useFileDetailStore } from "@/stores/useFileDetailStore"
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore"
import { mergeUserForDisplay } from "@/stores/useWorkspaceMemberStore"
import { cn } from "@/lib/utils"
import { getConversationSummary } from "@/modules/global-search/utils"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { FiCheck } from "react-icons/fi"
import { FiHash } from "react-icons/fi"
import { LiaSlidersHSolid } from "react-icons/lia"
import { IoFilter } from "react-icons/io5"
import { MdOutlineLock } from "react-icons/md"
import { ChevronDown } from "lucide-react"
import { useShallow } from "zustand/react/shallow"
import { useQuery } from "@tanstack/react-query"
import { WorkspaceMember } from "@/lib/types"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { Skeleton } from "@/components/ui/skeleton"

const SORT_OPTIONS_IDS = ["newest", "last_updated", "recent_viewed"] as const
type FileSort = (typeof SORT_OPTIONS_IDS)[number]

const DATE_OPTION_VALUES = ["all-time", "today", "yesterday", "last-7-days", "last-30-days", "last-90-days", "last-180-days", "last-365-days"] as const
type DateOptionValue = (typeof DATE_OPTION_VALUES)[number]

const GLOBAL_TO_FILE: Record<string, string> = {
  documents: "document",
  spreadsheets: "spreadsheet",
  presentations: "presentation",
  pdfs: "pdf",
  audio: "audio",
  images: "image",
  videos: "video",
  snippets: "code",
}

const FILE_TO_GLOBAL: Record<string, string> = {
  document: "documents",
  spreadsheet: "spreadsheets",
  presentation: "presentations",
  pdf: "pdfs",
  audio: "audio",
  image: "images",
  video: "videos",
  code: "snippets",
}

const ALL_FILE_TYPE_IDS = FILE_TYPES.map((type) => type.id)

type PaginationValue = number | "..."
const PAGE_SIZE = 20
const TOOLBAR_GAP_PX = 8
const DEFAULT_COLLAPSE_WIDTHS = {
  type: 140,
  from: 104,
  in: 72,
  typeFilter: 92,
  date: 78,
  filter: 52,
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

export function WorkspaceFilesSearchPanel({
  workspaceId,
  typeSelect,
}: {
  workspaceId: string
  typeSelect?: React.ReactNode
}) {
  const t = useAppTranslation("search")

  const currentUser = useUserStore((state) => state.user)
  const query = useGlobalSearchStore((state) => state.query)
  const fromUserIds = useGlobalSearchStore((state) => state.fromUserIds)
  const withUserIds = useGlobalSearchStore((state) => state.withUserIds)
  const inChannelIds = useGlobalSearchStore((state) => state.inChannelIds)
  const inConversationIds = useGlobalSearchStore((state) => state.inConversationIds)
  const typeFilterTypes = useGlobalSearchStore((state) => state.typeFilterTypes)
  const afterDate = useGlobalSearchStore((state) => state.afterDate)
  const beforeDate = useGlobalSearchStore((state) => state.beforeDate)
  const setFromUserIds = useGlobalSearchStore((state) => state.setFromUserIds)
  const setInChannelIds = useGlobalSearchStore((state) => state.setInChannelIds)
  const setInConversationIds = useGlobalSearchStore((state) => state.setInConversationIds)
  const removeInConversationId = useGlobalSearchStore((state) => state.removeInConversationId)
  const addInConversationId = useGlobalSearchStore((state) => state.addInConversationId)
  const removeInChannelId = useGlobalSearchStore((state) => state.removeInChannelId)
  const addInChannelId = useGlobalSearchStore((state) => state.addInChannelId)
  const openFileDetail = useFileDetailStore((state) => state.open)

  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  })
  const { data: channels = [] } = useChannels(workspaceId)
  const { data: conversations = [] } = useConversations(workspaceId)
  const { data: recentsData } = useWorkspace{t("recent")}s(workspaceId)
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )

  const [openSortSearch, setOpenSortSearch] = useState(false)
  const [openTypeFilters, setOpenTypeFilters] = useState(false)
  const [openDateFilters, setOpenDateFilters] = useState(false)
  const [openFromSearch, setOpenFromSearch] = useState(false)
  const [openInSearch, setOpenInSearch] = useState(false)
  const [fromSearch, setFromSearch] = useState("")
  const [inSearch, setInSearch] = useState("")
  const [sortBy, setSortBy] = useState<FileSort>("newest")
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const typeButtonRef = useRef<HTMLDivElement>(null)
  const fromButtonRef = useRef<HTMLDivElement>(null)
  const inButtonRef = useRef<HTMLDivElement>(null)
  const typeFilterButtonRef = useRef<HTMLDivElement>(null)
  const dateFilterButtonRef = useRef<HTMLDivElement>(null)
  const filterButtonRef = useRef<HTMLDivElement>(null)
  const sortButtonRef = useRef<HTMLDivElement>(null)
  const cachedWidthsRef = useRef({ ...DEFAULT_COLLAPSE_WIDTHS })
  const [hiddenLevel, setHiddenLevel] = useState(0)

  const filters = useMemo<SearchAttachmentsFilters>(() => {
    const categories = typeFilterTypes.length > 0
      ? typeFilterTypes
        .map((type) => GLOBAL_TO_FILE[type] ?? type)
        .join(",")
      : undefined

    return {
      workspaceId,
      sort: sortBy === "newest" ? "newest" : sortBy,
      userIds: fromUserIds.length > 0 ? fromUserIds.join(",") : undefined,
      channelIds: inChannelIds.length > 0 ? inChannelIds.join(",") : undefined,
      conversationIds: inConversationIds.length > 0 ? inConversationIds.join(",") : undefined,
      dateFrom: afterDate ?? undefined,
      dateTo: beforeDate ?? undefined,
      categories,
      name: query.trim() || undefined,
      limit: 500,
    }
  }, [
    afterDate,
    beforeDate,
    fromUserIds,
    inChannelIds,
    inConversationIds,
    query,
    sortBy,
    typeFilterTypes,
    workspaceId,
  ])

  const { data: files = [], isLoading, isError } = useSearchAttachments(filters)
  const totalResults = files.length
  const totalPages = Math.max(1, Math.ceil(totalResults / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginationPages = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages],
  )
  const pagedFiles = useMemo(
    () => files.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [currentPage, files],
  )

  const displayMember = (member: { id: string; email?: string | null; name?: string | null; displayName?: string | null; avatar?: string | null }) =>
    mergeUserForDisplay(member as never, memberOverlayMap[member.id])
  const selectedFromMembers = useMemo(
    () =>
      fromUserIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter((member): member is WorkspaceMember => Boolean(member)),
    [fromUserIds, members],
  )
  const fromButtonLabel = (() => {
    if (selectedFromMembers.length === 0) return t("filters.from")
    if (selectedFromMembers.length >= 2) return t("filters.teammates", { count: selectedFromMembers.length })
    const first = selectedFromMembers[0]
    const display = displayMember(first)
    return display.displayName || display.name || display.email || first.id
  })()
  const fromButtonAvatar = selectedFromMembers[0]
  const fromButtonAvatarDisplay = fromButtonAvatar ? displayMember(fromButtonAvatar) : null
  const filteredFromMembers = members
    .filter((member) => {
      const search = fromSearch.trim().toLowerCase()
      if (!search) return true
      const display = displayMember(member)
      const haystack = `${display.displayName ?? display.name ?? member.name ?? ""} ${display.email ?? member.email ?? ""}`
        .trim()
        .toLowerCase()
      return haystack.includes(search)
    })
    .slice(0, 20)
  const suggestedFromMembers = filteredFromMembers.filter(
    (member) => !fromUserIds.includes(member.id),
  )
  const displayedSuggestedFromMembers = suggestedFromMembers.slice(0, 6)

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
  const selectedInCount = selectedInChannels.length + selectedInConversations.length
  const selectedInLabel = (() => {
    if (selectedInCount === 0) return t("filters.in")
    if (selectedInCount >= 2) return t("filters.places", { count: selectedInCount })
    const channel = selectedInChannels[0]
    if (channel) return channel.name
    const conversation = selectedInConversations[0]
    if (!conversation) return t("filters.in")
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
    const measuredTypeFilterWidth = typeFilterButtonRef.current?.offsetWidth ?? 0
    const measuredDateWidth = dateFilterButtonRef.current?.offsetWidth ?? 0
    const measuredFilterWidth = filterButtonRef.current?.offsetWidth ?? 0

    if (measuredTypeWidth > 0) cachedWidthsRef.current.type = measuredTypeWidth
    if (measuredFromWidth > 0) cachedWidthsRef.current.from = measuredFromWidth
    if (measuredInWidth > 0) cachedWidthsRef.current.in = measuredInWidth
    if (measuredTypeFilterWidth > 0) cachedWidthsRef.current.typeFilter = measuredTypeFilterWidth
    if (measuredDateWidth > 0) cachedWidthsRef.current.date = measuredDateWidth
    if (measuredFilterWidth > 0) cachedWidthsRef.current.filter = measuredFilterWidth

    const {
      type: typeWidth,
      from: fromWidth,
      in: inWidth,
      typeFilter: typeFilterWidth,
      date: dateWidth,
      filter: filterWidth,
    } = cachedWidthsRef.current
    const sortWidth = sortButtonRef.current?.offsetWidth ?? 100
    const availableWidth = Math.max(0, currentWidth - sortWidth - TOOLBAR_GAP_PX * 2)

    const gapFor = (count: number) => (count > 1 ? (count - 1) * TOOLBAR_GAP_PX : 0)

    const levelWidth = [
      typeWidth + fromWidth + inWidth + typeFilterWidth + dateWidth + filterWidth + gapFor(6),
      typeWidth + inWidth + typeFilterWidth + dateWidth + filterWidth + gapFor(5),
      typeWidth + typeFilterWidth + dateWidth + filterWidth + gapFor(4),
      typeWidth + dateWidth + filterWidth + gapFor(3),
      typeWidth + filterWidth + gapFor(2),
      typeWidth + gapFor(1),
      0,
    ]

    if (levelWidth[0] <= availableWidth) {
      setHiddenLevel(0)
      return
    }
    if (levelWidth[1] <= availableWidth) {
      setHiddenLevel(1)
      return
    }
    if (levelWidth[2] <= availableWidth) {
      setHiddenLevel(2)
      return
    }
    if (levelWidth[3] <= availableWidth) {
      setHiddenLevel(3)
      return
    }
    if (levelWidth[4] <= availableWidth) {
      setHiddenLevel(4)
      return
    }
    if (levelWidth[5] <= availableWidth) {
      setHiddenLevel(5)
      return
    }
    setHiddenLevel(6)
  }, [])

  useEffect(() => {
    const node = toolbarRef.current
    if (!node) return

    const resizeObserver = new ResizeObserver(() => {
      syncCollapsedControls()
    })

    resizeObserver.observe(node)
    const rafId = window.requestAnimationFrame(syncCollapsedControls)
    return () => {
      window.cancelAnimationFrame(rafId)
      resizeObserver.disconnect()
    }
  }, [syncCollapsedControls])

  const channelById = useMemo(
    () => new Map(channels.map((channel) => [channel.id, channel])),
    [channels],
  )
  const conversationById = useMemo(
    () => new Map(conversations.map((conversation) => [conversation.id, conversation])),
    [conversations],
  )
  const recentInItems = useMemo(() => {
    const items = recentsData?.items ?? []
    const search = inSearch.trim().toLowerCase()
    return items
      .map((item) => {
        if (item.kind === "channel") {
          return { kind: "channel" as const, channel: channelById.get(item.id) ?? null }
        }
        return { kind: "conversation" as const, conversation: conversationById.get(item.id) ?? null }
      })
      .filter((item) => {
        if (item.kind === "channel") {
          if (!item.channel) return false
          if (!search) return true
          return item.channel.name.toLowerCase().includes(search)
        }
        if (!item.conversation) return false
        if (!search) return true
        const summary = getConversationSummary(item.conversation, currentUser?.id, memberOverlayMap)
        return summary.label.toLowerCase().includes(search)
      })
  }, [channelById, conversationById, currentUser?.id, inSearch, memberOverlayMap, recentsData?.items])
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
          item.kind === "conversation" && item.conversation ? [item.conversation.id] : [],
        ),
      ),
    [recentInItems],
  )
  const filteredInChannels = useMemo(() => {
    const search = inSearch.trim().toLowerCase()
    return channels
      .filter((channel) => !inChannelIds.includes(channel.id))
      .filter((channel) => !recentChannelIds.has(channel.id))
      .filter((channel) => (search ? channel.name.toLowerCase().includes(search) : true))
      .slice(0, 6)
  }, [channels, inChannelIds, inSearch, recentChannelIds])
  const filteredInConversations = useMemo(() => {
    const search = inSearch.trim().toLowerCase()
    return conversations
      .filter((conversation) => !inConversationIds.includes(conversation.id))
      .filter((conversation) => !recentConversationIds.has(conversation.id))
      .filter((conversation) => {
        if (!search) return true
        const summary = getConversationSummary(conversation, currentUser?.id, memberOverlayMap)
        return summary.label.toLowerCase().includes(search)
      })
      .slice(0, 6)
  }, [conversations, currentUser?.id, inConversationIds, inSearch, memberOverlayMap, recentConversationIds])

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

  const renderInChannelRow = (channel: { id: string; isPrivate: boolean; name: string }) => {
    const checked = inChannelIds.includes(channel.id)
    return (
      <label
        key={channel.id}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
      >
        <input
          id={`in-channel-${channel.id}`}
          name={channel.id}
          type="checkbox"
          checked={checked}
          onChange={() => toggleInChannel(channel.id)}
          className="size-3 cursor-pointer accent-selection-hover"
        />
        <span className="flex size-6 shrink-0 items-center justify-center rounded-md text-neutral-400">
          {channel.isPrivate ? <MdOutlineLock size={14} /> : <FiHash size={14} />}
        </span>
        <span className="min-w-0 flex-1 truncate">{channel.name}</span>
      </label>
    )
  }
  const renderInConversationRow = (conversation: (typeof conversations)[number]) => {
    const checked = inConversationIds.includes(conversation.id)
    const otherMembers = conversation.members.filter((member) => member.id !== currentUser?.id)
    const avatars = otherMembers.slice(0, 2).map((member) => {
      const display = mergeUserForDisplay(member, memberOverlayMap[member.id])
      return {
        id: member.id,
        avatar: display.avatar || "",
        label: display.displayName || display.name || display.email || member.id,
      }
    })
    const summary = getConversationSummary(conversation, currentUser?.id, memberOverlayMap)
    return (
      <label
        key={conversation.id}
        className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
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

  const selectedTypes = useMemo(
    () =>
      typeFilterTypes.length === 0
        ? ALL_FILE_TYPE_IDS
        : typeFilterTypes
          .map((type) => GLOBAL_TO_FILE[type] ?? type)
          .filter((id) => ALL_FILE_TYPE_IDS.includes(id)),
    [typeFilterTypes],
  )
  const isAllTypesSelected = selectedTypes.length === FILE_TYPES.length
  const typeLabel = isAllTypesSelected ? t("allTypes") : t("types", { count: selectedTypes.length })
  const dateLabel = (() => {
    if (!afterDate && !beforeDate) return t("dateOptions.anyTime")
    const matched = DATE_OPTION_VALUES.find((value) => {
      const range = getDateRangeForValue(value)
      return range.afterDate === afterDate && range.beforeDate === beforeDate
    })
    return matched ? t(`dateOptions.${getDateOptionKey(matched)}` as never) : t("dateSet")
  })()

  const activeFilterCount =
    fromUserIds.length +
    withUserIds.length +
    inChannelIds.length +
    inConversationIds.length +
    typeFilterTypes.length +
    (afterDate || beforeDate ? 1 : 0)

  const initialFilters: FilterValues = {
    userIds: fromUserIds,
    channelIds: inChannelIds,
    conversationIds: inConversationIds,
    dateRange: "all-time",
  }

  const applySelectedTypes = (nextTypes: string[]) => {
    if (nextTypes.length === 0 || nextTypes.length === FILE_TYPES.length) {
      useGlobalSearchStore.getState().setTypeFilterTypes([])
      return
    }
    useGlobalSearchStore
      .getState()
      .setTypeFilterTypes(
        nextTypes
          .map((id) => FILE_TO_GLOBAL[id])
          .filter(Boolean) as Array<
            "documents" | "spreadsheets" | "presentations" | "pdfs" | "audio" | "images" | "videos" | "snippets"
          >,
      )
  }

  const toggleType = (id: string) => {
    setPage(1)
    const next = selectedTypes.includes(id)
      ? selectedTypes.filter((typeId) => typeId !== id)
      : [...selectedTypes, id]
    applySelectedTypes(next)
  }

  const clearAllTypes = () => {
    setPage(1)
    applySelectedTypes([])
  }

  function getDateRangeForValue(value: string) {
    if (value === "all-time") {
      return { afterDate: null, beforeDate: null }
    }

    const today = new Date()
    const end = new Date(today)
    end.setDate(today.getDate() + 1)

    const daysBackMap: Record<string, number> = {
      today: 1,
      yesterday: 2,
      "last-7-days": 7,
      "last-30-days": 30,
      "last-90-days": 90,
      "last-180-days": 180,
      "last-365-days": 365,
    }

    const daysBack = daysBackMap[value]
    if (!daysBack) {
      return { afterDate: null, beforeDate: null }
    }

    const after = new Date(today)
    after.setDate(today.getDate() - daysBack)
    const toLocalDate = (date: Date) => {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      const day = String(date.getDate()).padStart(2, "0")
      return `${year}-${month}-${day}`
    }
    return {
      afterDate: toLocalDate(after),
      beforeDate: toLocalDate(end),
    }
  }

  const applyDateOption = (value: string) => {
    setPage(1)
    if (value === "all-time") {
      useGlobalSearchStore.getState().clearDateRange()
      return
    }
    const range = getDateRangeForValue(value)
    useGlobalSearchStore.getState().setAfterDate(range.afterDate)
    useGlobalSearchStore.getState().setBeforeDate(range.beforeDate)
  }
  const resultCountLabel = useMemo(
    () => t("results", { count: totalResults }),
    [totalResults, t],
  )
  const visibility = useMemo(
    () => ({
      showFrom: hiddenLevel < 1,
      showIn: hiddenLevel < 2,
      showTypeFilter: hiddenLevel < 3,
      showDate: hiddenLevel < 4,
      showFilter: hiddenLevel < 5,
      showTypeSearch: hiddenLevel < 6,
    }),
    [hiddenLevel],
  )

  useEffect(() => {
    const rafId = window.requestAnimationFrame(syncCollapsedControls)
    return () => window.cancelAnimationFrame(rafId)
  }, [activeFilterCount, fromButtonLabel, selectedInLabel, typeLabel, dateLabel, sortBy, syncCollapsedControls])

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={toolbarRef} className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-nowrap items-center gap-2 overflow-hidden">
            <div
              ref={typeButtonRef}
              data-collapse-key="type"
              className={cn("shrink-0", !visibility.showTypeSearch && "hidden")}
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
                      <span className="flex max-w-[260px] items-center gap-2 rounded-md text-sm font-medium">
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
                        <span className="max-w-[150px] truncate">{fromButtonLabel}</span>
                      </span>
                    ) : selectedFromMembers.length >= 2 ? (
                      <Typography variant="p" className="text-[13px]" text={fromButtonLabel} />
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
                      placeholder={t("searchPeople")}
                      className="h-8 border-[#797c814d] text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {selectedFromMembers.length > 0 ? (
                      <div className="border-b border-[#797c814d] pb-2">
                        {selectedFromMembers.map((member) => {
                          const display = displayMember(member)
                          const label = display.displayName || display.name || display.email || member.id
                          return (
                            <label
                              key={member.id}
                              className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
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
                              <span className="min-w-0 flex-1 truncate">{label}</span>
                            </label>
                          )
                        })}
                        <span
                          className="px-3 py-2 text-sm hover:underline cursor-pointer text-muted-foreground"
                          onClick={() => setFromUserIds([])}
                        >
                          {t("clearAll")}
                        </span>
                      </div>
                    ) : null}
                    <div className="px-3 py-2 text-sm text-neutral-400">{t("suggestions")}</div>
                    {displayedSuggestedFromMembers.length === 0 ? (
                      <div className="px-4 py-3 text-sm text-neutral-400">{t("noPeopleFound")}</div>
                    ) : (
                      displayedSuggestedFromMembers.map((member) => {
                        const display = displayMember(member)
                        const label = display.displayName || display.name || display.email || member.id
                        return (
                          <label
                            key={member.id}
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left text-sm hover:bg-selection-hover hover:text-white"
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
                            <span className="min-w-0 flex-1 truncate">{label}</span>
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
                      selectedInCount > 0 && ACTIVE_ITEM_STYLE,
                    )}
                  >
                    <Typography variant="p" className="text-[13px]" text="In" />
                    {selectedInCount === 1 ? (
                      <span className="flex max-w-[260px] items-center gap-2 rounded-md text-sm font-medium">
                        {selectedInChannel ? (
                          <span className="flex size-5 shrink-0 items-center justify-center rounded-md text-neutral-300">
                            {selectedInChannel.isPrivate ? <MdOutlineLock size={14} /> : <FiHash size={14} />}
                          </span>
                        ) : selectedInConversation ? (
                          <AvatarGroup className="shrink-0">
                            {selectedInConversationSummary?.memberAvatars?.slice(0, 2).map((member) => (
                              <Avatar key={member.id} className="size-5">
                                <AvatarImage src={member.avatar || ""} />
                                <AvatarFallback className="text-[10px]">
                                  {(member.displayName || member.name || "U").slice(0, 1).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ))}
                          </AvatarGroup>
                        ) : null}
                        <span className="max-w-[150px] truncate">{selectedInLabel}</span>
                      </span>
                    ) : selectedInCount >= 2 ? (
                      <Typography variant="p" className="text-[13px]" text={selectedInLabel} />
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
                      placeholder={t("searchChannelsOrDMs")}
                      className="h-8 border-[#797c814d] text-sm"
                    />
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {recentInItems.length > 0 ? (
                      <div className="border-b border-[#797c814d] pb-2">
                        <div className="px-3 py-2 text-sm text-neutral-400">{t("recent")}</div>
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
                      <div className="px-3 py-2 text-sm text-neutral-400">{t("suggestions")}</div>
                      {filteredInChannels.length === 0 && filteredInConversations.length === 0 ? (
                        <div className="px-4 py-3 text-sm text-neutral-400">{t("noResultsFound")}</div>
                      ) : (
                        <>
                          {filteredInChannels.map((channel) => renderInChannelRow(channel))}
                          {filteredInConversations.map((conversation) => renderInConversationRow(conversation))}
                        </>
                      )}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div
              ref={typeFilterButtonRef}
              data-collapse-key="all-types"
              className={cn("shrink-0", !visibility.showTypeFilter && "hidden")}
            >
              <Popover open={openTypeFilters} onOpenChange={setOpenTypeFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-md bg-transparent p-1",
                      selectedTypes.length > 0 ? ACTIVE_ITEM_STYLE : "",
                    )}
                  >
                    <IoFilter size={14} />
                    <Typography variant="p" className="text-[13px]" text={typeLabel} />
                    <ChevronDown
                      size={13}
                      className={cn(
                        "transition-transform duration-200",
                        openTypeFilters ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-56 py-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  {FILE_TYPES.map((type) => (
                    <div
                      className={cn(
                        "flex cursor-pointer items-center gap-2 px-2 py-1 hover:bg-selection-hover hover:text-white",
                        selectedTypes.includes(type.id) && ACTIVE_ITEM_STYLE,
                      )}
                      key={type.id}
                      onClick={() => toggleType(type.id)}
                    >
                      <input
                        id={`file-type-${type.id}`}
                        name={type.id}
                        type="checkbox"
                        checked={selectedTypes.includes(type.id)}
                        onChange={() => toggleType(type.id)}
                        className="size-3 cursor-pointer accent-selection-hover"
                      />
                      <Typography variant="p" text={type.label} />
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between gap-2 px-2">
                    {/* <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-red-500 hover:text-red-500"
                    onClick={clearAllTypes}
                  >
                    {t("clearAll")}
                  </Button> */}
                    <span
                      className="px-3 py-2 text-sm hover:underline cursor-pointer text-muted-foreground"
                      onClick={clearAllTypes}
                    >
                      {t("clearAll")}
                    </span>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            <div
              ref={dateFilterButtonRef}
              data-collapse-key="date"
              className={cn("shrink-0", !visibility.showDate && "hidden")}
            >
              <Popover open={openDateFilters} onOpenChange={setOpenDateFilters}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "rounded-md bg-transparent p-1",
                      (afterDate || beforeDate) && ACTIVE_ITEM_STYLE,
                    )}
                  >
                    <Typography variant="p" className="text-[13px]" text={dateLabel} />
                    <ChevronDown
                      size={13}
                      className={cn(
                        "transition-transform duration-200",
                        openDateFilters ? "rotate-180" : "rotate-0",
                      )}
                    />
                  </Button>
                </PopoverTrigger>
                <PopoverContent
                  withOverlay={true}
                  side="bottom"
                  align="start"
                  sideOffset={8}
                  className="w-56 py-2"
                  onOpenAutoFocus={(event) => event.preventDefault()}
                >
                  {DATE_OPTION_VALUES.map((value) => {
                    const range = getDateRangeForValue(value)
                    const isSelected =
                      (value === "all-time" && !afterDate && !beforeDate) ||
                      (range.afterDate === afterDate && range.beforeDate === beforeDate)
                    return (
                      // <div
                      //   key={option.value}
                      //   onClick={() => {
                      //     applyDateOption(option.value)
                      //     setOpenDateFilters(false)
                      //   }}
                      //   className={cn(
                      //     "flex cursor-pointer items-center justify-between px-2 py-1 hover:bg-selection-hover hover:text-white",
                      //     isSelected && ACTIVE_ITEM_STYLE,
                      //   )}
                      // >
                      //   <span className="text-sm font-medium">{option.label}</span>
                      //   {isSelected ? <FiCheck size={14} className="text-white" /> : null}
                      // </div>
                      <Button
                        variant="checkedMenu"
                        key={value}
                        onClick={() => {
                          applyDateOption(value)
                          setOpenDateFilters(false)
                        }}
                        className={cn(
                          isSelected && ACTIVE_ITEM_STYLE,
                        )}
                      >
                        <span className="text-sm font-medium">{t(`dateOptions.${getDateOptionKey(value)}` as never)}</span>
                        {isSelected ? <FiCheck size={14} className="text-white" /> : null}
                      </Button>
                    )
                  })}
                </PopoverContent>
              </Popover>
            </div>
            <div
              ref={filterButtonRef}
              data-collapse-key="filter"
              className={cn("shrink-0", !visibility.showFilter && "hidden")}
            >
              <Button
                variant="outline"
                className={cn(
                  "items-center justify-between rounded-md bg-transparent p-1",
                  activeFilterCount > 0 &&
                  ACTIVE_ITEM_STYLE,
                )}
                onClick={() => setDialogOpen(true)}
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
                    text={t("sortBy", { label: t(`sortOptions.${sortBy === "newest" ? "newest" : sortBy === "last_updated" ? "lastUpdated" : "recentlyViewed"}` as never) })}
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
                {SORT_OPTIONS_IDS.map((id) => {
                  const labelKey = id === "newest" ? "newest" : id === "last_updated" ? "lastUpdated" : "recentlyViewed"
                  return (
                    <Button
                      variant="checkedMenu"
                      key={id}
                      onClick={() => {
                        setSortBy(id)
                        setPage(1)
                        setOpenSortSearch(false)
                      }}
                      className={cn(
                        sortBy === id && ACTIVE_ITEM_STYLE,
                      )}
                    >
                      <span className="text-sm font-medium">{t(`sortOptions.${labelKey}` as never)}</span>
                      {sortBy === id ? (
                        <FiCheck size={14} className="text-white" />
                      ) : null}
                    </Button>
                  )
                })}
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
            {isLoading ? (
              <Skeleton className="h-4 w-28" />
            ) : (
              <span>{resultCountLabel}</span>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-3 pb-6">
            {isLoading ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-20" />
                </div>
                {[1, 2, 3, 4, 5].map((i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-[#dddddd] bg-white p-4 dark:border-[#35373B] dark:bg-[#1A1D21]"
                  >
                    <div className="flex items-start gap-3">
                      <Skeleton className="size-10 shrink-0 rounded-lg" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <Skeleton className="h-4 w-2/3" />
                        <Skeleton className="h-3 w-1/2" />
                        <Skeleton className="h-3 w-5/6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}

            {isError ? (
              <div className="rounded-xl border border-red-500/40 bg-red-500/10 p-4 text-sm text-red-200">
                {t("failedToLoadFiles")}
              </div>
            ) : null}
            {!isLoading && !isError && files.length === 0 ? (
              <div className="rounded-xl border border-[#35373B] p-6 text-sm text-neutral-400">
                {t("noFilesFound")}
              </div>
            ) : null}
            {!isLoading && !isError
              ? pagedFiles.map((hit) => (
                <div
                  key={hit.attachment.id}
                  className="cursor-pointer"
                  onClick={() => openFileDetail({ attachment: hit.attachment, message: hit.message })}
                >
                  <FilePreview attachment={hit.attachment} message={hit.message} fromFilesTab={true} />
                </div>
              ))
              : null}

            {!isLoading && !isError && totalResults > 0 ? (
              <div className="mt-2 flex flex-col gap-3 rounded-[4px] px-1 py-2 md:flex-row md:items-center md:justify-between">
                <div className="text-[13px] text-neutral-400">
                  {t("pagination.pageOf", { current: currentPage, total: totalPages, pageSize: PAGE_SIZE })}
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
        mode="files"
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        initialFilters={initialFilters}
        onApply={(values) => {
          setPage(1)
          setFromUserIds(values.userIds)
          setInChannelIds(values.channelIds)
          setInConversationIds(values.conversationIds)
        }}
      />
    </>
  )
}
