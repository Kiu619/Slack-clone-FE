"use client"

import dynamic from "next/dynamic"
import { formatTimestamp } from "@/helpers/format-time-stamp"
import { useFileDetailStore } from "@/stores/useFileDetailStore"
import { X } from "lucide-react"
import { useState } from "react"
import { MdMoreVert, MdOutlineCloudDownload } from "react-icons/md"
import { RiShareForwardLine } from "react-icons/ri"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Separator } from "../ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import Typography from "../ui/typography"
import CodePreview from "./code-preview"
import FilePreview from "./file-preview"
import { isCodeOrTextFile, isOfficeFile, isPdfFile } from "./file-utils"
import ImagePreview from "./image-preview"
import OfficeFilePreview from "./office-file-preview"
import { ShareFileModal } from "./share-file-modal"
import VideoPreview from "./video-preview"
import { cn } from "@/lib/utils"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

const MENU_ITEM_STYLE =
  "hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer text-sm"
const SUBMENU_ITEM_STYLE =
  "hover:text-white hover:bg-blue-700 px-5 py-1 cursor-pointer text-sm"

export default function FileDetailPanel() {
  const { attachment, message, close } = useFileDetailStore()
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false)
  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false)

  const handleDownload = () => {
    window.open(attachment?.url ?? "", "_blank")
  }

  const handleOpenInNewTab = () => {
    window.open(attachment?.url ?? "", "_blank")
  }

  if (!attachment) return null
  // Group theo type
  const images = attachment?.type === "image"
  const videos = attachment?.type === "video"
  const officeFiles = isOfficeFile(attachment.name)
  const pdfFiles = isPdfFile(attachment.name, attachment.mimeType)
  const codeFiles =
    !isOfficeFile(attachment.name) &&
    !isPdfFile(attachment.name, attachment.mimeType) &&
    isCodeOrTextFile(attachment.name, attachment.mimeType)
  const otherFiles =
    !isOfficeFile(attachment.name) &&
    !isPdfFile(attachment.name, attachment.mimeType) &&
    !isCodeOrTextFile(attachment.name, attachment.mimeType)

  return (
    <div className="flex flex-col h-full bg-[#1A1D21] text-[#d1d2d3] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#797c814d] shrink-0">
        <span className="font-semibold text-white text-[15px]">File</span>
        <button
          onClick={close}
          className="p-1 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body — scrollable */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* File name */}
        <div>
          <p className="text-white font-semibold text-[15px] break-all leading-snug">
            {attachment.name}
          </p>
        </div>

        <div className="">
          <Typography
            variant="p"
            text={`Owned by ${message?.user?.name}`}
            className="text-[15px] font-semibold text-white"
          />
          <Typography
            variant="p"
            text={`Uploaded on ${formatTimestamp(message?.createdAt ?? "")}`}
            className="text-[15px] font-semibold text-white"
          />
        </div>

        {images && (
          <ImagePreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}
        {videos && (
          <VideoPreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}
        {officeFiles && (
          <OfficeFilePreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}
        {pdfFiles && (
          <PdfPreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}
        {codeFiles && (
          <CodePreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}
        {otherFiles && (
          <FilePreview
            attachment={attachment}
            message={message!}
            formDetailPanel={true}
          />
        )}

        <div className="flex items-center gap-2 overflow-hidden">
          <Typography
            variant="p"
            text="Conversation"
            className="text-sm"
          />
          <Separator className="" />
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-[#797c814d] shrink-0 gap-2">
        <button
          className="flex flex-1 items-center gap-2 p-1 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors cursor-pointer border border-[#797c814d]"
          onClick={() => setIsShareFileModalOpen(true)}
        >
          <RiShareForwardLine size={20} />
          <Typography
            variant="p"
            text="Share file"
            className="text-sm"
          />
        </button>

        <Tooltip>
          <TooltipTrigger asChild>
            <p
              className="cursor-pointer p-1 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors border border-[#797c814d]"
              onClick={(e) => {
                e.stopPropagation()
                handleDownload()
              }}
            >
              <MdOutlineCloudDownload size={20} />
            </p>
          </TooltipTrigger>
          <TooltipContent side="top">
            <p className="text-xs">Download</p>
          </TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <p
                  className="cursor-pointer p-1 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MdMoreVert size={20} />
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
            className="w-auto border-[#797c814d] bg-[#1a1d21]"
            withOverlay={true}
            onOpenAutoFocus={(e) => e.preventDefault()}
          >
            <div className="py-2">
              <div className="flex flex-col space-y-1">
                <div className={MENU_ITEM_STYLE} onClick={handleOpenInNewTab}>
                  <Typography variant="p" text="Open in new tab" />
                </div>
                <div className={MENU_ITEM_STYLE}>
                  <Typography variant="p" text="Save for later" />
                </div>

                <Separator className="bg-[#797c814d]" />

                {/* Add to folder — code thuần, không dùng thư viện */}
                <div
                  onMouseEnter={() => setIsAddToFolderOpen(true)}
                  onMouseLeave={() => setIsAddToFolderOpen(false)}
                >
                  <div className={cn(MENU_ITEM_STYLE, "relative")}>
                    <Typography variant="p" text="Add to folder" />
                  </div>
                  {isAddToFolderOpen && (
                    <div className="absolute bottom-2 right-35 w-full border border-[#797c814d] bg-[#1a1d21] rounded-md py-2 shadow-lg">
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

                <Separator className="bg-[#797c814d]" />
                <div className="text-red-500 hover:text-white hover:bg-red-700 px-5 py-1 rounded cursor-pointer">
                  <Typography variant="p" text="Delete file" />
                </div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <ShareFileModal
        open={isShareFileModalOpen}
        onOpenChange={setIsShareFileModalOpen}
        attachment={attachment}
      />
    </div>
  )
}
