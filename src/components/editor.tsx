/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Code from "@tiptap/extension-code";
import Link from "@tiptap/extension-link";
import Mention from "@tiptap/extension-mention";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import {
  computeNextMondayNineAmLocal,
  computeTomorrowNineAmLocal,
} from "@/lib/quick-schedule-slots";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceMembersApi, getNotificationsApi } from "@/apis";
import { createSuggestion } from "./suggestion";
import {
  LuAtSign,
  LuBold,
  LuCode,
  LuSquareCode,
  LuItalic,
  LuLink,
  LuList,
  LuListOrdered,
  LuMic,
  LuPaperclip,
  LuCalendarClock,
  LuSend,
  LuSmile,
  LuStrikethrough,
  LuUnderline,
  LuVideo,
  LuX,
} from "react-icons/lu";
import { MdFormatColorText } from "react-icons/md";
import { LinkInputDialog } from "./dialogs/link-input-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { useTheme } from "next-themes";
import {
  getFileIcon,
  formatFileSize,
} from "./attachment-previews/file-preview";
import { useAudioRecorder } from "@/hooks/use-audio-recorder";
import EditorAudioRecorder from "./editor-audio-recorder";
import AudioPreview from "./attachment-previews/audio-preview";
import { Popover, PopoverContent, PopoverTrigger } from "./ui/popover";
import { Separator } from "./ui/separator";

const RecordVideoDialog = dynamic(
  () => import("./dialogs/record-video-dialog"),
  { ssr: false },
);
const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export interface PendingFile {
  id: string;
  file: File;
}

interface EditorProps {
  onSubmit?: (htmlContent: string) => void;
  channelName?: string;
  workspaceId?: string;
  currentMembers?: any[];
  /**
   * Callback khi user bắt đầu/ngừng gõ — dùng để emit typing events qua WebSocket
   * Phase 1: không dùng
   * Phase 3: truyền từ MessageTab.tsx xuống
   */
  onTypingStart?: () => void;
  onTypingStop?: () => void;
  /** Disable editor khi đang gửi */
  disabled?: boolean;
  /** Callback khi user attach files (add vào pending, chờ nhấn Gửi/Enter) */
  onFileAttach?: (files: File[]) => void;
  /** Có file pending → cho phép gửi dù không có text */
  hasPendingFiles?: boolean;
  initialContent?: string;
  /** Gọi khi nội dung thay đổi (lưu draft — debounce ở hook cha) */
  onContentChange?: (html: string) => void;
  variant?: "create" | "update" | "forward";
  /** Chỉ dùng khi variant === "forward" */
  editorPlaceholder?: string;
  onCancel?: () => void;
  pendingFiles?: PendingFile[];
  onRemoveFile?: (id: string) => void;
  existingAttachments?: any[];
  onRemoveExistingAttachment?: (id: string) => void;
  /** Mở dialog lên lịch gửi (composer chính / thread) */
  onScheduleClick?: () => void;
  /** Lên lịch nhanh (Tomorrow / Monday) — ISO gửi lên API */
  onScheduleQuickPick?: (scheduledAtIso: string) => void | Promise<void>;
  /** Ẩn nút lên lịch (vd. chỉnh sửa tin) */
  scheduleDisabled?: boolean;
}

const Editor = ({
  onSubmit,
  onCancel,
  channelName,
  workspaceId,
  currentMembers = [],
  disabled = false,
  onFileAttach,
  hasPendingFiles = false,
  initialContent = "",
  variant = "create",
  editorPlaceholder,
  onContentChange,
  pendingFiles = [],
  onRemoveFile,
  existingAttachments = [],
  onRemoveExistingAttachment,
  onScheduleClick,
  onScheduleQuickPick,
  scheduleDisabled = false,
}: EditorProps) => {
  const [showLinkInput, setShowLinkInput] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showVideoRecorder, setShowVideoRecorder] = useState(false);
  const [, forceUpdate] = useState({});
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [openSchedulePopover, setOpenSchedulePopover] = useState(false);

  const quickScheduleSlots = (() => {
    const t = computeTomorrowNineAmLocal();
    const m = computeNextMondayNineAmLocal();
    return {
      tomorrowIso: t.toISOString(),
      mondayIso: m.toISOString(),
      tomorrowLabel: `Tomorrow at ${format(t, "h:mm a", { locale: enUS })}`,
      mondayLabel: format(m, "EEEE 'at' h:mm a", { locale: enUS }),
    };
  })();

  const { theme } = useTheme();

  const { data: allMembers, isLoading: isLoadingAllMembers } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId!),
    enabled: !!workspaceId,
  });

  // Dùng state để lưu suggestion và cập nhật nó thủ công khi cần
  const suggestion = useMemo(
    () =>
      createSuggestion(
        allMembers || [],
        currentMembers,
        channelName,
        workspaceId,
      ),
    [allMembers, currentMembers, channelName, workspaceId],
  );

  const {
    isRecording,
    recordingDuration,
    stream,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useAudioRecorder();

  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({
          heading: false,
          hardBreak: false,
          bulletList: {
            keepMarks: true,
            keepAttributes: false,
            HTMLAttributes: { class: "list-disc pl-6" },
          },
          orderedList: {
            keepMarks: true,
            keepAttributes: false,
            HTMLAttributes: { class: "list-decimal pl-6" },
          },
          listItem: {
            HTMLAttributes: { class: "text-white" },
          },
          codeBlock: {
            HTMLAttributes: {
              class:
                "bg-white dark:bg-[#1A1D21] text-[#e8e8e8] rounded p-2 font-mono text-sm",
            },
          },
          // Tắt inline code của StarterKit để dùng extension riêng với config
          code: false,
        }),
        // Inline code extension riêng để có thể style
        Code.configure({
          HTMLAttributes: {
            class:
              "font-mono text-sm bg-[#2a2d31] text-[#e8e8e8] px-1.5 py-0.5 rounded border border-[#797c814d]",
            spellcheck: "false",
          },
        }),
        Placeholder.configure({
          placeholder: () => {
            if (variant === "forward") {
              return editorPlaceholder ?? "Add a message, if you'd like.";
            }
            if (channelName) {
              return `Message #${channelName}`;
            }
            return "Reply...";
          },
        }),
        Link.configure({
          openOnClick: false,
          HTMLAttributes: { class: "text-blue-500 underline cursor-pointer" },
        }),
        Underline,
        Mention.configure({
          HTMLAttributes: {
            class:
              "mention bg-[#1264a3]/20 text-[#1264a3] dark:text-[#36c5f0] px-1 py-0.5 rounded font-medium",
          },
          suggestion,
        }),
      ],
      editorProps: {
        attributes: {
          class:
            "max-w-none focus:outline-none max-h-[200px] overflow-y-auto px-3 py-2 text-[15px] leading-tight scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-gray-900",
        },
      },
      content: initialContent,
      immediatelyRender: false,
      editable: !disabled,
      onUpdate: ({ editor }) => {
        forceUpdate({});
        onContentChange?.(editor.getHTML());
      },
      onSelectionUpdate: () => {
        forceUpdate({});
      },
    },
    [
      workspaceId,
      channelName,
      isLoadingAllMembers,
      currentMembers.length,
      onContentChange,
      variant,
      editorPlaceholder,
    ],
  );

  // Cập nhật suggestion khi dependencies thay đổi
  useEffect(() => {
    if (editor && !editor.isDestroyed) {
      editor.extensionManager.extensions.forEach((extension) => {
        if (extension.name === "mention") {
          extension.options.suggestion = suggestion;
          // Force Tiptap re-render extension logic
          editor.view.dispatch(editor.state.tr);
        }
      });
    }
  }, [editor, suggestion]);

  // Sync editable state với disabled prop
  useEffect(() => {
    editor?.setEditable(!disabled && !isRecording);
  }, [editor, disabled, isRecording]);

  // Close emoji picker khi click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    if (showEmojiPicker) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showEmojiPicker]);

  const handleSubmit = useCallback(() => {
    if (!editor || disabled) return;

    const content = editor.getHTML();
    // Kiểm tra text thực tế bên trong các tag HTML (bao gồm cả &nbsp;)
    const textContent = editor
      .getText()
      .replace(/\u00A0/g, " ")
      .trim();
    const hasContent = textContent !== "";

    if (!hasContent && !hasPendingFiles) return;

    onSubmit?.(content);
    editor.commands.clearContent();
    editor.commands.focus();
  }, [editor, disabled, onSubmit, hasPendingFiles]);

  /**
   * handleFileSelect — khi user chọn file từ file picker
   */
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;

      const fileArray = Array.from(files);
      onFileAttach?.(fileArray);

      // Reset input để có thể chọn lại cùng file
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [onFileAttach],
  );

  const handleEmojiSelect = useCallback(
    (emojiData: EmojiClickData) => {
      if (!editor) return;
      editor.chain().focus().insertContent(emojiData.emoji).run();
      setShowEmojiPicker(false);
    },
    [editor],
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && variant !== "forward") {
      // Kiểm tra xem mention popup có đang hiển thị không.
      const isMentionOpen =
        document.querySelector(".tippy-box") ||
        document.querySelector("[data-tippy-root]");

      if (isMentionOpen) {
        // Nếu popup đang mở, ta KHÔNG gọi preventDefault hay stopPropagation
        // để Tiptap có thể nhận event và chọn user.
        // Nhưng ta RETURN sớm để không chạy handleSubmit() phía dưới.
        return;
      }

      e.preventDefault();
      handleSubmit();
      return;
    }
    if (e.key === "Escape") {
      onCancel?.();
    }
    if (e.key === "Enter" && e.shiftKey) {
      e.preventDefault();
      if (editor?.isActive("bulletList") || editor?.isActive("orderedList")) {
        editor?.commands.splitListItem("listItem");
      } else {
        editor?.chain().focus().splitBlock().run();
      }
    }
  };

  const isMarkActive = (markName: string) => {
    if (!editor) return false;
    if (editor.isActive(markName)) return true;
    const { storedMarks } = editor.state;
    if (storedMarks) {
      return storedMarks.some((mark) => mark.type.name === markName);
    }
    return false;
  };

  const toggleBold = () => {
    editor?.chain().focus().toggleBold().run();
    forceUpdate({});
  };
  const toggleItalic = () => {
    editor?.chain().focus().toggleItalic().run();
    forceUpdate({});
  };
  const toggleStrike = () => {
    editor?.chain().focus().toggleStrike().run();
    forceUpdate({});
  };
  const toggleUnderline = () => {
    editor?.chain().focus().toggleUnderline().run();
    forceUpdate({});
  };
  const toggleCode = () => {
    editor?.chain().focus().toggleCode().run();
    forceUpdate({});
  };
  const toggleCodeBlock = () => editor?.chain().focus().toggleCodeBlock().run();
  const toggleBulletList = () =>
    editor?.chain().focus().toggleBulletList().run();
  const toggleOrderedList = () =>
    editor?.chain().focus().toggleOrderedList().run();

  const handleConfirmAudio = async () => {
    const blob = await stopRecording();
    if (blob) {
      const file = new File(
        [blob],
        `audio_message_${new Date().getTime()}.webm`,
        { type: "audio/webm" },
      );
      onFileAttach?.([file]);
    }
  };

  const hasContent = !!editor?.getText().trim();
  const canSubmit = hasContent || hasPendingFiles;

  if (!editor) return null;

  return (
    <div className="relative">
      {variant !== "forward" && (
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          accept="*"
        />
      )}

      <div
        className={`border rounded-lg bg-white dark:bg-[#1A1D21] transition-colors ${
          disabled
            ? "border-[#797c814d] opacity-60"
            : "border-[#797c814d] hover:border-[#797c81]"
        }`}
      >
        {/* Top Toolbar: Formatting */}
        {!isRecording && (
          <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-[#797c814d]">
            <ToolbarButton
              onClick={toggleBold}
              active={isMarkActive("bold")}
              tooltip="Bold (Ctrl+B)"
            >
              <LuBold size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleItalic}
              active={isMarkActive("italic")}
              tooltip="Italic (Ctrl+I)"
            >
              <LuItalic size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleStrike}
              active={isMarkActive("strike")}
              tooltip="Strikethrough"
            >
              <LuStrikethrough size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleUnderline}
              active={isMarkActive("underline")}
              tooltip="Underline (Ctrl+U)"
            >
              <LuUnderline size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={toggleBulletList}
              active={editor.isActive("bulletList")}
              tooltip="Bullet list"
            >
              <LuList size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleOrderedList}
              active={editor.isActive("orderedList")}
              tooltip="Ordered list"
            >
              <LuListOrdered size={16} />
            </ToolbarButton>

            <Divider />

            <ToolbarButton
              onClick={() => setShowLinkInput(!showLinkInput)}
              active={editor.isActive("link")}
              tooltip="Insert link"
            >
              <LuLink size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleCode}
              active={isMarkActive("code")}
              tooltip="Inline code"
            >
              <LuCode size={16} />
            </ToolbarButton>
            <ToolbarButton
              onClick={toggleCodeBlock}
              active={editor.isActive("codeBlock")}
              tooltip="Code block"
            >
              <LuSquareCode size={16} />
            </ToolbarButton>
          </div>
        )}

        {/* Editor Content */}
        {isRecording ? (
          <EditorAudioRecorder
            isRecording={isRecording}
            recordingDuration={recordingDuration}
            stream={stream}
            onCancel={cancelRecording}
            onConfirm={handleConfirmAudio}
          />
        ) : (
          <div onKeyDownCapture={handleKeyDown}>
            <EditorContent editor={editor} />
          </div>
        )}

        {/* Attachments Preview (Existing + Pending) */}
        {(existingAttachments.length > 0 || pendingFiles.length > 0) && (
          <div className="flex flex-wrap gap-2 p-3">
            {existingAttachments.map((att) => (
              <PendingFilePreview
                key={att.id}
                attachment={att}
                onRemove={() => onRemoveExistingAttachment?.(att.id)}
              />
            ))}
            {pendingFiles.map((pf) => (
              <PendingFilePreview
                key={pf.id}
                file={pf.file}
                onRemove={() => onRemoveFile?.(pf.id)}
              />
            ))}
          </div>
        )}

        {/* Bottom Toolbar: forward — chỉ emoji */}
        {!isRecording && variant === "forward" && (
          <div className="flex items-center border-t border-[#797c814d] px-2 py-1.5">
            <div className="relative" ref={emojiPickerRef}>
              <ToolbarButton
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                active={showEmojiPicker}
                tooltip="Emoji"
              >
                <LuSmile size={16} />
              </ToolbarButton>
              {showEmojiPicker && (
                <div className="absolute bottom-full mb-2 left-0 z-50">
                  <EmojiPicker
                    onEmojiClick={handleEmojiSelect}
                    theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                    width={350}
                    height={400}
                    searchPlaceHolder="Search emoji..."
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bottom Toolbar: Media + Send */}
        {!isRecording && variant !== "forward" && (
          <div className="flex items-center justify-between px-2 py-1.5">
            <div className="flex items-center gap-0.5">
              <ToolbarButton
                onClick={() => fileInputRef.current?.click()}
                tooltip="Attach file"
              >
                <LuPaperclip size={16} />
              </ToolbarButton>
              <ToolbarButton tooltip="Format text">
                <MdFormatColorText size={16} />
              </ToolbarButton>

              <Divider />

              {/* Emoji Picker */}
              <div className="relative" ref={emojiPickerRef}>
                <ToolbarButton
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  active={showEmojiPicker}
                  tooltip="Emoji"
                >
                  <LuSmile size={16} />
                </ToolbarButton>
                {showEmojiPicker && (
                  <div className="absolute bottom-full mb-2 left-0 z-50">
                    <EmojiPicker
                      onEmojiClick={handleEmojiSelect}
                      theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                      width={350}
                      height={400}
                      searchPlaceHolder="Search emoji..."
                      previewConfig={{ showPreview: false }}
                    />
                  </div>
                )}
              </div>

              <ToolbarButton tooltip="Mention someone (@)">
                <LuAtSign size={16} />
              </ToolbarButton>

              <Divider />

              <ToolbarButton
                onClick={() => setShowVideoRecorder(true)}
                tooltip="Record video clip"
              >
                <LuVideo size={16} />
              </ToolbarButton>
              <ToolbarButton
                disabled={isRecording}
                onClick={startRecording}
                tooltip="Record audio clip"
              >
                <LuMic size={16} />
              </ToolbarButton>
            </div>

            {variant === "update" ? (
              <div className="flex items-center gap-2">
                <button
                  onClick={onCancel}
                  className="px-3 py-1.5 rounded dark:bg-transparent dark:text-white dark:border-[#797c814d] border bg-white text-black hover:bg-gray-50 dark:hover:bg-[#222529] text-sm font-semibold transition-colors"
                  disabled={disabled}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={!canSubmit || disabled}
                  className="px-3 py-1.5 rounded bg-[#007a5a] text-white hover:bg-[#148567] text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                {/* {variant === "create" &&
                onScheduleClick &&
                !scheduleDisabled ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={onScheduleClick}
                        disabled={!canSubmit || disabled}
                        className={`p-2 rounded transition-colors ${
                          canSubmit && !disabled
                            ? "bg-[#222529] hover:bg-[#2a2d31] text-[#e8e8e8] cursor-pointer border border-[#797c814d]"
                            : "dark:bg-[#222529] bg-[#e8e8e8] text-[#797c81] cursor-not-allowed border border-transparent"
                        }`}
                      >
                        <LuCalendarClock size={16} />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Lên lịch gửi</p>
                    </TooltipContent>
                  </Tooltip>
                ) : null}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={handleSubmit}
                      disabled={!canSubmit || disabled}
                      className={`p-2 rounded transition-colors ${
                        canSubmit && !disabled
                          ? "bg-green-600 hover:bg-green-700 text-white cursor-pointer"
                          : "dark:bg-[#222529] bg-[#e8e8e8] text-[#797c81] cursor-not-allowed"
                      }`}
                    >
                      <LuSend size={16} />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p className="text-xs">Send (Enter)</p>
                  </TooltipContent>
                </Tooltip> */}

                <div
                  className={`flex items-center rounded-md border border-[#797c814d] ${
                    canSubmit && !disabled
                      ? "bg-[#007a5a]"
                      : "border-[#797c814d]"
                  }`}
                >
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        onClick={handleSubmit}
                        disabled={!canSubmit || disabled}
                        className={`p-2 transition-colors ${
                          canSubmit && !disabled
                            ? "cursor-pointer hover:bg-[#148567]!"
                            : "cursor-not-allowed"
                        }`}
                      >
                        <LuSend
                          size={16}
                          className={`${
                            canSubmit && !disabled
                              ? "text-white"
                              : "text-[#797c81]"
                          }`}
                        />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p className="text-xs">Send (Enter)</p>
                    </TooltipContent>
                  </Tooltip>

                  <span className="h-7 w-px bg-white"></span>

                  {variant === "create" &&
                  onScheduleClick &&
                  onScheduleQuickPick &&
                  !scheduleDisabled ? (
                    <Popover open={openSchedulePopover} onOpenChange={setOpenSchedulePopover}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <PopoverTrigger asChild>
                            <button
                              type="button"
                              // onClick={onScheduleClick}
                              disabled={!canSubmit || disabled}
                              className={`p-2 transition-colors ${
                                canSubmit && !disabled
                                  ? "cursor-pointer hover:bg-[#148567]!"
                                  : "cursor-not-allowed"
                              }`}
                            >
                              <LuCalendarClock
                                size={16}
                                className={`${
                                  canSubmit && !disabled
                                    ? "text-white"
                                    : "text-[#797c81]"
                                }`}
                              />
                            </button>
                          </PopoverTrigger>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p className="text-xs">Schedule for later</p>
                        </TooltipContent>
                      </Tooltip>
                      <PopoverContent side="top" align="end">
                        <div className="flex flex-col py-2">
                          <span className="mx-4 text-[12px] text-[#8e9297]">
                            Schedule for later...
                          </span>
                          <div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                void (async () => {
                                  setOpenSchedulePopover(false);
                                  try {
                                    await onScheduleQuickPick(
                                      quickScheduleSlots.tomorrowIso,
                                    );
                                  } catch {
                                    /* toast ở hook */
                                  }
                                })();
                              }
                            }}
                            onClick={() => {
                              setOpenSchedulePopover(false);
                              void (async () => {
                                try {
                                  await onScheduleQuickPick(
                                    quickScheduleSlots.tomorrowIso,
                                  );
                                } catch {
                                  /* toast ở hook */
                                }
                              })();
                            }}
                            className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm"
                          >
                            {quickScheduleSlots.tomorrowLabel}
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                void (async () => {
                                  setOpenSchedulePopover(false);
                                  try {
                                    await onScheduleQuickPick(
                                      quickScheduleSlots.mondayIso,
                                    );
                                  } catch {
                                    /* toast ở hook */
                                  }
                                })();
                              }
                            }}
                            onClick={() => {
                              setOpenSchedulePopover(false);
                              void (async () => {
                                try {
                                  await onScheduleQuickPick(
                                    quickScheduleSlots.mondayIso,
                                  );
                                } catch {
                                  /* toast ở hook */
                                }
                              })();
                            }}
                            className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm"
                          >
                            {quickScheduleSlots.mondayLabel}
                          </div>
                          <Separator className="my-2" />
                          <div
                            onClick={() => {
                              setOpenSchedulePopover(false);
                              onScheduleClick()
                            }}
                            className="px-4 py-1 hover:bg-selection-hover hover:text-white cursor-pointer text-sm"
                          >
                            Custom time
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ) : null}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {showLinkInput && (
        <LinkInputDialog open={showLinkInput} setOpen={setShowLinkInput} />
      )}

      <RecordVideoDialog
        open={showVideoRecorder}
        onOpenChange={setShowVideoRecorder}
        onFileAttach={(files) => {
          onFileAttach?.(files);
          setShowVideoRecorder(false);
        }}
      />
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Divider() {
  return <span className="h-4 w-px bg-[#797c814d] mx-0.5" />;
}

interface ToolbarButtonProps {
  onClick?: () => void;
  active?: boolean;
  tooltip: string;
  children: React.ReactNode;
  disabled?: boolean;
}

function ToolbarButton({
  onClick,
  active,
  tooltip,
  children,
  disabled,
}: ToolbarButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          disabled={disabled}
          className={`cursor-pointer p-1.5 rounded dark:hover:bg-[#222529] transition-colors ${
            active ? "bg-[#222529] text-white" : "dark:text-[#d1d2d3]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        <p className="text-xs">{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function PendingFilePreview({
  file,
  attachment,
  onRemove,
}: {
  file?: File;
  attachment?: any;
  onRemove: () => void;
}) {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);

  const name = file?.name || attachment?.name || "";
  const size = file?.size || attachment?.size || 0;
  const type = file?.type || attachment?.type || "";
  const url = attachment?.url || mediaUrl;

  useEffect(() => {
    if (file && file.type.startsWith("audio/")) {
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    if (
      file &&
      (file.type.startsWith("image/") || file.type.startsWith("video/"))
    ) {
      const url = URL.createObjectURL(file);
      setMediaUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  if (
    (type.startsWith("audio/") || type === "audio") &&
    (audioUrl || attachment?.url)
  ) {
    return (
      <AudioPreview fileUrl={audioUrl || attachment.url} onRemove={onRemove} />
    );
  }

  const fileIcon = getFileIcon(name);
  const fileSize = formatFileSize(size);
  const isImage = type.startsWith("image/") || type === "image";
  const isVideo = type.startsWith("video/") || type === "video";

  return (
    <div className="group relative flex items-center gap-3 p-2 pr-8 rounded-lg border border-[#797c814d] bg-white dark:bg-[#1A1D21] w-full max-w-[240px] overflow-hidden">
      {/* Thumbnail or Icon */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded bg-[#2a2d31] overflow-hidden">
        {isImage && url ? (
          <img src={url} alt={name} className="w-full h-full object-cover" />
        ) : isVideo && url ? (
          <video src={url} className="w-full h-full object-cover" />
        ) : (
          fileIcon
        )}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium dark:text-[#d1d2d3] truncate">
          {name}
        </p>
        <p className="text-[10px] text-[#797c81]">{fileSize}</p>
      </div>

      {/* Remove button */}
      <button
        type="button"
        onClick={onRemove}
        className="absolute top-1 right-1 p-1 rounded-full opacity-0 group-hover:opacity-100 hover:bg-red-500/20 text-[#797c81] hover:text-red-500 transition-all"
      >
        <LuX size={14} />
      </button>
    </div>
  );
}

export default Editor;
