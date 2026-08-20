"use client";

import Typography from "@/components/ui/typography";
import { Channel } from "@/lib/types";
import { FiHash } from "react-icons/fi";
import { RiPushpinLine } from "react-icons/ri";

import ChannelNotificationPopover from "@/components/popovers/channel-notification-popover";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStarChannel } from "@/hooks/use-channel";
import { cn } from "@/lib/utils";
import ChannelDetailDialog from "@/modules/channels/channel-details/channel-detail-dialog";
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { HuddleHeaderBadge } from "@/modules/huddle/huddle-header-badge";
import { X } from "lucide-react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BiMessageRounded } from "react-icons/bi";
import { FaRegFolderOpen } from "react-icons/fa";
import { FaRegFolderClosed, FaStar } from "react-icons/fa6";
import { ImFilesEmpty } from "react-icons/im";
import { IoMdMore } from "react-icons/io";
import { IoPersonOutline } from "react-icons/io5";
import { SlStar } from "react-icons/sl";
import { toast } from "sonner";
import { useAppTranslation } from "@/hooks/use-translation";

export type ChannelViewTab = "messages" | "files" | "folders" | "pins";

const Header = ({
  currentChannelData,
  activeTab,
  onTabChange,
  isMember,
  showXIcon = false
}: {
  currentChannelData: Channel;
  activeTab: ChannelViewTab;
  onTabChange: (tab: ChannelViewTab) => void;
  isMember: boolean;
  showXIcon?: boolean;
}) => {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params.workspaceId ?? "";
  const starMutation = useStarChannel(workspaceId, currentChannelData.id);
  const isStarred = Boolean(currentChannelData.starredAt);
  const t = useAppTranslation('channel.header')

  const { reset } = useMainPanelStore();
  const openGlobalSearch = useGlobalSearchStore((state) => state.openSearch);
  const armSuppressNextClose = useGlobalSearchStore((state) => state.armSuppressNextClose);
  const setInChannelIds = useGlobalSearchStore((state) => state.setInChannelIds);
  const setInConversationIds = useGlobalSearchStore((state) => state.setInConversationIds);
  const resetGlobalSearch = useGlobalSearchStore((state) => state.resetSearch);
  const [openChannelDetailDialog, setOpenChannelDetailDialog] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);

  const toggleChannelStar = () => {
    if (!isMember) {
      toast.message(t('joinChannelToStar'));
      return;
    }
    starMutation.mutate(!isStarred);
  };

  const { theme: storeTheme } = useThemeStore();
  return (
    <div className="flex flex-col border-b border-[#797c814d]">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="custom"
                className="p-2"
                disabled={!isMember || starMutation.isPending}
                onClick={toggleChannelStar}
              >
                {isStarred ? (
                  <FaStar size={18} className="text-amber-400" />
                ) : (
                  <SlStar size={18} className="text-workspace-side-panel-text" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <Typography
                text={isStarred ? t('unstarChannel') : t('starChannel')}
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                className="flex items-center p-1 gap-0.5"
                size="custom"
                onClick={() => setOpenChannelDetailDialog(true)}
              >
                <FiHash size={18} />
                <Typography
                  text={currentChannelData.name}
                  variant="h4"
                  className=""
                />
              </Button>
            </TooltipTrigger>

            <TooltipContent side="bottom">
              <Typography
                text={t('getChannelDetails')}
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="flex items-center gap-1 cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-0.5 rounded-md border border-[#797c814d]">
                <IoPersonOutline size={18} />
                <Typography
                  text={t('members')}
                  variant="p"
                  className="text-[13px]!"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <Typography
                text={t('viewAllMembers')}
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>

          <HuddleHeaderBadge
            workspaceId={workspaceId}
            entityType="channel"
            entityId={currentChannelData.id}
            label={currentChannelData.name}
            canInteract={isMember}
            blockedJoinMessage={t('joinChannelToStar')}
          />

          <ChannelNotificationPopover
            workspaceId={workspaceId}
            channelId={currentChannelData.id}
          />

          <Popover open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-md">
                    <IoMdMore size={20} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <Typography
                  text={t('moreActions')}
                  variant="p"
                  className="text-[14px]!"
                />
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
              withOverlay={true}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="py-2 flex flex-col space-y-1">
                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenChannelDetailDialog(true);
                    setMoreActionsOpen(false);
                  }}
                >
                  <Typography
                    variant="p"
                    text={t('openChannelDetails')}
                    className="text-[15px]"
                  />
                </Button>
                <Separator />
                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleChannelStar();
                    setMoreActionsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography
                      variant="p"
                      text={isStarred ? t('unstarChannel') : t('starChannel')}
                    />
                  </div>
                </Button>

                <Separator />

                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(window.location.href)
                    toast.success(t('linkCopied'))
                  }}
                >
                  <Typography variant="p" text={t('copyLink')} />
                </Button>
                <Button variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(currentChannelData.name)
                    toast.success(t('nameCopied'))
                  }}
                >
                  <Typography variant="p" text={t('copyName')} />
                </Button>

                <Separator />

                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetGlobalSearch();
                    setInChannelIds([currentChannelData.id]);
                    setInConversationIds([]);
                    setMoreActionsOpen(false);
                    setTimeout(() => {
                      armSuppressNextClose();
                      openGlobalSearch();
                    }, 0);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography variant="p" text={t('searchInChannel')} />
                  </div>
                </Button>

                <Separator />

                <Button
                  variant="submenu"
                  className={cn(
                    "text-red-400! hover:text-white! hover:bg-red-700!",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                  }}
                >
                  <Typography
                    variant="p"
                    text={t('leaveChannel')}
                    className="mt-0.5 "
                  />
                </Button>
              </div>

            </PopoverContent>
          </Popover>

          {showXIcon && (
            <button onClick={() => reset()} className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 mr-1 rounded-md">
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-x-1 mx-2 border-b border-transparent">
        <button
          type="button"
          onClick={() => onTabChange("messages")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "messages"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "messages"
              ? {
                borderColor: storeTheme.selectedItems,
                borderBottomWidth: 3,
                color: storeTheme.selectedItems,
              }
              : {}
          }
        >
          <BiMessageRounded
            size={16}
            style={
              activeTab === "messages" ? { fill: storeTheme.selectedItems } : {}
            }
          />
          <Typography text={t('messages')} variant="p" className="text-[13px]!" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("files")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "files"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "files"
              ? {
                borderColor: storeTheme.selectedItems,
                borderBottomWidth: 3,
                color: storeTheme.selectedItems,
              }
              : {}
          }
        >
          <ImFilesEmpty size={16} />
          <Typography text={t('files')} variant="p" className="text-[13px]!" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("folders")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "folders"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "folders"
              ? {
                borderColor: storeTheme.selectedItems,
                borderBottomWidth: 3,
                color: storeTheme.selectedItems,
              }
              : {}
          }
        >
          {activeTab === "folders" ? (
            <FaRegFolderOpen size={17} />
          ) : (
            <FaRegFolderClosed size={16} />
          )}
          <Typography text={t('folders')} variant="p" className="text-[13px]!" />
        </button>

        <button
          type="button"
          onClick={() => onTabChange("pins")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "pins"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "pins"
              ? {
                borderColor: storeTheme.selectedItems,
                borderBottomWidth: 3,
                color: storeTheme.selectedItems,
              }
              : {}
          }
        >
          <RiPushpinLine size={16} />
          <Typography text={t('pins')} variant="p" className="text-[13px]!" />
        </button>
      </div>

      <ChannelDetailDialog
        open={openChannelDetailDialog}
        onOpenChange={setOpenChannelDetailDialog}
        currentChannelData={currentChannelData}
        isMember={isMember}
      />
    </div>
  );
};

export default Header;
