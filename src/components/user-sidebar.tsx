"use client";

import Avatar from "@/components/avatar";

// import CreateWorkspace from '@/components/create-workspace'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { useState, useMemo } from "react";
// import ProgressBar from './progress-bar'

import { FiHash, FiPlus } from "react-icons/fi";
import { IoMdHeadset } from "react-icons/io";

import { clearMemberStatusApi, signOutApi, updateProfileApi } from "@/apis";
import { useQueryClient } from "@tanstack/react-query";
import { authKeys } from "@/lib/query-keys";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { User, Workspace } from "@/lib/types";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useUserStore } from "@/stores/useUserStore";
import { motion } from "framer-motion";
import { LucideFilePlus2 } from "lucide-react";
import { BsCardChecklist } from "react-icons/bs";
import { FaRegSmile, FaSmile } from "react-icons/fa";
import { HiOutlinePencilAlt } from "react-icons/hi";
import { MdOutlinePersonAddAlt } from "react-icons/md";
import { Separator } from "./ui/separator";
import { usePathname, useRouter } from "next/navigation";
import { SetAStatusDialog } from "./dialogs/set-a-status-dialog";
import { usePreferencesStore } from "@/stores/usePreferencesStore";
import { useNewMessageStore } from "@/stores/useNewMessageStore";
import { forceLightTheme } from "@/lib/theme-utils";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";
import { useAppTranslation } from "@/hooks/use-translation";

const UserSidebar = ({
  userData,
  currentWorkspaceData,
}: {
  userData: User;
  currentWorkspaceData: Workspace;
}) => {
  const t = useAppTranslation("userSidebar");
  const [open, setOpen] = useState(false);
  const [openAvatarPopover, setOpenAvatarPopover] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const isDMsPage = pathname.includes('/dms');

  const { openNewMessage: openNewMessageComposer } = useNewMessageStore();
  const { open: openProfilePanel } = useProfilePanelStore();
  const { open: openPreferences } = usePreferencesStore();
  const { clearUser } = useUserStore();
  const queryClient = useQueryClient();

  const [openSetAStatusDialog, setOpenSetAStatusDialog] = useState(false);

  const memberOverlay = useWorkspaceMemberOverlay(
    currentWorkspaceData.id,
    userData.id,
  );
  const displayUser = useMemo(
    () => mergeUserForDisplay(userData, memberOverlay),
    [userData, memberOverlay],
  );

  const handleUpdateStatus = async () => {
    setOpenAvatarPopover(false)
    await updateProfileApi(currentWorkspaceData.id, {
      isAway: !displayUser.isAway,
    });
    await queryClient.invalidateQueries({
      queryKey: authKeys.workspaceProfile(currentWorkspaceData.id),
    });
    if (userData?.id) {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-member-status", currentWorkspaceData.id, userData.id],
      });
    }
  };

  const handleClearStatus = async () => {
    setOpenAvatarPopover(false)
    await clearMemberStatusApi(currentWorkspaceData.id);
    await queryClient.invalidateQueries({
      queryKey: authKeys.workspaceProfile(currentWorkspaceData.id),
    });
    if (userData?.id) {
      await queryClient.invalidateQueries({
        queryKey: ["workspace-member-status", currentWorkspaceData.id, userData.id],
      });
    }
  };

  const handleSignOut = async () => {
    await signOutApi();
    forceLightTheme();
    clearUser();
    router.replace('/auth');
  };

  return (
    <div className="flex flex-col space-y-3 items-center mb-3">
      <div
        className={`
          bg-[rgba(255,255,255,0.3)] cursor-pointer transition-all duration-300
          hover:scale-110 text-white grid place-content-center rounded-full w-9 h-9
          `}
      >
        <Tooltip>
          <div className="">
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <TooltipTrigger asChild>
                  <motion.div
                    animate={{
                      rotate: open ? 45 : 0,
                    }}
                    transition={{
                      type: "spring",
                      stiffness: 300,
                      damping: 10,
                      mass: 1,
                    }}
                    className="flex items-center justify-center"
                  >
                    <FiPlus size={26} />
                  </motion.div>
                </TooltipTrigger>
              </PopoverTrigger>

              <PopoverContent
                side="right"
                className="w-90 p-0 mb-2"
                sideOffset={20}
                align="center"
                withOverlay={true}
              >
                <div className=" rounded-lg">
                  <div className="px-4 py-2">
                    <Typography
                      text={t("create")}
                      variant="p"
                      className="text-left font-bold"
                    />
                  </div>

                  <div className="">
                    {/* Message */}
                    <button className="flex w-full items-center gap-3 py-1 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none"
                      type="button"
                      onClick={() => {
                        if (isDMsPage) {
                          openNewMessageComposer();
                        } else {
                          router.push(`/workspace/${currentWorkspaceData.id}/`)
                          openNewMessageComposer()
                        }
                      }}
                    >
                      <div className="w-10 h-10 bg-[#5F2568] rounded-full flex items-center justify-center">
                        <HiOutlinePencilAlt size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text={t("message")} variant="p" className="text-left font-semibold" />
                        <Typography
                          text={t("messageDescription")}
                          variant="p"
                          className="text-gray-400 text-xs"
                        />
                      </div>
                    </button>

                    {/* Channel */}
                    <button className="flex w-full items-center gap-3 py-1 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none">
                      <div className="w-10 h-10 bg-[#323538] rounded-full flex items-center justify-center">
                        <FiHash size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text={t("channel")} variant="p" className="text-left font-semibold" />
                        <Typography
                          text={t("channelDescription")}
                          variant="p"
                          className="text-gray-400 text-xs"
                        />
                      </div>
                    </button>

                    {/* Huddle */}
                    <button className="flex w-full items-center gap-3 py-1 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none">
                      <div className="w-10 h-10 bg-[#00553D] rounded-full flex items-center justify-center">
                        <IoMdHeadset size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text={t("huddle")} variant="p" className="text-left font-semibold" />
                        <Typography
                          text={t("huddleDescription")}
                          variant="p"
                          className="text-gray-400 text-xs"
                        />
                      </div>
                    </button>

                    {/* Canvas */}
                    <button className="flex w-full items-center gap-3 py-1 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none">
                      <div className="w-10 h-10 bg-[#0B4379] rounded-full flex items-center justify-center">
                        <LucideFilePlus2 size={20} className="text-white" />
                      </div>
                      <div className="flex justify-between flex-1 items-center">
                        <div>
                          <Typography text={t("canvas")} variant="p" className="text-left font-semibold" />
                          <Typography
                            text={t("canvasDescription")}
                            variant="p"
                            className="text-gray-400 text-xs"
                          />
                        </div>
                        <span className="bg-[#bc80ce] text-black text-xs font-bold rounded px-1">
                          PRO
                        </span>
                      </div>
                    </button>

                    {/* List */}
                    <button className="flex w-full items-center gap-3 py-1 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none">
                      <div className="w-10 h-10 bg-[#7C4C00] rounded-full flex items-center justify-center">
                        <BsCardChecklist size={20} className="text-white" />
                      </div>
                      <div className="flex justify-between flex-1 items-center">
                        <div>
                          <Typography text={t("list")} variant="p" className="text-left font-semibold" />
                          <Typography
                            text={t("listDescription")}
                            variant="p"
                            className="text-gray-400 text-xs"
                          />
                        </div>
                        <span className="bg-[#bc80ce] text-black text-xs font-bold rounded px-1">
                          PRO
                        </span>
                      </div>
                    </button>

                    {/* Separator */}
                    <hr className="border-gray-700" />

                    {/* Invite people */}
                    <button className="flex w-full items-center gap-3 py-2 px-4 hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] border-none outline-none">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <MdOutlinePersonAddAlt size={20} />
                      </div>
                      <div>
                        <Typography text={t("invitePeople")} variant="p" className="text-left font-semibold" />
                      </div>
                    </button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <TooltipContent side="right" sideOffset={10}>
            <Typography text={t("createNewTooltip")} variant="p" />
          </TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <div>
          <Popover open={openAvatarPopover} onOpenChange={setOpenAvatarPopover} >
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <div className="h-9 w-9 relative cursor-pointer">
                  <div className="h-full w-full rounded-lg overflow-hidden">
                    <Avatar
                      className="object-cover w-full h-full"
                      src={
                        displayUser.avatar ||
                        "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"
                      }
                      alt={displayUser.displayName || "user"}
                    />
                    <div className="absolute z-10 -right-[10%] -bottom-2">
                      <UserPresenceIndicator
                        workspaceId={currentWorkspaceData.id}
                        userId={displayUser.id}
                        isAway={displayUser.isAway}
                        size="md"
                      />
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
            </PopoverTrigger>
            <PopoverContent side="right" withOverlay={true} align="end" alignOffset={-2} sideOffset={10}>
              <div className="py-2">
                <div className="flex space-x-3 px-5 py-2">
                  <Avatar
                    src={
                      displayUser.avatar ||
                      "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"
                    }
                    className="cursor-pointer w-9 h-9 rounded-lg"
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-1">
                      <Typography
                        text={displayUser.name || displayUser.email || ""}
                        variant="p"
                        className="min-w-0 flex-1 truncate font-bold text-sm"
                      />
                      <UserStatusEmojiInline
                        statusEmoji={displayUser.statusEmoji}
                        statusText={displayUser.statusText}
                        emojiClassName="text-[14px]"
                        interactive={Boolean(displayUser.statusText?.trim())}
                      />
                    </div>
                    <UserPresenceIndicator
                      workspaceId={currentWorkspaceData.id}
                      userId={displayUser.id}
                      isAway={displayUser.isAway}
                      showLabel
                    />
                  </div>
                </div>

                <div
                  className="border group cursor-pointer px-2 py-2 mx-5 my-2 rounded flex items-center space-x-2 hover:border hover:border-[#797c81]"
                  onClick={() => setOpenSetAStatusDialog(true)}
                >
                  {displayUser.statusText ? (
                    <>
                      <span
                        className="dark:text-[#d1d2d3] truncate"
                      >
                        {displayUser.statusEmoji ?? ""}
                      </span>
                      <Typography
                        text={displayUser.statusText ?? undefined}
                        variant="p"
                        className="text-sm font-medium dark:text-[#d1d2d3] truncate"
                      />
                    </>
                  ) : (
                    <>
                      <FaRegSmile
                        size={18}
                        className="group-hover:hidden font-bold"
                      />
                      <FaSmile
                        size={18}
                        className="hidden group-hover:block text-yellow-500 font-bold"
                      />
                      <Typography
                        text={t("updateYourStatus")}
                        variant="p"
                        className="text-sm font-medium dark:text-[#d1d2d3]"
                      />
                    </>
                  )}
                </div>

                <div className="flex flex-col space-y-1">
                  {displayUser.statusText && (
                    <div
                      className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                      onClick={handleClearStatus}
                    >
                      <Typography
                        variant="p"
                        text={t("clearStatus")}
                      />
                    </div>
                  )}

                  <div
                    className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                    onClick={handleUpdateStatus}
                  >
                    <Typography
                      variant="p"
                      text={
                        displayUser.isAway
                          ? t("setAsActive")
                          : t("setAsAway")
                      }
                    />
                  </div>
                  <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                    <Typography variant="p" text={t("pauseNotifications")} />
                  </div>

                  <Separator />
                  <div
                    className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                    onClick={() => {
                      openProfilePanel({
                        userData: displayUser,
                        workspaceId: currentWorkspaceData.id,
                      })
                      setOpenAvatarPopover(false)
                    }}
                  >
                    <Typography variant="p" text={t("profile")} />
                  </div>
                  <div
                    className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                    onClick={() => {
                      openPreferences()
                      setOpenAvatarPopover(false)
                    }}
                  >
                    <Typography variant="p" text={t("preferences")} />
                  </div>

                  <Separator />

                  <div
                    className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <Typography
                      variant="p"
                      text={t("signOut", {
                        workspaceName: currentWorkspaceData.name || "",
                      })}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <TooltipContent side="right">
          <Typography
            text={displayUser.name || displayUser.email || ""}
            variant="p"
          />
        </TooltipContent>
      </Tooltip>
      <SetAStatusDialog
        open={openSetAStatusDialog}
        setOpen={setOpenSetAStatusDialog}
        userData={displayUser}
        workspaceId={currentWorkspaceData.id}
        statusSource="sidebar"
        currentWorkspaceData={currentWorkspaceData}
      />
    </div>
  );
};

export default UserSidebar;
