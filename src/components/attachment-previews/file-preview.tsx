"use client";

import type { Message, MessageAttachment } from "@/lib/types";
import { enUS } from "date-fns/locale";
import React, { useState } from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
} from "react-icons/fa";
import {
  LuFile,
  LuFileArchive,
  LuFileAudio,
  LuFileImage,
  LuFileText,
  LuFileVideo,
} from "react-icons/lu";
import FileToolbar from "./file-toolbar";

import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface FilePreviewProps {
  message: Message;
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
  formDetailPanel?: boolean;
  fromFilesTab?: boolean;
  effectiveFolderId?: string | null;
}

function sharerLabel(message: Message): string {
  return (
    message.user.displayName?.trim() || message.user.name?.trim() || "Someone"
  );
}

export default function FilePreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
  fromFilesTab = false,
  effectiveFolderId = null,
}: FilePreviewProps) {
  const [isHovered, setIsHovered] = useState(false);
  const handleDownload = () => {
    if (onDownload) {
      onDownload(attachment.url, attachment.name);
    } else {
      window.open(attachment.url, "_blank");
    }
  };
  const handleOpenInNewTab = () => {
    window.open(attachment.url, "_blank");
  };

  const fileIcon = getFileIcon(attachment.name);
  const fileSize = formatFileSize(attachment.size);

  console.log("attachment", attachment);

  return (
    <>
      <div
        className={cn(
          "group relative flex items-center max-w-[400px] gap-3 p-3 rounded-lg border border-[#797c814d] hover:border-[#797c81] transition-colors  bg-white dark:bg-[#1A1D21]",
          fromFilesTab ? "max-w-full" : "",
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={(event) => {
          event.stopPropagation();
          console.log("clicked");
        }}
      >
        {!formDetailPanel ? (
          <FileToolbar
            isHovered={isHovered}
            message={message}
            attachment={attachment}
            onDownload={handleDownload}
            onOpen={handleOpenInNewTab}
            effectiveFolderId={effectiveFolderId}
          />
        ) : null}

        {/* File icon */}
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded dark:bg-[#2a2d31] bg-[#e8e8e8]">
          {fileIcon}
        </div>

        {/* File info */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium dark:text-[#d1d2d3] truncate">
            {attachment.name}
          </p>
          {!fromFilesTab && (
            <p className="text-xs text-[#797c81]">{fileSize}</p>
          )}
          {fromFilesTab && (
            <p className="text-[13px] text-[#616061] dark:text-[#ababad] truncate">
              Shared by {sharerLabel(message)} on{" "}
              {format(new Date(attachment.createdAt), "MMM do", {
                locale: enUS,
              })}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

/**
 * Get icon component dựa trên file extension
 */
export function getFileIcon(fileName: string): React.ReactElement {
  const ext = fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";

  const iconClass = "w-6 h-6";

  switch (ext) {
    case ".pdf":
      return <FaFilePdf className={`${iconClass} text-red-500`} />;
    case ".doc":
    case ".docx":
      return <FaFileWord className={`${iconClass} text-blue-500`} />;
    case ".xls":
    case ".xlsx":
      return <FaFileExcel className={`${iconClass} text-green-500`} />;
    case ".ppt":
    case ".pptx":
      return <FaFilePowerpoint className={`${iconClass} text-orange-500`} />;
    case ".zip":
    case ".rar":
    case ".7z":
    case ".tar":
    case ".gz":
      return <LuFileArchive className={`${iconClass} text-yellow-600`} />;
    case ".txt":
    case ".md":
    case ".json":
    case ".xml":
    case ".csv":
      return <LuFileText className={`${iconClass} text-gray-500`} />;
    case ".jpg":
    case ".jpeg":
    case ".png":
    case ".gif":
    case ".svg":
    case ".webp":
      return <LuFileImage className={`${iconClass} text-purple-500`} />;
    case ".mp4":
    case ".mov":
    case ".avi":
    case ".mkv":
    case ".webm":
      return <LuFileVideo className={`${iconClass} text-rose-500`} />;
    case ".mp3":
    case ".wav":
    case ".ogg":
    case ".flac":
    case ".m4a":
      return <LuFileAudio className={`${iconClass} text-amber-600`} />;
    default:
      return <LuFile className={`${iconClass} text-gray-400`} />;
  }
}

export function getFileExtension(fileName: string): string {
  return fileName.toLowerCase().match(/\.[^.]+$/)?.[0] ?? "";
}

/**
 * Format file size: bytes → "2.5 MB"
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
