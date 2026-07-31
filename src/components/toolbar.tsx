"use client"

import { useRef } from "react"
import { Workspace } from "@/lib/types"
import { FaMagnifyingGlass } from "react-icons/fa6"
import Typography from "./ui/typography"
import { RecentToolbarPopover } from "@/components/recent-toolbar-popover"
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore"
import { GlobalSearchPopoverContent } from "@/modules/global-search/global-search-popover"
import { Popover, PopoverAnchor } from "@/components/ui/popover"
import { useUserStore } from "@/stores/useUserStore"
import { useQuery } from "@tanstack/react-query"
import { fetchWorkspaceMembersApi } from "@/apis"
import { workspaceKeys } from "@/lib/query-keys"
import { getConversationSummary, resolveWorkspaceMember } from "@/modules/global-search/utils"
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore"
import { useShallow } from "zustand/react/shallow"
import { useChannels } from "@/hooks/use-channel"
import { useConversations } from "@/hooks/use-conversations"
import type { HasFilterType, IsFilterType, TypeFilterType } from "@/modules/global-search/types"

interface ToolbarProps {
  workspaceId: string
  currentWorkspaceData: Workspace
}

const Toolbar = ({ workspaceId, currentWorkspaceData }: ToolbarProps) => {
  const searchWrapRef = useRef<HTMLButtonElement>(null)
  const open = useGlobalSearchStore((s) => s.open)
  const query = useGlobalSearchStore((s) => s.query)
  const fromUserIds = useGlobalSearchStore((s) => s.fromUserIds)
  const withUserIds = useGlobalSearchStore((s) => s.withUserIds)
  const inChannelIds = useGlobalSearchStore((s) => s.inChannelIds)
  const inConversationIds = useGlobalSearchStore((s) => s.inConversationIds)
  const afterDate = useGlobalSearchStore((s) => s.afterDate)
  const beforeDate = useGlobalSearchStore((s) => s.beforeDate)
  const hasFilterTypes = useGlobalSearchStore((s) => s.hasFilterTypes)
  const isFilterTypes = useGlobalSearchStore((s) => s.isFilterTypes)
  const typeFilterTypes = useGlobalSearchStore((s) => s.typeFilterTypes)
  const currentUser = useUserStore((state) => state.user)
  const { data: channels = [] } = useChannels(workspaceId)
  const { data: conversations = [] } = useConversations(workspaceId)
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  })
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  )
  const goSearch = () => {
    useGlobalSearchStore.getState().openSearch()
  }

  const searchContent = (() => {
    const fromLabels = fromUserIds
      .map((memberId) => resolveWorkspaceMember(memberId, currentUser, workspaceMembers, memberOverlayMap))
      .filter(Boolean)
      .map((member) => {
        const displayName = member?.displayName || member?.name || member?.email || member?.id
        return `from:@${displayName}`
      })

    const withLabels = withUserIds
      .map((memberId) => resolveWorkspaceMember(memberId, currentUser, workspaceMembers, memberOverlayMap))
      .filter(Boolean)
      .map((member) => {
        const displayName = member?.displayName || member?.name || member?.email || member?.id
        return `with:@${displayName}`
      })

    const inChannelLabels = inChannelIds
      .map((channelId) => channels.find((channel) => channel.id === channelId))
      .filter((channel): channel is (typeof channels)[number] => Boolean(channel))
      .map((channel) => `in:#${channel.name}`)

    const inConversationLabels = inConversationIds
      .map((conversationId) => conversations.find((conversation) => conversation.id === conversationId))
      .filter((conversation): conversation is (typeof conversations)[number] => Boolean(conversation))
      .map((conversation) => {
        const names = getConversationSummary(conversation, currentUser?.id, memberOverlayMap).label
        return `in:${names || "Direct message"}`
      })

    const dateParts = [afterDate ? `after:${afterDate}` : "", beforeDate ? `before:${beforeDate}` : ""].filter(Boolean)
    const hasParts = hasFilterTypes.map((type: HasFilterType) =>
      type === "link" ? "has:link" : type === "reaction" ? "has:reaction" : "has:file",
    )
    const isParts = isFilterTypes.map((type: IsFilterType) =>
      type === "saved"
        ? "is:saved"
        : type === "thread"
          ? "is:thread"
          : type === "pinned"
            ? "is:pinned"
            : "is:dm",
    )
    const typeParts = typeFilterTypes.map((type: TypeFilterType) => `type:${type}`)

    const parts = [
      ...fromLabels,
      ...withLabels,
      ...inChannelLabels,
      ...inConversationLabels,
      ...hasParts,
      ...isParts,
      ...typeParts,
      ...dateParts,
      query.trim(),
    ].filter(Boolean)
    if (parts.length === 0) return `Search ${currentWorkspaceData.name}`
    return `Search: ${parts.join(" ")}`
  })()

  return (
    <div className="h-[42px] flex items-center justify-center">
      <div className="flex items-center gap-x-2">
        <RecentToolbarPopover workspaceId={workspaceId} />
        <Popover
          open={open}
          onOpenChange={(next) => {
            if (next) return
            const store = useGlobalSearchStore.getState()
            if (store.consumeSuppressNextClose()) return
            store.closeSearch()
          }}
        >
          <PopoverAnchor asChild>
            <button
              id="global-search-toolbar-trigger"
              ref={searchWrapRef}
              type="button"
              onClick={goSearch}
              className="max-w-[1000px] lg:w-[950px] w-[500px] bg-[rgba(255,255,255,0.3)] rounded-md hover:cursor-pointer border flex items-center h-[28px] text-left"
            >
              <FaMagnifyingGlass className="text-[#C0B4C2] mx-2 shrink-0" size={14} />
              <Typography text={searchContent} variant="p" className="text-[13px]/1 text-white pr-2 " />
            </button>
          </PopoverAnchor>
          <GlobalSearchPopoverContent workspaceId={workspaceId} />
        </Popover>
      </div>
    </div>
  )
}

export default Toolbar
