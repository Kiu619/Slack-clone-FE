/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable react-hooks/set-state-in-effect */
"use client"

import { useChannelFolderActions } from "@/contexts/channel-folder-actions"
import { formatTimestamp } from "@/helpers/format-time-stamp"
import { useDeleteAttachment, useSaveForLater } from "@/hooks/use-messages"
import { openSafeUrl } from "@/lib/open-safe-url"
import { messageKeys } from "@/lib/query-keys"
import { cn } from "@/lib/utils"
import { useFileDetailStore } from "@/stores/useFileDetailStore"
import { useUserStore } from "@/stores/useUserStore"
import { useQueryClient } from "@tanstack/react-query"
import { X } from "lucide-react"
import dynamic from "next/dynamic"
import { useEffect, useState } from "react"
import { MdMoreVert, MdOutlineCloudDownload, MdOutlineKeyboardArrowRight } from "react-icons/md"
import { RiShareForwardLine } from "react-icons/ri"
import { toast } from "sonner"
import ConfirmDeleteFileDialog from "../dialogs/confirm-delete-file-dialog"
import { ShareFileDialog } from "../dialogs/share-file-dialog"
import { Button } from "../ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Separator } from "../ui/separator"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import Typography from "../ui/typography"
import { AddToFolderSubmenu } from "./add-to-folder-submenu"
import AudioPreview from "./audio-preview"
import CodePreview from "./code-preview"
import FilePreview from "./file-preview"
import { getAttachmentPreviewKind } from "./file-utils"
import ImagePreview from "./image-preview"
import OfficeFilePreview from "./office-file-preview"
import VideoPreview from "./video-preview"

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false })

export default function FileDetailPanel() {
  const currentUser = useUserStore((state) => state.user)
  const { requestNewFolder } = useChannelFolderActions()
  const { attachment, message, close } = useFileDetailStore()
  console.log("message, attachment: ", message, attachment);
  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false)
  const [isConfirmDeleteFileDialogOpen, setIsConfirmDeleteFileDialogOpen] = useState(false);
  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false)

  const targetId = message?.channelId || message?.conversationId;

  const { mutate: deleteAttachment } = useDeleteAttachment(targetId ?? "");
  const [isDeleted, setIsDeleted] = useState(false);
  const queryClient = useQueryClient();

  const isOwner = message?.user.id === currentUser?.id

  const { mutate: saveForLater } = useSaveForLater(attachment?.workspaceId ?? "")
  

  useEffect(() => {
    if (!message || !attachment || !targetId) return;

    // Check initial state (chỉ infinite messages — không nhầm với attachments / files-search)
    const data = queryClient.getQueryData<any>(messageKeys.list(targetId));
    if (data?.pages?.length) {
      const msg = data.pages
        .flatMap((p: any) => p.messages ?? [])
        .find((m: any) => m?.id === message.id);
      // Chỉ đánh dấu xóa khi đã thấy message trong cache mà không còn attachment — tránh false positive khi mở từ Files/search (message chưa nằm trong infinite messages đã tải).
      if (msg && !msg.attachments?.find((a: any) => a.id === attachment.id)) {
        setIsDeleted(true);
      }
    }

    const channelId = message.channelId;

    // Subscribe — chỉ infinite messages: ['messages', channelId] (đúng 2 phần tử).
    // Không khớp lỏng prefix: channelAttachments & files-search cũng bắt đầu bằng 'messages' + channelId nhưng pages có `results`, không có `messages` → crash khi đọc m.id.
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey;
      if (key.length !== 2 || key[0] !== "messages" || key[1] !== channelId) {
        return;
      }

      const queryData = event.query.state.data as any;
      if (!queryData?.pages) return;

      const msg = queryData.pages
        .flatMap((p: any) => p.messages ?? [])
        .find((m: any) => m?.id === message.id);
      if (msg) {
        const att = msg.attachments?.find((a: any) => a.id === attachment.id);
        setIsDeleted(!att);
      }
      // Không set isDeleted khi không thấy msg — có thể message chưa nằm trong các trang messages đã fetch (mở file từ tab Files).
    });

    return unsubscribe;
  }, [message, attachment, queryClient, targetId]);


  const handleDownload = () => {
    openSafeUrl(attachment?.url)
  }

  const handleOpenInNewTab = () => {
    openSafeUrl(attachment?.url)
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

  const handleSaveForLater = (
    (attachmentId: string) => {
      saveForLater({ type: "attachment", attachmentId });
    }
  );

  if (!attachment) return null
  const previewKind = getAttachmentPreviewKind(attachment)
  const images = previewKind === "image"
  const videos = previewKind === "video"
  const audioFiles = previewKind === "audio"
  const officeFiles = previewKind === "office"
  const pdfFiles = previewKind === "pdf"
  const codeFiles = previewKind === "code"
  const otherFiles = previewKind === "other"

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
            variant="h4"
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

{/* TODO: Add conversation related to the file */}
        {/* <div className="flex items-center gap-2 overflow-hidden">
          <Typography
            variant="p"
            text="Conversation"
            className="text-sm"
          />
          <Separator className="" />
        </div> */}
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
                <Button variant="submenu" onClick={handleOpenInNewTab}>
                  <Typography variant="p" text="Open in new tab" />
                </Button>
                <Button variant="submenu"
                  onClick={() => {
                    handleSaveForLater(attachment.id)
                  }}
                >
                  <Typography variant="p" text="Save for later" />
                </Button>

                <Separator className="bg-[#797c814d]" />

                {/* Add to folder — code thuần, không dùng thư viện */}
                <div
                  onMouseEnter={() => setIsAddToFolderOpen(true)}
                  onMouseLeave={() => setIsAddToFolderOpen(false)}
                >
                  <Button variant="checkedMenu" className={cn("relative")}>
                    <Typography variant="p" text="Add to folder" />
                    <MdOutlineKeyboardArrowRight size={13} />
                  </Button>
                  {isAddToFolderOpen && message && targetId && (
                    <div className="absolute bottom-2 right-35 z-40 min-w-[220px] border border-[#797c814d] bg-white dark:bg-[#1A1D21] rounded-md shadow-lg">
                      <AddToFolderSubmenu
                        targetId={targetId}
                        attachmentId={attachment.id}
                        onRequestCreateFolder={requestNewFolder}
                      />
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
      <ShareFileDialog
        open={isShareFileModalOpen}
        onOpenChange={setIsShareFileModalOpen}
        attachment={attachment}
        workspaceId={attachment.workspaceId}
      />

      <ConfirmDeleteFileDialog
        open={isConfirmDeleteFileDialogOpen}
        onOpenChange={setIsConfirmDeleteFileDialogOpen}
        onConfirm={handleDelete}
      />
    </div>
  )
}
