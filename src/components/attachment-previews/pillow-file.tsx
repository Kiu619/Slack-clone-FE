"use client";

import type { MessageAttachment } from "@/lib/types";
import React from "react";
import { getFileIcon } from "./file-preview";

interface FilePreviewProps {
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
}

export default function PillowFile({ attachment }: FilePreviewProps) {
  const fileIcon = getFileIcon(attachment.name);
  const fileSize = formatFileSize(attachment.size);

  const mime = (attachment.mimeType ?? "").toLowerCase();
  const typeLower = (attachment.type ?? "").toLowerCase();
  const isImage =
    typeLower === "image" || mime.startsWith("image/");
  const isVideo =
    typeLower === "video" || mime.startsWith("video/");

  return (
    <div className="group relative flex w-full items-center gap-3 rounded-lg border border-[#797c814d] bg-white p-3 transition-colors hover:border-[#797c81] dark:bg-[#1A1D21]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded bg-[#e8e8e8] dark:bg-[#2a2d31]">
        {isImage && attachment.url ? (
          <img
            src={attachment.url}
            alt={attachment.name}
            className="h-full w-full object-cover"
          />
        ) : isVideo && attachment.url ? (
          <video
            src={attachment.url}
            className="h-full w-full object-cover"
            muted
            playsInline
            preload="metadata"
            aria-hidden
          />
        ) : (
          fileIcon
        )}
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium dark:text-[#d1d2d3]">
          {attachment.name}
        </p>
        <p className="text-xs text-[#797c81]">{fileSize}</p>
      </div>
    </div>
  );
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}
