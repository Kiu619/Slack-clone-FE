"use client";

import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import Typography from "@/components/ui/typography";
import type { DirectMessageConversation, User } from "@/lib/types";
import { RiHeadphoneLine, RiPushpinLine } from "react-icons/ri";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStarConversation } from "@/hooks/use-conversation";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { useThemeStore } from "@/stores/useThemeStore";
import { BiMessageRounded } from "react-icons/bi";
import { FaRegFolderOpen } from "react-icons/fa";
import { FaRegFolderClosed, FaStar } from "react-icons/fa6";
import { ImFilesEmpty } from "react-icons/im";
import { IoMdMore } from "react-icons/io";
import { IoChevronDownOutline } from "react-icons/io5";
import { SlStar } from "react-icons/sl";
import DMsNotificationPopover from "@/components/popovers/dm-notification-popover";
import { X } from "lucide-react";
import { clearLastDmConversationId } from "@/lib/last-dm-storage";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useMemo, useState } from "react";
import DMDetailDialog from "./dm-details/dm-detail-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { MENU_ITEM_STYLE } from "@/constants/styles";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

export type DMViewTab = "messages" | "files" | "folders" | "pins";

interface DMHeaderProps {
  conversation: DirectMessageConversation;
  activeTab: DMViewTab;
  onTabChange: (tab: DMViewTab) => void;
  showXIcon?: boolean;
}

const DMHeader = ({
  conversation,
  activeTab,
  onTabChange,
  showXIcon = false,
}: DMHeaderProps) => {
  const { theme: storeTheme } = useThemeStore();
  const { user: currentUser } = useAuth();
  const { reset } = useMainPanelStore();
  const [openDMDetailDialog, setOpenDMDetailDialog] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const starMutation = useStarConversation(
    conversation.workspaceId,
    conversation.id,
  );
  const isStarred = Boolean(conversation.starredAt);

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[conversation.workspaceId] ?? {}),
  );

  const toggleDmStar = () => {
    starMutation.mutate(!isStarred);
  };

  const otherMembers = conversation.members.filter(m => m.id !== currentUser?.id);
  const isSelf = otherMembers.length === 0;
  
  const getDMName = () => {
    if (isSelf) return "You";
    return otherMembers
      .map((m) => {
        const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
        return d.displayName || d.name || d.email || "";
      })
      .join(", ");
  };

  /** Chỉ 1-1 hoặc DM với chính mình — group không gắn một emoji đại diện. */
  const headerStatusUser = useMemo(() => {
    if (!currentUser?.id) return null;
    const others = conversation.members.filter((m) => m.id !== currentUser.id);
    if (others.length === 0) {
      return mergeUserForDisplay(
        currentUser as User,
        memberOverlayMap[currentUser.id],
      );
    }
    if (!conversation.isGroup && others.length === 1) {
      const m = others[0] as User;
      return mergeUserForDisplay(m, memberOverlayMap[m.id]);
    }
    return null;
  }, [
    conversation.members,
    conversation.isGroup,
    currentUser,
    memberOverlayMap,
  ]);

  return (
    <div className="flex flex-col border-b border-[#797c814d]">
      <div className="flex items-center justify-between px-4 py-2">
        <div className="flex items-center gap-x-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="custom"
                className="p-1"
                disabled={starMutation.isPending}
                onClick={toggleDmStar}
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
                text={isStarred ? "Bỏ sao cuộc trò chuyện" : "Gắn sao cuộc trò chuyện"}
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button 
                variant="ghost" 
                className="flex max-w-[min(480px,70vw)] min-w-0 items-center gap-2 p-1 hover:bg-[rgba(255,255,255,0.1)]"
                size="custom"
                onClick={() => setOpenDMDetailDialog(true)}
              >
                <div className="flex min-w-0 flex-1 items-center gap-1">
                  <Typography
                    text={getDMName()}
                    variant="h4"
                    className="min-w-0 flex-1 truncate text-[16px] font-bold"
                  />
                  {headerStatusUser ? (
                    <UserStatusEmojiInline
                      statusEmoji={headerStatusUser.statusEmoji}
                      statusText={headerStatusUser.statusText}
                      emojiClassName="text-[16px]"
                      interactive={Boolean(
                        headerStatusUser.statusText?.trim(),
                      )}
                    />
                  ) : null}
                </div>
                <IoChevronDownOutline
                  size={14}
                  className="shrink-0 text-gray-500"
                />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">
              <Typography
                text="View conversation details"
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <div className="flex items-center rounded-md border border-[#797c814d]">
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-l-md">
                  <RiHeadphoneLine size={18} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <Typography
                  text="Start huddle"
                  variant="p"
                  className="text-[14px]!"
                />
              </TooltipContent>
            </Tooltip>

            <span className="h-4 w-px bg-[#797c814d]"></span>

            <Tooltip>
              <TooltipTrigger asChild>
                <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-r-md">
                  <IoChevronDownOutline size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <Typography
                  text="More options"
                  variant="p"
                  className="text-[14px]!"
                />
              </TooltipContent>
            </Tooltip>
          </div>

          <DMsNotificationPopover />

          
          <Popover open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
            <PopoverTrigger>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-md">
                    <IoMdMore size={20} />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" align="center">
                  <Typography
                    text="More actions"
                    variant="p"
                    className="text-[14px]!"
                  />
                </TooltipContent>
              </Tooltip>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="end"
              className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
              withOverlay={true}
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <div className="py-2 flex flex-col space-y-1">
                <div
                  className={MENU_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDMDetailDialog(true);
                    setMoreActionsOpen(false);
                  }}
                >
                  <Typography
                    variant="p"
                    text="Open conversation details"
                    className="text-[15px]"
                  />
                </div>
                <Separator />
                <div
                  className={cn(
                    MENU_ITEM_STYLE,
                    "relative justify-between",
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDmStar();
                    setMoreActionsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography
                      variant="p"
                      text={isStarred ? "Unstar conversation" : "Star conversation"}
                    />
                  </div>
                </div>

                {/* <div
                  className={cn(
                    MENU_ITEM_STYLE,
                    "relative justify-between",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Typography variant="p" text="Edit settings" />
                  </div>
                </div> */}

                <Separator />

                <div className={MENU_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(window.location.href)
                    toast.success("Link copied to clipboard")
                  }}
                >
                  <Typography variant="p" text="Copy link" />
                </div>
                <div className={MENU_ITEM_STYLE}
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(getDMName())
                    toast.success("Name copied to clipboard")
                  }}
                >
                  <Typography variant="p" text="Copy name" />
                </div>

                <Separator />

                <div
                  className={cn(
                    MENU_ITEM_STYLE,
                    "relative justify-between",
                  )}
                >
                  <div className="flex items-center gap-2">
                    <Typography variant="p" text="Search in conversation" />
                  </div>
                </div>
              </div>

            </PopoverContent>
          </Popover>

          {showXIcon && (
            <Button
              size="custom"
              className="p-1"
              onClick={() => {
                clearLastDmConversationId(conversation.workspaceId)
                reset()
              }}
            >
              <X size={20} />
            </Button>
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
          style={activeTab === "messages" ? { borderColor: storeTheme.selectedItems, borderBottomWidth: 3, color: storeTheme.selectedItems } : {}}
        >
          <BiMessageRounded size={16}
            style={activeTab === "messages" ? { fill: storeTheme.selectedItems } : {}}
          />
          <Typography text="Messages" variant="p" className="text-[13px]!" />
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
          style={activeTab === "files" ? { borderColor: storeTheme.selectedItems, borderBottomWidth: 3, color: storeTheme.selectedItems } : {}}
        >
          <ImFilesEmpty size={16} />
          <Typography text="Files" variant="p" className="text-[13px]!" />
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
          style={activeTab === "folders" ? { borderColor: storeTheme.selectedItems, borderBottomWidth: 3, color: storeTheme.selectedItems } : {}}
        >
          {activeTab === "folders" ? <FaRegFolderOpen size={17} /> : <FaRegFolderClosed size={16} />}
          <Typography text="Folders" variant="p" className="text-[13px]!" />
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
          style={activeTab === "pins" ? { borderColor: storeTheme.selectedItems, borderBottomWidth: 3, color: storeTheme.selectedItems } : {}}
        >
          <RiPushpinLine size={16} />
          <Typography text="Pins" variant="p" className="text-[13px]!" />
        </button>
      </div>

      <DMDetailDialog
        dmName={getDMName()}
        open={openDMDetailDialog}
        onOpenChange={setOpenDMDetailDialog}
        currentDmData={conversation}
      />
    </div>
  );
};

export default DMHeader;
