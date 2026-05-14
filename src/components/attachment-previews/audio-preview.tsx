'use client'

import { useState, useRef, useEffect } from 'react'
import { LuPlay, LuPause, LuX } from 'react-icons/lu'
import { Message, MessageAttachment } from '@/lib/types'
import WaveSurfer from 'wavesurfer.js'
import { MdMoreVert, MdOutlineKeyboardArrowRight } from 'react-icons/md'
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover"
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip"
import Typography from "../ui/typography"
import { cn } from "@/lib/utils"
import { Separator } from '../ui/separator'
import { useFileDetailStore } from '@/stores/useFileDetailStore'
import { ShareFileDialog } from '../dialogs/share-file-dialog'
import { AddToFolderSubmenu } from './add-to-folder-submenu'
import { useChannelFolderActions } from '@/contexts/channel-folder-actions'

import { useTrackAttachmentView } from '@/hooks/use-attachments'
import { useSaveForLater } from '@/hooks/use-messages'
import { MENU_ITEM_STYLE } from '@/constants/styles'

interface AudioPreviewProps {
  message?: Message
  attachment?: MessageAttachment
  fileUrl?: string
  initialDuration?: number
  onDownload?: (url: string, name: string) => void
  onRemove?: () => void
}

export default function AudioPreview({
  message,
  attachment,
  fileUrl,
  initialDuration,
  onDownload,
  onRemove,
}: AudioPreviewProps) {
  const { trackView } = useTrackAttachmentView()
  const { requestNewFolder } = useChannelFolderActions()
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(attachment?.duration || initialDuration || 0)
  const openFileDetail = useFileDetailStore((s) => s.open);

  const [isShareFileModalOpen, setIsShareFileModalOpen] = useState(false)
  const [isAddToFolderOpen, setIsAddToFolderOpen] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const wavesurferRef = useRef<WaveSurfer | null>(null)

  const { mutate: saveForLater } = useSaveForLater(attachment?.workspaceId!)

  useEffect(() => {
    if (!containerRef.current) return

    const url = attachment?.url || fileUrl
    if (!url) return

    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      waveColor: '#D1D2D3',
      progressColor: '#1d9bd1',
      cursorColor: '#1d9bd1',
      barWidth: 2,
      barGap: 3,
      barRadius: 2,
      height: 36,
      url: url,
      normalize: true,
    })

    wavesurfer.on('ready', () => {
      setDuration(wavesurfer.getDuration())
    })

    wavesurfer.on('audioprocess', (time) => {
      setCurrentTime(time)
    })

    wavesurfer.on('seeking', () => {
      setCurrentTime(wavesurfer.getCurrentTime())
    })

    wavesurfer.on('finish', () => {
      setIsPlaying(false)
      setCurrentTime(0)
    })

    wavesurferRef.current = wavesurfer

    return () => {
      wavesurfer.destroy()
    }
  }, [attachment?.url, fileUrl])

  const togglePlayPause = () => {
    if (wavesurferRef.current) {
      if (isPlaying) {
        wavesurferRef.current.pause()
      } else {
        if (attachment) {
          trackView({ id: attachment.id, workspaceId: attachment.workspaceId })
        }
        wavesurferRef.current.play()
      }
      setIsPlaying(!isPlaying)
    }
  }

  // format timestamps safely
  const formatTime = (time: number) => {
    if (isNaN(time) || !isFinite(time)) return '00:00'
    const m = Math.floor(time / 60)
    const s = Math.floor(time % 60)
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }

  const handleSaveForLater = (
    (attachmentId: string) => {
      saveForLater({ type: "attachment", attachmentId });
    }
  );

  return (
    <div className="relative flex items-center gap-3 p-3 bg-white dark:bg-[#1A1D21] border border-[#797c814d] rounded-lg max-w-[400px] w-full group overflow-hidden">
      {onRemove && (
        <button
          onClick={onRemove}
          className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[#797c81] hover:text-red-500 transition-all z-10"
        >
          <LuX size={14} />
        </button>
      )}

      {/* Play/Pause Button */}
      <button
        onClick={togglePlayPause}
        className="flex items-center justify-center w-10 h-10 rounded-full transition-colors shrink-0 shadow-sm"
      >
        {isPlaying ? (
          <LuPause size={18} className="fill-current" />
        ) : (
          <LuPlay size={18} className="fill-current ml-1" />
        )}
      </button>

      <div className="flex flex-1 min-w-0 items-center">
        {/* Waveform representation */}
        <div className="w-full flex items-center pr-2 h-9 overflow-hidden">
          <div className="w-full" ref={containerRef} />
        </div>

        {/* Timestamp */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-medium dark:text-[#D1D2D3]">
            {formatTime(currentTime)}
          </span>
        </div>

        {/* <button
          className='ml-1'
        >
          <MdMoreVert size={20}
            className='hover:scale-115 transition-all duration-300'
          />
        </button> */}

        {onDownload && (
          <>
            <Popover>
              <Tooltip>
                <TooltipTrigger asChild>
                  <PopoverTrigger asChild>
                    <p className="cursor-pointer p-1.5 rounded dark:hover:bg-[#222529] text-[#797c81]"
                      onClick={(e) => {
                        e.stopPropagation()
                        // onMoreActions?.()
                      }}
                    >
                      <MdMoreVert size={20}
                        className="hover:scale-115 transition-all duration-300"
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
                className="border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                withOverlay={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <div className="py-2 ">
                  <div className="flex flex-col space-y-1">
                    <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                      onClick={() => onDownload?.(attachment?.url || fileUrl || '', attachment?.name || '')}
                    >
                      <Typography variant="p" text="Download" />
                    </div>
                    <Separator />
                    <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                      onClick={() => {
                        handleSaveForLater(attachment?.id!)
                      }}
                    >
                      <Typography variant="p" text="Save for later" />
                    </div>
                    <div
                      onMouseEnter={() => setIsAddToFolderOpen(true)}
                      onMouseLeave={() => setIsAddToFolderOpen(false)}
                    >
                      <div className={cn(MENU_ITEM_STYLE, "relative justify-between")}>
                        <Typography variant="p" text="Add to folder" />
                        <MdOutlineKeyboardArrowRight size={13} />
                      </div>
                      {isAddToFolderOpen && message && attachment && (
                        <div className="absolute left-65 bottom-15 z-40 min-w-[220px] border border-[#797c814d] bg-white dark:bg-[#1A1D21] rounded-md shadow-lg">
                          <AddToFolderSubmenu
                            targetId={message.channelId || message.conversationId || ''}
                            attachmentId={attachment.id}
                            onRequestCreateFolder={requestNewFolder}
                          />
                        </div>
                      )}
                    </div>
                    <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsShareFileModalOpen(true)
                      }}
                    >
                      <Typography variant="p" text="Share file" />
                    </div>

                    <div className="hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation()
                        openFileDetail({ attachment: attachment!, message: message! })
                      }}
                    >
                      <Typography variant="p" text="View details" />
                    </div>

                    <Separator />
                    <Typography
                      variant="p"
                      text="Delete file"
                      className="text-red-500 hover:text-white hover:bg-red-700 px-5 py-1 cursor-pointer"
                    />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
            <ShareFileDialog
              open={isShareFileModalOpen}
              onOpenChange={setIsShareFileModalOpen}
              attachment={attachment!}
              workspaceId={attachment!.workspaceId}
            />
          </>
        )}
      </div>
    </div>
  )
}
