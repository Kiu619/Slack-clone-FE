"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Typography from '@/components/ui/typography'
import { useMemo, useState } from 'react'
import { FaCaretDown, FaCaretRight } from "react-icons/fa"
import { FiHash, FiLock, FiPlus } from "react-icons/fi"



import CreateChannelDialog from "@/components/create-channel-dialog"
import { Channel, Workspace } from "@/lib/types"
import { type Theme } from "@/stores/useThemeStore"
import Link from "next/link"
import { useParams } from "next/navigation"

interface Props {
  theme: Theme
  currentWorkspaceData: Workspace
  userWorkspaceChannels: Channel[]
}

const Channels = ({ theme, currentWorkspaceData, userWorkspaceChannels }: Props) => {
  const params = useParams<{ channelId?: string }>()
  const [open, setOpen] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  /** Đã star → chỉ hiện dưới Starred, không lặp ở Channels */
  const channelsInSidebar = useMemo(
    () => userWorkspaceChannels.filter((c) => !c.starredAt),
    [userWorkspaceChannels],
  )

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="flex items-center justify-between gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md"
        >
          <CollapsibleTrigger asChild>
            <div
              className="flex items-center gap-x-2 flex-1"
              onClick={() => setOpen((prev) => !prev)}
            >
              {open ? (
                <FaCaretDown size={15} className="text-workspace-side-panel-text" />
              ) : (
                <FaCaretRight size={15} className="text-workspace-side-panel-text" />
              )}
              <Typography
                text="Channels"
                variant="p"
                className="text-[15px]! text-workspace-side-panel-text"
              />
            </div>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          {channelsInSidebar.map((channel) => {
            const isActive = params.channelId === channel.id
            return (
              <Link
                href={`/workspace/${currentWorkspaceData.id}/channel/${channel.id}`}
                key={channel.id}
              >
                <div
                  className={`flex items-center gap-x-2 px-3 py-1 cursor-pointer rounded-md transition-colors ${isActive
                    ? 'text-white'
                    : 'hover:bg-[rgba(255,255,255,0.1)]'
                    }`}
                  style={isActive ? { backgroundColor: theme.selectedItems } : {}}
                >
                  {channel.isPrivate ? (
                    <FiLock size={14} className="text-workspace-side-panel-text shrink-0" />
                  ) : (
                    <FiHash size={14} className="text-workspace-side-panel-text shrink-0" />
                  )}
                  <Typography
                    text={channel.name}
                    variant="p"
                    className="text-[14px]! text-workspace-side-panel-text truncate"
                  />
                </div>
              </Link>
            )
          })}

          <div
            className="flex items-center gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md"
            onClick={() => setDialogOpen(true)}
          >
            <FiPlus size={14} className="text-workspace-side-panel-text" />
            <Typography
              text="Add channels"
              variant="p"
              className="text-[14px]! text-workspace-side-panel-text"
            />
          </div>
        </CollapsibleContent>
      </Collapsible>

      <CreateChannelDialog
        dialogOpen={dialogOpen}
        setDialogOpen={setDialogOpen}
        workspaceId={currentWorkspaceData.id}
      />
    </>
  )
}

export default Channels
