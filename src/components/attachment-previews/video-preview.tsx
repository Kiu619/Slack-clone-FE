"use client";

import type { Message, MessageAttachment } from "@/lib/types";
import { useRef, useState } from "react";
import FileToolbar from "./file-toolbar";

interface VideoPreviewProps {
  message: Message;
  attachment: MessageAttachment;
  onDownload?: (url: string, name: string) => void;
  formDetailPanel?: boolean;
}

export default function VideoPreview({
  message,
  attachment,
  onDownload,
  formDetailPanel = false,
}: VideoPreviewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  return (
    <div
      className="group relative w-full max-w-[500px] rounded-lg overflow-hidden border border-[#797c814d] bg-black"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {formDetailPanel ? (
        <FileToolbar
          isHovered={isHovered}
          message={message}
          attachment={attachment}
          onDownload={handleDownload}
          onOpen={handleOpenInNewTab}
        />
      ) : null}
      {/* Video element */}
      <video
        ref={videoRef}
        src={attachment.url}
        className="w-full h-auto"
        controls
        preload="metadata"
      >
        <track kind="captions" />
      </video>
    </div>
  );
}
