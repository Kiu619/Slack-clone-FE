"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Typography from "@/components/ui/typography"
import { useAuth } from "@/hooks/use-auth"
import { useChannels } from "@/hooks/use-channel"
import { useConversations } from "@/hooks/use-conversations"
import type { Channel, DirectMessageConversation, User, Workspace } from "@/lib/types"
import { type Theme } from "@/stores/useThemeStore"
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore"
import { useShallow } from "zustand/react/shallow"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useMemo, useState } from "react"
import { FaCaretDown, FaCaretRight } from "react-icons/fa"
import { FiHash, FiLock } from "react-icons/fi"
import { SlStar } from "react-icons/sl"
import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar"

type StarredRow =
  | { kind: "channel"; channel: Channel; starredAt: string }
  | { kind: "dm"; conversation: DirectMessageConversation; starredAt: string }

interface Props {
  theme: Theme
  currentWorkspaceData: Workspace
}

const Starred = ({ theme, currentWorkspaceData }: Props) => {
  const params = useParams<{ workspaceId: string; channelId?: string; conversationId?: string }>()
  const { user: currentUser } = useAuth()
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)

  const wid = currentWorkspaceData.id
  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[wid] ?? {}),
  )

  const displayMember = (m: User) =>
    mergeUserForDisplay(m, memberOverlayMap[m.id])

  const { data: channels = [] } = useChannels(wid)
  const { data: conversations = [] } = useConversations(wid)

  const rows = useMemo(() => {
    const list: StarredRow[] = []
    for (const ch of channels) {
      const t = ch.starredAt
      if (t) list.push({ kind: "channel", channel: ch, starredAt: t })
    }
    for (const c of conversations) {
      const t = c.starredAt
      if (t) list.push({ kind: "dm", conversation: c, starredAt: t })
    }
    list.sort(
      (a, b) =>
        new Date(b.starredAt).getTime() - new Date(a.starredAt).getTime(),
    )
    return list
  }, [channels, conversations])

  const getConversationName = (members: User[]) => {
    const otherMembers = members.filter((m) => m.id !== currentUser?.id)
    if (otherMembers.length === 0) return "You"
    return otherMembers
      .map((m) => {
        const d = displayMember(m)
        return d.displayName || d.name || d.email || ""
      })
      .join(", ")
  }

  const getConversationAvatar = (members: User[], isGroup: boolean) => {
    const otherMembers = members.filter((m) => m.id !== currentUser?.id)

    if (!isGroup || otherMembers.length === 1) {
      const member = otherMembers[0] ?? currentUser
      if (!member) {
        return (
          <Avatar className="size-4">
            <AvatarFallback className="bg-sky-500 text-white text-[10px]">
              U
            </AvatarFallback>
          </Avatar>
        )
      }
      const d = displayMember(member as User)
      return (
        <Avatar className="size-4">
          <AvatarImage src={d.avatar || ""} />
          <AvatarFallback className="bg-sky-500 text-white text-[10px]">
            {(d.displayName || d.name || "U")
              .substring(0, 2)
              .toUpperCase()}
          </AvatarFallback>
        </Avatar>
      )
    }

    return (
      <AvatarGroup>
        {otherMembers.slice(0, 2).map((member) => {
          const d = displayMember(member)
          return (
            <Avatar key={member.id} className="size-4">
              <AvatarImage src={d.avatar || ""} />
              <AvatarFallback className="text-[8px]">
                {(d.displayName || d.name || "U")
                  .substring(0, 1)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
          )
        })}
      </AvatarGroup>
    )
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger asChild>
        <div
          className="flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          {!hovered && (
            <SlStar size={15} className="text-workspace-side-panel-text" />
          )}
          {hovered && open && (
            <FaCaretDown size={15} className="text-workspace-side-panel-text" />
          )}
          {hovered && !open && (
            <FaCaretRight size={15} className="text-workspace-side-panel-text" />
          )}
          <Typography
            text="Starred"
            variant="p"
            className="text-[15px]! text-workspace-side-panel-text"
          />
        </div>
      </CollapsibleTrigger>

      <CollapsibleContent>
        {rows.length === 0 ? (
          <div className="px-9 py-2">
            <Typography
              text="Gắn sao channel hoặc DM để truy cập nhanh."
              variant="p"
              className="text-xs text-workspace-side-panel-text/50"
            />
          </div>
        ) : (
          rows.map((row) => {
            if (row.kind === "channel") {
              const ch = row.channel
              const isActive = params.channelId === ch.id
              return (
                <Link
                  key={`s-ch-${ch.id}`}
                  href={`/workspace/${wid}/channel/${ch.id}`}
                >
                  <div
                    className={`flex items-center gap-x-2 px-3 py-1 cursor-pointer rounded-md transition-colors ${
                      isActive
                        ? "text-white"
                        : "hover:bg-[rgba(255,255,255,0.1)]"
                    }`}
                    style={
                      isActive ? { backgroundColor: theme.selectedItems } : {}
                    }
                  >
                    {ch.isPrivate ? (
                      <FiLock
                        size={14}
                        className="text-workspace-side-panel-text shrink-0"
                      />
                    ) : (
                      <FiHash
                        size={14}
                        className="text-workspace-side-panel-text shrink-0"
                      />
                    )}
                    <Typography
                      text={ch.name}
                      variant="p"
                      className="text-[14px]! text-workspace-side-panel-text truncate"
                    />
                  </div>
                </Link>
              )
            }

            const conv = row.conversation
            const isActive = params.conversationId === conv.id
            return (
              <Link
                key={`s-dm-${conv.id}`}
                href={`/workspace/${wid}/dm/${conv.id}`}
              >
                <div
                  className={`flex items-center gap-x-2 px-3 py-1 cursor-pointer rounded-md transition-colors ${
                    isActive
                      ? "text-white"
                      : "hover:bg-[rgba(255,255,255,0.1)]"
                  }`}
                  style={
                    isActive ? { backgroundColor: theme.selectedItems } : {}
                  }
                >
                  {getConversationAvatar(conv.members, conv.isGroup)}
                  <Typography
                    text={getConversationName(conv.members)}
                    variant="p"
                    className="text-[14px]! text-workspace-side-panel-text truncate"
                  />
                </div>
              </Link>
            )
          })
        )}
      </CollapsibleContent>
    </Collapsible>
  )
}

export default Starred
