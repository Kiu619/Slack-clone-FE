"use client";

import CreateChannelDialog from "@/components/create-channel-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import Typography from "@/components/ui/typography";
import { useSidebarMutedItems } from "@/hooks/use-sidebar-muted-items";
import { useWorkspaceUnreadCounts } from "@/hooks/use-workspace-unread-counts";
import { Channel, Workspace } from "@/lib/types";
import { type Theme } from "@/stores/useThemeStore";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";
import { FiHash, FiPlus } from "react-icons/fi";
import { LuTextSearch } from "react-icons/lu";
import { MENU_ITEM_STYLE } from "@/constants/styles";
import { MdOutlineLock } from "react-icons/md";
import { HuddleSidebarIndicator } from "@/components/huddle-sidebar-indicator";

interface Props {
  theme: Theme;
  currentWorkspaceData: Workspace;
  userWorkspaceChannels: Channel[];
}

const Channels = ({
  theme,
  currentWorkspaceData,
  userWorkspaceChannels,
}: Props) => {
  const params = useParams<{ channelId?: string }>();
  const [open, setOpen] = useState(true);
  const [hovered, setHovered] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const { channelUnreadById } = useWorkspaceUnreadCounts();

  const unstarredChannels = useMemo(
    () => userWorkspaceChannels.filter((channel) => !channel.starredAt),
    [userWorkspaceChannels],
  );
  const { visibleChannels, mutedChannels, isChannelsReady } =
    useSidebarMutedItems({
      workspaceId: currentWorkspaceData.id,
      channels: unstarredChannels,
    });
  const activeMutedChannel = useMemo(
    () =>
      mutedChannels.find((channel) => channel.id === params.channelId) ?? null,
    [mutedChannels, params.channelId],
  );
  const channelsToRender = useMemo(
    () =>
      activeMutedChannel
        ? [...visibleChannels, activeMutedChannel]
        : visibleChannels,
    [activeMutedChannel, visibleChannels],
  );
  const mutedChannelsInPopover = useMemo(
    () =>
      activeMutedChannel
        ? mutedChannels.filter(
            (channel) => channel.id !== activeMutedChannel.id,
          )
        : mutedChannels,
    [activeMutedChannel, mutedChannels],
  );

  return (
    <>
      <Collapsible open={open} onOpenChange={setOpen}>
        <div
          className="flex items-center justify-between gap-x-2 rounded-md px-3 py-1 hover:bg-[rgba(255,255,255,0.1)]"
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
        >
          <CollapsibleTrigger asChild>
            <div
              className="flex w-full items-center justify-between gap-x-2 cursor-pointer"
              onClick={() => setOpen((prev) => !prev)}
            >
              <div className="flex items-center gap-x-2">
                {open ? (
                  <FaCaretDown
                    size={15}
                    className="text-workspace-side-panel-text"
                  />
                ) : (
                  <FaCaretRight
                    size={15}
                    className="text-workspace-side-panel-text"
                  />
                )}
                <Typography
                  text="Channels"
                  variant="p"
                  className="text-[15px]! text-workspace-side-panel-text"
                />
              </div>

              {hovered &&
              isChannelsReady &&
              mutedChannelsInPopover.length > 0 ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="rounded p-0.5 text-workspace-side-panel-text hover:bg-white/10"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span>
                            <LuTextSearch size={14} />
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Muted conversations</p>
                        </TooltipContent>
                      </Tooltip>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    side="bottom"
                    align="end"
                    className="w-72 border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <div className="flex flex-col gap-1 py-1">
                      <Typography
                        text="Muted conversations"
                        variant="p"
                        className="px-3 pb-1 text-xs font-semibold text-workspace-side-panel-text/70"
                      />
                      {mutedChannelsInPopover.map((channel) => {
                        const unreadCount = channelUnreadById[channel.id] ?? 0;
                        const hasUnread = unreadCount > 0;
                        return (
                          <Link
                            href={`/workspace/${currentWorkspaceData.id}/channel/${channel.id}`}
                            key={`muted-channel-${channel.id}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className={MENU_ITEM_STYLE}>
                              {channel.isPrivate ? (
                                <MdOutlineLock
                                  size={14}
                                  className="shrink-0 text-workspace-side-panel-text"
                                />
                              ) : (
                                <FiHash
                                  size={14}
                                  className="shrink-0 text-workspace-side-panel-text"
                                />
                              )}
                              <Typography
                                text={channel.name}
                                variant="p"
                                className="min-w-0 flex-1 truncate text-[14px]! text-workspace-side-panel-text"
                              />
                              {hasUnread ? (
                                <span className="min-w-5 rounded-full bg-[#e01e5a] px-1 text-center text-[11px] font-bold leading-5 text-white h-5">
                                  {unreadCount > 99 ? "99+" : unreadCount}
                                </span>
                              ) : null}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
            </div>
          </CollapsibleTrigger>
        </div>

        <CollapsibleContent>
          {!isChannelsReady ? (
            <div className="px-3 py-2" aria-hidden="true" />
          ) : (
            channelsToRender.map((channel) => {
              const isActive = params.channelId === channel.id;
              const unreadCount = channelUnreadById[channel.id] ?? 0;
              const hasUnread = unreadCount > 0;

              return (
                <Link
                  href={`/workspace/${currentWorkspaceData.id}/channel/${channel.id}`}
                  key={channel.id}
                >
                  <div
                    className={`flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer transition-colors ${
                      isActive
                        ? "text-workspace-text-active"
                        : "hover:bg-[rgba(255,255,255,0.1)]"
                    }`}
                    style={
                      isActive ? { backgroundColor: theme.selectedItems } : {}
                    }
                  >
                    {channel.isPrivate ? (
                      <MdOutlineLock
                        size={14}
                        className={
                          isActive
                            ? "shrink-0 text-workspace-text-active"
                            : "shrink-0 text-workspace-side-panel-text"
                        }
                      />
                    ) : (
                      <FiHash
                        size={14}
                        className={
                          isActive
                            ? "shrink-0 text-workspace-text-active"
                            : "shrink-0 text-workspace-side-panel-text"
                        }
                      />
                    )}
                    <Typography
                      text={channel.name}
                      variant="p"
                      className={`truncate text-[14px]! ${isActive ? "text-workspace-text-active" : "text-workspace-side-panel-text"} ${hasUnread ? "font-bold" : ""}`}
                    />

                    <div className="ml-auto flex gap-2">
                      {hasUnread ? (
                        <span className="ml-auto min-w-5 rounded-full bg-[#e01e5a] px-1 text-center text-[11px] font-bold leading-5 text-white h-5">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : null}
                      <HuddleSidebarIndicator
                        workspaceId={currentWorkspaceData.id}
                        entityType="channel"
                        entityId={channel.id}
                      />
                    </div>
                  </div>
                </Link>
              );
            })
          )}

          <div
            className="flex items-center gap-x-2 rounded-md px-3 py-1 cursor-pointer hover:bg-[rgba(255,255,255,0.1)]"
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
  );
};

export default Channels;
