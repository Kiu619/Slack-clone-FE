"use client";

import Typography from "@/components/ui/typography";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import type { DirectMessageConversation, User } from "@/lib/types";
import { RiPushpinLine } from "react-icons/ri";

import DMsNotificationPopover from "@/components/popovers/dm-notification-popover";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";
import { useAuth } from "@/hooks/use-auth";
import { useStarConversation } from "@/hooks/use-conversation";
import { useAppTranslation } from "@/hooks/use-translation";
import { clearLastDmConversationId } from "@/lib/last-dm-storage";
import { getDmDisplayName, isDeactivatedUser } from "@/lib/dm-members";
import { cn } from "@/lib/utils";
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useThemeStore } from "@/stores/useThemeStore";
import { HuddleHeaderBadge } from "@/modules/huddle/huddle-header-badge";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { X } from "lucide-react";
import { useMemo, useState } from "react";
import { BiMessageRounded } from "react-icons/bi";
import { FaRegFolderOpen } from "react-icons/fa";
import { FaRegFolderClosed, FaStar } from "react-icons/fa6";
import { ImFilesEmpty } from "react-icons/im";
import { IoMdMore } from "react-icons/io";
import { IoChevronDownOutline } from "react-icons/io5";
import { SlStar } from "react-icons/sl";
import { toast } from "sonner";
import { useShallow } from "zustand/react/shallow";
import DMDetailDialog from "./dm-details/dm-detail-dialog";

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
  const t = useAppTranslation("directMessages");
  const openGlobalSearch = useGlobalSearchStore((state) => state.openSearch);
  const armSuppressNextClose = useGlobalSearchStore((state) => state.armSuppressNextClose);
  const setInChannelIds = useGlobalSearchStore((state) => state.setInChannelIds);
  const setInConversationIds = useGlobalSearchStore((state) => state.setInConversationIds);
  const resetGlobalSearch = useGlobalSearchStore((state) => state.resetSearch);
  const [openDMDetailDialog, setOpenDMDetailDialog] = useState(false);
  const [moreActionsOpen, setMoreActionsOpen] = useState(false);
  const isArchivedDm = !!conversation.isArchivedBecausePeerDeactivated;
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

  const getDMName = () => {
    return getDmDisplayName(
      conversation.members,
      currentUser?.id,
      (member) => mergeUserForDisplay(member as User, memberOverlayMap[member.id]),
    );
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
      const display = mergeUserForDisplay(m, memberOverlayMap[m.id]);
      return isDeactivatedUser(display) ? null : display;
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
                disabled={isArchivedDm || starMutation.isPending}
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
                text={isStarred ? t("unstarDm") : t("starDm")}
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
                    <>
                      <UserPresenceIndicator
                        workspaceId={conversation.workspaceId}
                        userId={headerStatusUser.id}
                        isAway={headerStatusUser.isAway}
                        className="ml-1"
                      />
                      <UserStatusEmojiInline
                        statusEmoji={headerStatusUser.statusEmoji}
                        statusText={headerStatusUser.statusText}
                        emojiClassName="text-[16px]"
                        interactive={Boolean(
                          headerStatusUser.statusText?.trim(),
                        )}
                      />
                    </>
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
                text={t("viewConversationDetails")}
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
        </div>

        <div className="flex items-center gap-1">
          <HuddleHeaderBadge
            workspaceId={conversation.workspaceId}
            entityType="dm"
            entityId={conversation.id}
            label={getDMName()}
            canInteract={!isArchivedDm}
          />

          {!isArchivedDm ? (
            <DMsNotificationPopover
              workspaceId={conversation.workspaceId}
              conversationId={conversation.id}
            />
          ) : null}


          <Popover open={moreActionsOpen} onOpenChange={setMoreActionsOpen}>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button
                    className={cn(
                      "cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-md",
                      isArchivedDm && "opacity-50 pointer-events-none",
                    )}
                  >
                    <IoMdMore size={20} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <Typography
                  text={t("moreActions")}
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
                    setOpenDMDetailDialog(true);
                    setMoreActionsOpen(false);
                  }}
                >
                  <Typography
                    variant="p"
                    text={t("openConversationDetails")}
                    className="text-[15px]"
                  />
                </Button>
                <Separator />
                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleDmStar();
                    setMoreActionsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography
                      variant="p"
                      text={isStarred ? t("unstarConversation") : t("starConversation")}
                    />
                  </div>
                </Button>

                <Separator />

                <Button variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(window.location.href)
                    toast.success(t("linkCopiedToClipboard"))
                  }}
                >
                  <Typography variant="p" text={t("copyLink")} />
                </Button>
                <Button variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation()
                    navigator.clipboard.writeText(getDMName())
                    toast.success(t("nameCopiedToClipboard"))
                  }}
                >
                  <Typography variant="p" text={t("copyName")} />
                </Button>

                <Separator />

                <Button variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetGlobalSearch();
                    setInConversationIds([conversation.id]);
                    setInChannelIds([]);
                    setMoreActionsOpen(false);
                    setTimeout(() => {
                      armSuppressNextClose();
                      openGlobalSearch();
                    }, 0);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <Typography variant="p" text={t("searchInConversation")} />
                  </div>
                </Button>
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
          <Typography text={t("messages")} variant="p" className="text-[13px]!" />
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
          <Typography text={t("files")} variant="p" className="text-[13px]!" />
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
          <Typography text={t("folders")} variant="p" className="text-[13px]!" />
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
          <Typography text={t("pins")} variant="p" className="text-[13px]!" />
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
