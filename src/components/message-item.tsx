'use client'

import { format, isToday, isYesterday } from 'date-fns'
import DOMPurify from 'dompurify'
import { useCallback, useMemo, useState } from 'react'
import {
  LuEllipsis,
  LuPencil,
  LuReply,
  LuSmile,
  LuTrash2,
} from 'react-icons/lu'
import Avatar from '@/components/avatar'
import AttachmentList from '@/components/attachment-previews/attachment-list'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { Message, Reaction } from '@/lib/types'

// Dynamic import EmojiPicker để tránh SSR
import dynamic from 'next/dynamic'
import { type EmojiClickData, Theme } from 'emoji-picker-react'
const EmojiPicker = dynamic(() => import('emoji-picker-react'), { ssr: false })

interface MessageItemProps {
  message: Message
  /** currentUserId để biết highlight reaction nào là của mình */
  currentUserId: string
  /**
   * isCompact = true khi message liên tiếp cùng user trong < 5 phút
   * → ẩn avatar + tên, chỉ hiện timestamp nhỏ bên trái (giống Slack)
   */
  isCompact?: boolean
  onReact?: (messageId: string, emoji: string) => void
  onEdit?: (message: Message) => void
  onDelete?: (messageId: string) => void
  onReply?: (message: Message) => void
}

/** Format timestamp giống Slack */
function formatTimestamp(dateStr: string): string {
  const date = new Date(dateStr)
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Hôm qua lúc ${format(date, 'HH:mm')}`
  return format(date, 'dd/MM/yyyy HH:mm')
}

/** Format timestamp cho compact mode (chỉ giờ) */
function formatCompactTime(dateStr: string): string {
  return format(new Date(dateStr), 'HH:mm')
}

export default function MessageItem({
  message,
  currentUserId,
  isCompact = false,
  onReact,
  onEdit,
  onDelete,
  onReply,
}: MessageItemProps) {
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  const isDeleted = !!message.deletedAt
  /** Ẩn "đã chỉnh sửa" khi là system update (thay placeholder upload bằng content rỗng) */
  const isFileOnlyPlaceholder =
    message.attachments?.length &&
    (message.content === '<p></p>' ||
      message.content.trim() === '<p></p>' ||
      message.content === '<p>📎</p>')
  const isEdited =
    !!message.editedAt && !isFileOnlyPlaceholder
  const isOwner = message.user.id === currentUserId

  /** Placeholder khi đang upload file — ẩn nếu đã có attachments */
  const isUploadPlaceholder =
    message.content.includes('Đang tải file') ||
    message.content.includes('Tải file thất bại')

  /** Content rỗng (file-only message) — không hiển thị */
  const isEmptyContent =
    message.content === '<p></p>' || message.content.trim() === '<p></p>'

  /** Ẩn content khi có attachments và content là placeholder/rỗng */
  const shouldShowContent =
    message.content.includes('Tải file thất bại') ||
    !(message.attachments?.length && (isUploadPlaceholder || isEmptyContent))

  /**
   * Sanitize HTML từ Tiptap trước khi dangerouslySetInnerHTML
   * DOMPurify loại bỏ các script/XSS nguy hiểm nhưng giữ lại
   * formatting tags (bold, italic, ul, ol, code...)
   */
  const sanitizedContent = useMemo(() => {
    if (typeof window === 'undefined') return message.content
    return DOMPurify.sanitize(message.content, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'em', 's', 'u', 'code', 'pre',
        'ul', 'ol', 'li', 'a', 'blockquote', 'span',
      ],
      ALLOWED_ATTR: ['href', 'target', 'rel', 'class'],
    })
  }, [message.content])

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      onReact?.(message.id, emojiData.emoji)
      setShowEmojiPicker(false)
    },
    [message.id, onReact],
  )

  /** Kiểm tra current user đã react emoji này chưa */
  const hasReacted = (reaction: Reaction) =>
    reaction.userIds.includes(currentUserId)

  if (isDeleted) {
    return (
      <div className="px-4 py-1 opacity-50">
        <span className="text-[13px] text-[#797c81] italic">
          [Tin nhắn đã bị xóa]
        </span>
      </div>
    )
  }

  return (
    <div
      className={`group relative flex gap-x-2 px-4 hover:bg-[#222529] transition-colors ${
        isCompact ? 'py-0.5' : 'py-1.5'
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false)
        setShowEmojiPicker(false)
      }}
    >
      {/* Cột trái: Avatar hoặc timestamp nhỏ (compact mode) */}
      <div className="w-9 shrink-0 flex justify-center">
        {isCompact ? (
          /* Compact: chỉ hiện giờ khi hover */
          <span
            className={`text-[11px] text-[#797c81] mt-0.5 transition-opacity ${
              isHovered ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {formatCompactTime(message.createdAt)}
          </span>
        ) : (
          <Avatar
            src={message.user.avatar ?? ''}
            className="w-9 h-9 rounded-lg cursor-pointer mt-0.5"
          />
        )}
      </div>

      {/* Cột phải: nội dung */}
      <div className="flex-1 min-w-0">
        {/* Header: tên + timestamp (chỉ non-compact) */}
        {!isCompact && (
          <div className="flex items-baseline gap-x-2 mb-0.5">
            <span className="text-[15px] font-bold text-white cursor-pointer hover:underline">
              {message.user.name ?? message.user.email}
            </span>
            <span className="text-[11px] text-[#797c81]">
              {formatTimestamp(message.createdAt)}
            </span>
          </div>
        )}

        {/* Nội dung message — ẩn placeholder "Đang tải file" khi đã có attachments */}
        {shouldShowContent && (
          <div
            className="text-[15px] text-[#d1d2d3] leading-relaxed message-content"
            dangerouslySetInnerHTML={{ __html: sanitizedContent }}
          />
        )}

        {/* Badge "đã chỉnh sửa" */}
        {isEdited && (
          <span className="text-[11px] text-[#797c81] ml-1">(đã chỉnh sửa)</span>
        )}

        {/* Attachments — hiển thị files/images/videos */}
        {message.attachments && message.attachments.length > 0 && (
          <AttachmentList
            attachments={message.attachments}
            onDownload={(url, name) => {
              // Download file
              const a = document.createElement('a')
              a.href = url
              a.download = name
              a.click()
            }}
          />
        )}

        {/* Reactions bar */}
        {message.reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {message.reactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onClick={() => onReact?.(message.id, reaction.emoji)}
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[13px] border transition-colors ${
                  hasReacted(reaction)
                    ? 'bg-[#1d9bd1]/20 border-[#1d9bd1]/50 text-[#1d9bd1]'
                    : 'bg-[#2a2d31] border-[#797c814d] text-[#d1d2d3] hover:border-[#797c81]'
                }`}
              >
                <span>{reaction.emoji}</span>
                <span className="font-medium">{reaction.count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover action toolbar — xuất hiện khi hover (góc trên phải) */}
      {isHovered && (
        <div className="absolute right-4 top-0 -translate-y-1/2 flex items-center gap-0.5 bg-[#1a1d21] border border-[#797c814d] rounded-lg shadow-lg px-1 py-0.5 z-10">
          {/* React với emoji */}
          <div className="relative">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-1.5 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
                >
                  <LuSmile size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Thêm reaction</p>
              </TooltipContent>
            </Tooltip>

            {showEmojiPicker && (
              <div className="absolute bottom-full right-0 mb-2 z-50">
                <EmojiPicker
                  onEmojiClick={handleEmojiSelect}
                  theme={Theme.DARK}
                  width={320}
                  height={380}
                  searchPlaceHolder="Tìm emoji..."
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>

          {/* Reply */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => onReply?.(message)}
                className="p-1.5 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
              >
                <LuReply size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Trả lời trong thread</p>
            </TooltipContent>
          </Tooltip>

          {/* Edit — chỉ owner */}
          {isOwner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onEdit?.(message)}
                  className="p-1.5 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors"
                >
                  <LuPencil size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Chỉnh sửa tin nhắn</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Delete — chỉ owner */}
          {isOwner && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => onDelete?.(message.id)}
                  className="p-1.5 rounded hover:bg-[#222529] text-red-400 hover:text-red-300 transition-colors"
                >
                  <LuTrash2 size={16} />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p className="text-xs">Xóa tin nhắn</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* More actions */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button className="p-1.5 rounded hover:bg-[#222529] text-[#797c81] hover:text-white transition-colors">
                <LuEllipsis size={16} />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">
              <p className="text-xs">Thêm tùy chọn</p>
            </TooltipContent>
          </Tooltip>
        </div>
      )}
    </div>
  )
}
