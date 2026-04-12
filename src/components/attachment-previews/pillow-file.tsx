"use client";

import type { MessageAttachment } from "@/lib/types";
import React from "react";
import {
  FaFileExcel,
  FaFilePdf,
  FaFilePowerpoint,
  FaFileWord,
} from "react-icons/fa";
import { LuFile, LuFileArchive, LuFileText, LuImage } from "react-icons/lu";
import { getFileIcon } from "./file-preview";
interface FilePreviewProps {
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
}

export default function PillowFile({ attachment }: FilePreviewProps) {
  const fileIcon = getFileIcon(attachment.name);
  const fileSize = formatFileSize(attachment.size);

  return (
    <div className="group relative w-full flex items-center gap-3 p-3 rounded-lg border border-[#797c814d] hover:border-[#797c81] transition-colors bg-white dark:bg-[#1A1D21]">
      {/* File icon */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded dark:bg-[#2a2d31] bg-[#e8e8e8]">
        {fileIcon}
      </div>

      {/* File info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium dark:text-[#d1d2d3] truncate">
          {attachment.name}
        </p>
        <p className="text-xs text-[#797c81]">{fileSize}</p>
      </div>
    </div>
  );
}

/**
 * Format file size: bytes → "2.5 MB"
 */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
