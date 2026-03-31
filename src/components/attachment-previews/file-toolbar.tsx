"use client"

import { MdMoreVert, MdOutlineCloudDownload } from "react-icons/md";
import { RiInformationLine, RiShareForwardLine } from "react-icons/ri";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import Typography from "../ui/typography";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Message, MessageAttachment } from "@/lib/types";
import { ShareFileModal } from "./share-file-modal";
import { useFileDetailStore } from "@/stores/useFileDetailStore";

interface Props {
  isHovered: boolean
  attachment: MessageAttachment
  message: Message
  onDownload?: () => void
  onOpen?: () => void
}

const MENU_ITEM_STYLE =
  "hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm"
const SUBMENU_ITEM_STYLE =
  "hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm"
const TOOLBAR_ITEM_STYLE = "cursor-pointer p-1.5 rounded dark:hover:bg-[#222529] text-[#797c81]"
const ICON_TRANSITION = "hover:scale-115 transition-all duration-300"

const FileToolbar = ({ isHovered, attachment, message, onDownload, onOpen }: Props) => {

  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false)
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState<boolean>(false);
  const openFileDetail = useFileDetailStore((s) => s.open);

  return (
    <div
      className={cn(
        "absolute top-0 right-0 translate-y-1/4 -translate-x-[10px] flex items-center gap-0.5 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10 transition-opacity duration-300",
        isHovered ? "flex" : "hidden",
      )}
    >
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={TOOLBAR_ITEM_STYLE}
            onClick={(e) => {
              e.stopPropagation()
              onDownload?.()
            }}
          >
            <MdOutlineCloudDownload size={20}
              className={ICON_TRANSITION}
            />
          </p>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Download</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          <p className={TOOLBAR_ITEM_STYLE}
            onClick={(e) => {
              e.stopPropagation()
              setIsShareFileModalOpen(true);
            }}
          >
            <RiShareForwardLine size={20}
              className={ICON_TRANSITION}
            />
          </p>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">Share file</p>
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild
        >
          <p className={TOOLBAR_ITEM_STYLE}
            onClick={(e) => {
              e.stopPropagation()
              openFileDetail({ attachment, message })
            }}
          >
            <RiInformationLine size={20}
              className={ICON_TRANSITION}
            />
          </p>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">View file details</p>
        </TooltipContent>
      </Tooltip>
      <Popover>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <p className={TOOLBAR_ITEM_STYLE}
                onClick={(e) => {
                  e.stopPropagation()
                  // onMoreActions?.()
                }}
              >
                <MdMoreVert size={20}
                  className={ICON_TRANSITION}
                />
              </p>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">More actions</p>
          </TooltipContent>
        </Tooltip>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={8}
          className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
          withOverlay={true}
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <div className="py-2 ">
            <div className="flex flex-col space-y-1">
              <div className="hover:text-white hover:bg-selection-hover px-5 py-1 rounded cursor-pointer">
                <Typography variant="p" text="Open in new tab" onClick={onOpen} />
              </div>
              <div className="hover:text-white hover:bg-selection-hover px-5 py-1 rounded cursor-pointer">
                <Typography variant="p" text="Save for later" />
              </div>

              <Separator />

              <div
                onMouseEnter={() => setIsAddToFolderOpen(true)}
                onMouseLeave={() => setIsAddToFolderOpen(false)}
              >
                <div className={cn(MENU_ITEM_STYLE, "relative")}>
                  <Typography variant="p" text="Add to folder" />
                </div>
                {isAddToFolderOpen && (
                  <div className="absolute bottom-2 right-40 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] rounded-md py-2 shadow-lg">
                    <div className={SUBMENU_ITEM_STYLE}>
                      <Typography variant="p" text="Folder 1" />
                    </div>
                    <Separator className="my-1 bg-[#797c814d]" />
                    <div className={SUBMENU_ITEM_STYLE}>
                      <Typography variant="p" text="Add new folder" />
                    </div>
                  </div>
                )}
              </div>

              <Separator />
              <Typography
                variant="p"
                text="Delete file"
                className="text-red-500 hover:text-white hover:bg-red-700 px-5 py-1 rounded cursor-pointer"
              />
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Share file modal */}
      <ShareFileModal
        open={isShareFileModalOpen}
        onOpenChange={setIsShareFileModalOpen}
        attachment={attachment}
      />
    </div>
  );
};

export default FileToolbar;
