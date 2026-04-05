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
import AudioPreview from "./audio-preview"
import { useDeleteAttachment } from "@/hooks/use-messages"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"
import { messageKeys } from "@/lib/query-keys"
import ConfirmDeleteFileDialog from "../dialogs/confirm-delete-file-dialog"
import { useUserStore } from "@/stores/useUserStore"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

const MENU_ITEM_STYLE =
  "hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm"
const SUBMENU_ITEM_STYLE =
  "hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm"

export default function FileDetailPanel() {
  const currentUser = useUserStore((state) => state.user)
  const { attachment, message, close } = useFileDetailStore()
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false)
  const [isConfirmDeleteFileDialogOpen, setIsConfirmDeleteFileDialogOpen] = useState(false);
  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false)

  const { mutate: deleteAttachment } = useDeleteAttachment(message?.channelId ?? "");
  const [isDeleted, setIsDeleted] = useState(false);
  const queryClient = useQueryClient();

  const isOwner = message?.user.id === currentUser?.id

  useEffect(() => {
    if (!message || !attachment) return;

    // Check initial state
    const data = queryClient.getQueryData<any>(messageKeys.list(message.channelId));
    if (data) {
      const msg = data.pages?.flatMap((p: any) => p.messages).find((m: any) => m.id === message.id);
      if (!msg || !msg.attachments.find((a: any) => a.id === attachment.id)) {
        setIsDeleted(true);
      }
    }

    // Subscribe to real-time cache updates
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.query.queryKey[0] === "messages" &&
        event.query.queryKey[1] === message.channelId
      ) {
        const queryData = event.query.state.data as any;
        if (!queryData) return;

        const msg = queryData.pages?.flatMap((p: any) => p.messages).find((m: any) => m.id === message.id);
        if (!msg) {
          setIsDeleted(true);
        } else {
          const att = msg.attachments.find((a: any) => a.id === attachment.id);
          if (!att) setIsDeleted(true);
        }
      }
    });

    return unsubscribe;
  }, [message, attachment, queryClient]);


  const handleDownload = () => {
    window.open(attachment?.url ?? "", "_blank")
  }

  const handleOpenInNewTab = () => {
    window.open(attachment?.url ?? "", "_blank")
  }

  const handleDelete = () => {
    if (!attachment) return;
    deleteAttachment(attachment.id, {
      onSuccess: () => {
        toast.success("File deleted successfully");
      },
      onError: () => {
        toast.error("Failed to delete file. You might not have permission.");
      }
    });
  }

  if (!attachment) return null
  // Group theo type
  const images = attachment?.type === "image"
  const videos = attachment?.type === "video"
  const audioFiles = attachment?.type === "audio"
  const officeFiles = isOfficeFile(attachment.name)
  const pdfFiles = isPdfFile(attachment.name, attachment.mimeType)
  const codeFiles =
    !isOfficeFile(attachment.name) &&
    !isPdfFile(attachment.name, attachment.mimeType) &&
    isCodeOrTextFile(attachment.name, attachment.mimeType)
  const otherFiles =
    !isOfficeFile(attachment.name) &&
    !isPdfFile(attachment.name, attachment.mimeType) &&
    !isCodeOrTextFile(attachment.name, attachment.mimeType) &&
    !images &&
    !videos &&
    !audioFiles

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21] dark:text-[#d1d2d3] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#797c814d] shrink-0">
        <span className="font-semibold text-[15px]">File</span>
        <button
          onClick={close}
          className="p-1 rounded text-[#797c81] transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* Body — scrollable */}
      {isDeleted === false ? (<div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
        {/* File name */}
        <div>
          <Typography
            variant="large"
            text={attachment.name}
            className="font-semibold break-all leading-snug"
          />
        </div>

        <div className="">
          <Typography
            variant="p"
            text={`Owned by ${message?.user?.name}`}
            className="font-semibold"
          />
          <Typography
            variant="p"
            text={`Uploaded on ${formatTimestamp(message?.createdAt ?? "")}`}
            className="font-semibold"
          />
        </div>

        {audioFiles && (
          <AudioPreview
            attachment={attachment}
            message={message!}
          />
        )}

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
      ) : (
        <div className="flex flex-col w-full justify-center items-center gap-2 mt-2">
          <Typography variant="h3" className="font-bold text-lg" text="Attachment was deleted" />
          <Typography variant="p" className="text-sm text-[#797c81] text-center px-8"
            text="This file is no longer available because it has been deleted." />
        </div>
      )}

      {/* Footer */}
      {isDeleted === false && (<div className="flex items-center justify-between px-4 py-3 border-t border-[#797c814d] shrink-0 gap-2">
        <button
          className="flex flex-1 items-center gap-2 p-1 text-[#797c81] rounded border border-[#797c814d]"
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
              className="cursor-pointer p-1 rounded dark:hover:bg-[#222529] hover:bg-[#e8e8e8] text-[#797c81] transition-colors border border-[#797c814d]"
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
                  className="cursor-pointer p-1 rounded dark:hover:bg-[#222529] hover:bg-[#e8e8e8] text-[#797c81] transition-colors"
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
            className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
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
                    <div className="absolute bottom-2 right-35 w-full border border-[#797c814d] bg-white dark:bg-[#1A1D21] rounded-md py-2 shadow-lg">
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
                {isOwner && (
                  <div
                    className="text-red-500 hover:text-white hover:bg-red-700 px-5 py-1 rounded cursor-pointer transition-colors"
                    onClick={handleDelete}
                  >
                    <Typography variant="p" text="Delete file" />
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      )}
      <ShareFileModal
        open={isShareFileModalOpen}
        onOpenChange={setIsShareFileModalOpen}
        attachment={attachment}
      />

      <ConfirmDeleteFileDialog
        open={isConfirmDeleteFileDialogOpen}
        onOpenChange={setIsConfirmDeleteFileDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
