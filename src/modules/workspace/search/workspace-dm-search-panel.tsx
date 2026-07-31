"use client"

import { fetchWorkspaceMembersApi } from "@/apis"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import Typography from "@/components/ui/typography"
import { useConversations } from "@/hooks/use-conversations"
import type { DirectMessageConversation, User, WorkspaceMember } from "@/lib/types"
import { getDmMemberDisplayName, isActiveWorkspaceMember } from "@/lib/dm-members"
import { cn } from "@/lib/utils"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { useMainPanelStore } from "@/stores/useMainPanelStore"
import { useThreadPanelStore } from "@/stores/useThreadPanelStore"
import { useUserStore } from "@/stores/useUserStore"
import {
  mergeUserForDisplay,
  type WorkspaceMemberDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore"
import { useQuery } from "@tanstack/react-query"
import { ChevronDown } from "lucide-react"
import { useMemo, useState } from "react"
import { useShallow } from "zustand/react/shallow"
import { ACTIVE_ITEM_STYLE } from "@/constants/styles"
import { Skeleton } from "@/components/ui/skeleton"

function getConversationName(
  conversation: DirectMessageConversation,
  currentUserId: string | undefined,
  memberOverlayMap: Record<string, WorkspaceMemberDisplay>,
) {
  const others = conversation.members.filter((m) => m.id !== currentUserId)
  if (!others.length) return "You"
  return others
    .map((member) =>
      getDmMemberDisplayName(mergeUserForDisplay(member, memberOverlayMap[member.id])),
    )
    .join(", ")
}

export function WorkspaceDmSearchPanel({
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

  const { data: conversations = [], isLoading } = useConversations(workspaceId, query)
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

  const filteredWithMembers = members
    .filter(isActiveWorkspaceMember)
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

  const filteredConversations = useMemo(() => {
    if (!withUserIds.length) return conversations
    return conversations.filter((conv) =>
      withUserIds.every((userId) => conv.members.some((member) => member.id === userId)),
    )
  }, [conversations, withUserIds])

  const openConversation = (conversationId: string) => {
    closeThread()
    setView({ type: "dm", conversationId })
    onSelectResult?.(conversationId)
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
                  selectedWithMembers.length > 0 && ACTIVE_ITEM_STYLE,
                )}
              >
                <Typography variant="p" className="text-[13px]" text="With" />
                {selectedWithMembers.length > 0 ? (
                  <Typography
                    variant="p"
                    className="text-[13px]"
                    text={
                      selectedWithMembers.length === 1
                        ? displayMember(selectedWithMembers[0]).displayName ||
                          displayMember(selectedWithMembers[0]).name ||
                          selectedWithMembers[0].email
                        : `${selectedWithMembers.length} teammates`
                    }
                  />
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
              withOverlay
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
                {filteredWithMembers
                  .filter((member) => !withUserIds.includes(member.id))
                  .slice(0, 8)
                  .map((member) => {
                    const display = displayMember(member)
                    const label =
                      display.displayName || display.name || display.email || member.id
                    return (
                      <label
                        key={member.id}
                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm cursor-pointer hover:bg-selection-hover hover:text-white"
                      >
                        <input
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
                  })}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mt-4 flex items-center justify-between text-sm text-neutral-400">
          {isLoading ? (
            <Skeleton className="h-4 w-24" />
          ) : (
            <span>{`${filteredConversations.length} results`}</span>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-3 pb-6">
          {isLoading ? (
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

          {!isLoading && filteredConversations.length === 0 ? (
            <div className="rounded-xl border border-[#35373B] p-6 text-sm text-neutral-400">
              No conversations matched the current search.
            </div>
          ) : null}

          {filteredConversations.map((conversation) => {
            const title = getConversationName(
              conversation,
              currentUser?.id,
              memberOverlayMap,
            )
            const peer = conversation.members.find((m) => m.id !== currentUser?.id)
            const peerDisplay = peer
              ? mergeUserForDisplay(peer, memberOverlayMap[peer.id])
              : null

            return (
              <div
                key={conversation.id}
                role="button"
                onClick={() => openConversation(conversation.id)}
                className={cn(
                  "group flex gap-3 w-full cursor-pointer rounded-md border border-[#35373B] px-4 py-3 text-left transition-all hover:-translate-y-px",
                  activeResultId === conversation.id &&
                    "border-selection-hover bg-selection-hover/15 ring-1 ring-selection-hover/60",
                )}
              >
                <Avatar className="size-8 rounded-md">
                  <AvatarImage src={peerDisplay?.avatar || ""} />
                  <AvatarFallback className="text-[10px]">
                    {(title || "U").slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{title}</div>
                  <div className="mt-1 truncate text-xs text-neutral-400">
                    {conversation.lastMessageContent || "No messages yet"}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
