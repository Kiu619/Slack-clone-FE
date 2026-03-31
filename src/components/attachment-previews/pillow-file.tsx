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
interface FilePreviewProps {
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
}

export default function PillowFile({
  attachment,
}: FilePreviewProps) {

  const fileIcon = getFileIcon(attachment.name);
  const fileSize = formatFileSize(attachment.size);

  return (
    <div
      className="group relative w-full flex items-center gap-3 p-3 rounded-lg border border-[#797c814d] hover:border-[#797c81] transition-colors bg-white dark:bg-[#1A1D21]"
    >

      {/* File icon */}
      <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded bg-[#2a2d31]">
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
 * Get icon component dựa trên file extension
 */
function getFileIcon(fileName: string): React.ReactElement {
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
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".gif":
    case ".webp":
    case ".svg":
    case ".ico":
    case ".bmp":
    case ".tiff":
      return <LuImage className={`${iconClass} text-gray-400`} />;
    default:
      return <LuFile className={`${iconClass} text-gray-400`} />;
  }
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
