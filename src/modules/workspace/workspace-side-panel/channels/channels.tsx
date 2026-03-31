"use client"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import Typography from '@/components/ui/typography'
import { useState } from 'react'
import { FaCaretDown, FaCaretRight } from "react-icons/fa"
import { FiHash, FiLock, FiPlus } from "react-icons/fi"
import { IoMdMore } from "react-icons/io"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import CreateChannelDialog from "@/components/create-channel-dialog"
import { Channel, Workspace } from "@/lib/types"
import Link from "next/link"
import { useParams } from "next/navigation"
import { type Theme } from "@/stores/useThemeStore"

interface Props {
  theme: Theme
  currentWorkspaceData: Workspace
  userWorkspaceChannels: Channel[]
}

const Channels = ({ theme, currentWorkspaceData, userWorkspaceChannels }: Props) => {
  const params = useParams<{ channelId?: string }>()
  const [open, setOpen] = useState(true)
  const [hovered, setHovered] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="flex items-center justify-between gap-x-2 px-3 py-1 hover:bg-[rgba(255,255,255,0.1)] cursor-pointer rounded-md"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
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

          {hovered && (
            <div className="cursor-pointer rounded-md hover:bg-[#423145] grid place-content-center">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <div className="cursor-pointer rounded-md hover:bg-[#423145] grid place-content-center p-0.5">
                          <IoMdMore
                            size={18}
                            className="text-workspace-side-panel-text"
                          />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        side="right"
                        align="center"
                        withOverlay={true}
                        className="w-[260px]"
                      >
                        <DropdownMenuGroup>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Create</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem
                                  onSelect={() => setDialogOpen(true)}
                                >
                                  Create channel
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuGroup>

                        <DropdownMenuSeparator />

                        <DropdownMenuGroup>
                          <DropdownMenuSub>
                            <DropdownMenuSubTrigger>Manage</DropdownMenuSubTrigger>
                            <DropdownMenuPortal>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem>Browse channels</DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuPortal>
                          </DropdownMenuSub>
                        </DropdownMenuGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <Typography
                    text="More actions"
                    variant="p"
                    className="text-[14px]! text-workspace-side-panel-text"
                  />
                </TooltipContent>
              </Tooltip>
            </div>
          )}
        </div>

        <CollapsibleContent>
          {userWorkspaceChannels.map((channel) => {
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
