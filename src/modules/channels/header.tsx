"use client";

import Typography from "@/components/ui/typography";
import { Channel } from "@/lib/types";
import { FiHash, FiPlus } from "react-icons/fi";
import { RiHeadphoneLine } from "react-icons/ri";
import { motion } from "framer-motion";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IoMdMore } from "react-icons/io";
import { IoChevronDownOutline, IoPersonOutline, IoSettingsOutline } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import { SlStar } from "react-icons/sl";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useState } from "react";
import { BiMessageRounded } from "react-icons/bi";
import { ImFilesEmpty } from "react-icons/im";
import { Separator } from "@/components/ui/separator";
import { BsCardChecklist } from "react-icons/bs";
import { FaRegFolderClosed } from "react-icons/fa6";
import { LuSquareChartGantt } from "react-icons/lu";
import { CreateFolderDialog } from "@/components/dialogs/create-folder-dialog";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";

export type ChannelViewTab = "messages" | "files";

const Header = ({
  currentChannelData,
  activeTab,
  onTabChange,
}: {
  currentChannelData: Channel;
  activeTab: ChannelViewTab;
  onTabChange: (tab: ChannelViewTab) => void;
}) => {
  const [open, setOpen] = useState(false);
  const [openCreateFolderDialog, setOpenCreateFolderDialog] = useState(false);

  const { theme: storeTheme } = useThemeStore()
  return (
    <div className="flex flex-col border-b border-[#797c814d]">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <SlStar size={18} className="text-workspace-side-panel-text" />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button className="flex items-center gap-1 cursor-pointer hover:bg-[#222529] px-2 py-1 rounded-md">
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
                text="Get channel details"
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
                  text="Members"
                  variant="p"
                  className="text-[13px]!"
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <Typography
                text="View all members of this channel"
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>

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

          <Tooltip>
            <TooltipTrigger asChild>
              <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-md">
                <IoMdMore size={20} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" align="center">
              <Typography
                text="More actions"
                variant="p"
                className="text-[14px]!"
              />
            </TooltipContent>
          </Tooltip>
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

        <Tooltip>
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
                  className="cursor-pointer flex items-center justify-center p-1 rounded-full dark:hover:bg-[#222529] dark:text-[#797c81] dark:hover:text-white hover:bg-[#e8e8e8] hover:text-black"
                >
                  <FiPlus size={16} />
                </motion.div>
              </TooltipTrigger>
            </PopoverTrigger>

            <PopoverContent side="bottom" align="start" withOverlay={true}>
              <div className="flex flex-col py-2">
                <div className="flex items-center gap-x-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                  onClick={() => {
                    setOpenCreateFolderDialog(true)
                    setOpen(false)
                  }}
                >
                  <FaRegFolderClosed size={16} />
                  <Typography
                    text="Folder"
                    variant="p"
                  />
                </div>
                <div className="flex items-center gap-x-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                  <LuSquareChartGantt size={16} />
                  <Typography
                    text="Canvas"
                    variant="p"
                  />
                </div>
                <div className="flex items-center gap-x-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                  <BsCardChecklist size={16} />
                  <Typography
                    text="List"
                    variant="p"
                  />
                </div>
                <Separator />
                <div className="flex items-center gap-x-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer">
                  <IoSettingsOutline size={16} />
                  <Typography
                    text="Customize tabs"
                    variant="p"
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <TooltipContent side="top" align="center">
            <Typography
              text="Add new tab"
              variant="p"
              className="text-[14px]!"
            />
          </TooltipContent>
        </Tooltip>
      </div>

      <CreateFolderDialog open={openCreateFolderDialog} setOpen={setOpenCreateFolderDialog} channelId={currentChannelData.id} />
    </div>
  );
};

export default Header;
