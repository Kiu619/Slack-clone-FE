"use client";

import Avatar from "@/components/avatar";

// import CreateWorkspace from '@/components/create-workspace'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { useState } from "react";
// import ProgressBar from './progress-bar'

import { FiHash, FiPlus } from "react-icons/fi";
import { GiNightSleep } from "react-icons/gi";
import { GoDot, GoDotFill } from "react-icons/go";
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
import { useRouter } from "next/navigation";
import { SetAStatusDialog } from "./dialogs/set-a-status-dialog";

const UserSidebar = ({
  userData,
  currentWorkspaceData,
}: {
  userData: User;
  currentWorkspaceData: Workspace;
}) => {
  const [open, setOpen] = useState(false);
  const { open: openProfilePanel } = useProfilePanelStore();
  const { clearUser } = useUserStore();
  const queryClient = useQueryClient();

  const [openSetAStatusDialog, setOpenSetAStatusDialog] = useState(false);

  const router = useRouter();

  const handleUpdateStatus = async () => {
    await updateProfileApi(currentWorkspaceData.id, {
      isAway: !userData?.isAway,
    });
    await queryClient.invalidateQueries({
      queryKey: authKeys.workspaceProfile(currentWorkspaceData.id),
    });
  };

  const handleClearStatus = async () => {
    await clearMemberStatusApi(currentWorkspaceData.id);
  };

  const handleSignOut = async () => {
    await signOutApi();
    clearUser();
    router.refresh();
    // router.push('/auth')
  };

  return (
    <div className="flex flex-col space-y-3 items-center mb-3">
      <div
        className={`
          bg-[rgba(139,132,132,0.3)] cursor-pointer transition-all duration-300
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
                <div className=" text-white rounded-lg">
                  <div className="px-4 py-2">
                    <Typography
                      text="Create"
                      variant="h5"
                      className="text-white font-semibold"
                    />
                  </div>

                  <div className="">
                    {/* Message */}
                    <div className="flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 bg-[#5F2568] rounded-full flex items-center justify-center">
                        <HiOutlinePencilAlt size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text="Message" variant="p" />
                        <Typography
                          text="Start a conversation in a DM or channel"
                          variant="p"
                          className="text-gray-400 text-sm"
                        />
                      </div>
                    </div>

                    {/* Channel */}
                    <div className="flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 bg-[#323538] rounded-full flex items-center justify-center">
                        <FiHash size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text="Channel" variant="p" />
                        <Typography
                          text="Start a group conversation by topic"
                          variant="p"
                          className="text-gray-400 text-sm"
                        />
                      </div>
                    </div>

                    {/* Huddle */}
                    <div className="flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 bg-[#00553D] rounded-full flex items-center justify-center">
                        <IoMdHeadset size={20} className="text-white" />
                      </div>
                      <div>
                        <Typography text="Huddle" variant="p" />
                        <Typography
                          text="Start a video or audio chat"
                          variant="p"
                          className="text-gray-400 text-sm"
                        />
                      </div>
                    </div>

                    {/* Canvas */}
                    <div className="flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 bg-[#0B4379] rounded-full flex items-center justify-center">
                        <LucideFilePlus2 size={20} className="text-white" />
                      </div>
                      <div className="flex justify-between flex-1 items-center">
                        <div>
                          <Typography text="Canvas" variant="p" />
                          <Typography
                            text="Create and share content"
                            variant="p"
                            className="text-gray-400 text-sm"
                          />
                        </div>
                        <span className="bg-[#bc80ce] text-black text-xs font-bold rounded px-1">
                          PRO
                        </span>
                      </div>
                    </div>

                    {/* List */}
                    <div className="flex items-center gap-3 py-1 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 bg-[#7C4C00] rounded-full flex items-center justify-center">
                        <BsCardChecklist size={20} className="text-white" />
                      </div>
                      <div className="flex justify-between flex-1 items-center">
                        <div>
                          <Typography text="List" variant="p" />
                          <Typography
                            text="Track and manage projects"
                            variant="p"
                            className="text-gray-400 text-sm"
                          />
                        </div>
                        <span className="bg-[#bc80ce] text-black text-xs font-bold rounded px-1">
                          PRO
                        </span>
                      </div>
                    </div>

                    {/* Separator */}
                    <hr className="border-gray-700" />

                    {/* Invite people */}
                    <div className="flex items-center gap-3 py-2 px-4 hover:bg-gray-700 cursor-pointer">
                      <div className="w-10 h-10 flex items-center justify-center">
                        <MdOutlinePersonAddAlt size={20} />
                      </div>
                      <div>
                        <Typography text="Invite people" variant="p" />
                      </div>
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
          <TooltipContent side="right" sideOffset={10}>
            <Typography text="Create new" variant="p" />
          </TooltipContent>
        </Tooltip>
      </div>
      <Tooltip>
        <div>
          <Popover>
            <PopoverTrigger>
              <TooltipTrigger asChild>
                <div className="h-9 w-9 relative cursor-pointer">
                  <div className="h-full w-full rounded-lg overflow-hidden">
                    <Avatar
                      className="object-cover w-full h-full"
                      src={
                        userData?.avatar ||
                        "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"
                      }
                      alt={userData?.name || "user"}
                    />
                    <div
                      className={cn(
                        "absolute z-10 rounded-full -right-[5%] -bottom-0.5",
                        userData?.isAway ? "bg-red-500" : "bg-green-500",
                      )}
                    >
                      {userData?.isAway ? (
                        <GoDot className="text-white text-[12px]" />
                      ) : (
                        <GoDotFill className="text-green-600" size={12} />
                      )}
                    </div>
                  </div>
                </div>
              </TooltipTrigger>
            </PopoverTrigger>
            <PopoverContent side="right" withOverlay={true} align="end">
              <div className="py-2">
                <div className="flex space-x-3 px-5 py-2">
                  <Avatar
                    src={
                      userData?.avatar ||
                      "https://a.slack-edge.com/bv1-13-br/ava_0002-72-c702398.png"
                    }
                    className="cursor-pointer w-9 h-9 rounded-lg"
                  />
                  <div className="flex flex-col">
                    <Typography
                      text={userData?.name || userData?.email || ""}
                      variant="p"
                      className="font-bold text-sm"
                    />
                    <div className="flex items-center space-x-1">
                      {userData?.isAway ? (
                        <GiNightSleep size="12" />
                      ) : (
                        <GoDotFill className="text-green-600" size="12" />
                      )}
                      <span className="text-xs">
                        {userData?.isAway ? "Away" : "Active"}
                      </span>
                    </div>
                  </div>
                </div>

                <div
                  className="border group cursor-pointer px-2 py-2 mx-5 my-2 rounded flex items-center space-x-2 hover:border hover:border-[#797c81]"
                  onClick={() => setOpenSetAStatusDialog(true)}
                >
                  {currentWorkspaceData?.statusText ? (
                    <>
                      <span
                        className="text-[#D1D2D3] truncate"
                      >
                        {currentWorkspaceData?.statusEmoji ?? ""}
                      </span>
                      <Typography
                        text={currentWorkspaceData.statusText ?? undefined}
                        variant="p"
                        className="text-sm font-medium text-[#D1D2D3] truncate"
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
                        text="Update your status"
                        variant="p"
                        className="text-sm font-medium text-[#D1D2D3]"
                      />
                    </>
                  )}
                </div>

                <div className="flex flex-col space-y-1">
                  {currentWorkspaceData?.statusText && (
                    <div
                    className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer"
                    onClick={handleClearStatus}
                  >
                    <Typography
                      variant="p"
                      text="Clear status"
                    />
                  </div>
                  )}

                  <div
                    className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer"
                    onClick={handleUpdateStatus}
                  >
                    <Typography
                      variant="p"
                      text={
                        userData?.isAway
                          ? "Set yourself as active"
                          : "Set yourself as away"
                      }
                    />
                  </div>
                  <div className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer">
                    <Typography variant="p" text="Pause notifications" />
                  </div>

                  <Separator />
                  <div
                    className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer"
                    onClick={() =>
                      openProfilePanel({
                        userData,
                        workspaceId: currentWorkspaceData.id,
                      })
                    }
                  >
                    <Typography variant="p" text="Profile" />
                  </div>
                  <div className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer">
                    <Typography variant="p" text={"Preferences"} />
                  </div>

                  <Separator />

                  <div
                    className="hover:text-white hover:bg-blue-700 px-5 py-1 rounded cursor-pointer"
                    onClick={handleSignOut}
                  >
                    <Typography
                      variant="p"
                      text={`Sign out of ${currentWorkspaceData.name || ""}`}
                    />
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        <TooltipContent side="right">
          <Typography
            text={userData?.name || userData?.email || ""}
            variant="p"
          />
        </TooltipContent>
      </Tooltip>
      <SetAStatusDialog
        open={openSetAStatusDialog}
        setOpen={setOpenSetAStatusDialog}
        userData={userData}
        workspaceId={currentWorkspaceData.id}
        statusSource="sidebar"
        currentWorkspaceData={currentWorkspaceData}
      />
    </div>
  );
};

export default UserSidebar;
