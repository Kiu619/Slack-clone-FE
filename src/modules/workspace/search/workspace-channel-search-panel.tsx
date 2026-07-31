"use client"

import { fetchWorkspaceChannelsApi, fetchWorkspaceMembersApi } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { useChannels } from "@/hooks/use-channel"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { useMainPanelStore } from "@/stores/useMainPanelStore"
import { useThreadPanelStore } from "@/stores/useThreadPanelStore"
import { useUserStore } from "@/stores/useUserStore"
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore"
import { cn } from "@/lib/utils"
import { channelKeys } from "@/lib/query-keys"
import type { User, WorkspaceMember } from "@/lib/types"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"
import { FiHash } from "react-icons/fi"
import { MdOutlineLock } from "react-icons/md"
import { useShallow } from "zustand/react/shallow"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { Skeleton } from "@/components/ui/skeleton"

export function WorkspaceChannelSearchPanel({
  workspaceId,
  typeSelect,
  activeResultId,
  onSelectResult,
}: {
  workspaceId: string
  typeSelect?: React.ReactNode
  activeResultId?: string | null
  onSelectResult?: (id: string) => void
}) {
  const currentUser = useUserStore((state) => state.user)
  const query = useGlobalSearchStore((state) => state.query)
  const withUserIds = useGlobalSearchStore((state) => state.withUserIds)
  const setWithUserIds = useGlobalSearchStore((state) => state.setWithUserIds)
  const { setView } = useMainPanelStore()
  const { close: closeThread } = useThreadPanelStore()

  const { data: channels = [], isLoading } = useChannels(workspaceId)
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  })

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )
  const displayMember = (member: WorkspaceMember) =>
    mergeUserForDisplay(member as User, memberOverlayMap[member.id])

  const [openWithSearch, setOpenWithSearch] = useState(false)
  const [withSearch, setWithSearch] = useState("")

  const selectedWithMembers = useMemo(
    () =>
      withUserIds
        .map((memberId) => members.find((member) => member.id === memberId))
        .filter(Boolean) as WorkspaceMember[],
    [members, withUserIds],
  )

  const withButtonLabel = (() => {
    if (selectedWithMembers.length === 0) return "With"
    if (selectedWithMembers.length >= 2) return `${selectedWithMembers.length} teammates`
    const display = displayMember(selectedWithMembers[0])
    return display.displayName || display.name || display.email || selectedWithMembers[0].id
  })()
  const withButtonAvatar = selectedWithMembers[0]
  const withButtonAvatarDisplay = withButtonAvatar ? displayMember(withButtonAvatar) : null

  const filteredWithMembers = members
    .filter((member) => member.id !== currentUser?.id)
    .filter((member) => {
      const search = withSearch.trim().toLowerCase()
      if (!search) return true
      const display = displayMember(member)
      const haystack = `${display.displayName ?? display.name ?? member.name ?? ""} ${display.email ?? member.email ?? ""}`
        .trim()
        .toLowerCase()
      return haystack.includes(search)
    })
    .slice(0, 20)
  const suggestedWithMembers = filteredWithMembers.filter(
    (member) => !withUserIds.includes(member.id),
  )

  const normalizedWithUserIds = useMemo(
    () => Array.from(new Set(withUserIds.map((id) => id.trim()).filter(Boolean))).sort(),
    [withUserIds],
  )
  const { data: channelsByWith = [], isFetching: isFilteringByWith } = useQuery({
    queryKey: channelKeys.withMembers(workspaceId, normalizedWithUserIds),
    queryFn: () =>
      fetchWorkspaceChannelsApi(workspaceId, { withUserIds: normalizedWithUserIds }),
    enabled: !!workspaceId && normalizedWithUserIds.length > 0,
    staleTime: 60 * 1000,
  })
  const sourceChannels =
    normalizedWithUserIds.length > 0 ? channelsByWith : channels

  const filteredChannels = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return sourceChannels
    return sourceChannels.filter((channel) => channel.name.toLowerCase().includes(q))
  }, [query, sourceChannels])

  const resultCountLabel = `${filteredChannels.length} result${filteredChannels.length === 1 ? "" : "s"}`

  const openChannel = (channelId: string) => {
    closeThread()
    setView({ type: "channel", channelId })
    onSelectResult?.(channelId)
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {typeSelect}
          <Popover open={openWithSearch} onOpenChange={setOpenWithSearch}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "rounded-md bg-transparent p-1",
                  selectedWithMembers.length > 0 &&
                  ACTIVE_ITEM_STYLE,
                )}>
                <Typography variant="p" className="text-[13px]" text="With" />
                {selectedWithMembers.length === 1 ? (
                  <span className="flex max-w-[260px] items-center gap-2 rounded-md text-sm font-medium text-white">
                    <Avatar className="size-5">
                      <AvatarImage src={withButtonAvatarDisplay?.avatar || ""} />
                      <AvatarFallback className="text-[10px]">
                        {(
                          withButtonAvatarDisplay?.displayName ||
                          withButtonAvatarDisplay?.name ||
                          withButtonAvatar?.email ||
                          "U"
                        )
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="max-w-[150px] truncate">{withButtonLabel}</span>
                  </span>
                ) : selectedWithMembers.length >= 2 ? (
                  <Typography variant="p" className="text-[13px]" text={withButtonLabel} />
                ) : null}
                <ChevronDown
                  size={13}
                  className={cn(
                    "transition-transform duration-200",
                    openWithSearch ? "rotate-180" : "rotate-0",
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
                  value={withSearch}
                  onChange={(event) => setWithSearch(event.target.value)}
                  placeholder="Search people..."
                  className="h-8 border-[#797c814d] text-sm"
                />
              </div>
              <div className="max-h-64 overflow-y-auto">
                {selectedWithMembers.length > 0 ? (
                  <div className="border-b border-[#797c814d] pb-2">
                    {selectedWithMembers.map((member) => {
                      const display = displayMember(member)
                      const label =
                        display.displayName || display.name || display.email || member.id
                      return (
                        <label
                          key={member.id}
                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-white/10"
                        >
                          <input
                            id={`with-user-${member.id}`}
                            name={member.id}
                            type="checkbox"
                            checked
                            onChange={() =>
                              setWithUserIds(withUserIds.filter((id) => id !== member.id))
                            }
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
                      onClick={() => setWithUserIds([])}
                    >
                      Clear all
                    </span>
                  </div>
                ) : null}

                <div className="px-3 py-2 text-sm text-neutral-400">Suggestions</div>
                {suggestedWithMembers.length === 0 ? (
                  <div className="px-4 py-3 text-sm text-neutral-400">No people found</div>
                ) : (
                  suggestedWithMembers.slice(0, 8).map((member) => {
                    const display = displayMember(member)
                    const label =
                      display.displayName || display.name || display.email || member.id
                    return (
                      <label
                        key={member.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
                      >
                        <input
                          id={`with-user-${member.id}`}
                          name={member.id}
                          type="checkbox"
                          checked={false}
                          onChange={() => setWithUserIds([...withUserIds, member.id])}
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
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
          {isLoading || isFilteringByWith ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span>{resultCountLabel}</span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3 pb-6">
          {isLoading || isFilteringByWith ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }, (_, i) => (
                <div
                  key={i}
                  className="rounded-md border border-[#35373B] px-4 py-3"
                >
                  <div className="flex gap-3">
                    <Skeleton className="size-8 shrink-0 rounded-md" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <Skeleton className="h-4 w-2/5" />
                      <Skeleton className="h-3 w-4/5" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : null}

          {!isLoading && !isFilteringByWith && filteredChannels.length === 0 ? (
            <div className="rounded-xl border border-[#35373B] p-6 text-sm text-neutral-400">
              No channels matched the current search.
            </div>
          ) : null}

          {filteredChannels.map((channel) => (
            <div
              key={channel.id}
              role="button"
              onClick={() => openChannel(channel.id)}
              className={cn(
                "group flex gap-3 w-full cursor-pointer rounded-md border border-[#35373B] px-4 py-3 text-left transition-all hover:-translate-y-px",
                activeResultId === channel.id && "border-selection-hover bg-selection-hover/15 ring-1 ring-selection-hover/60",
              )}
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md">
                {channel.isPrivate ? <MdOutlineLock size={16} /> : <FiHash size={16} />}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{channel.name}</div>
                <div className="mt-1 truncate text-xs text-neutral-400">
                  {channel.topic || channel.description || "No topic"}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
