"use client";

import dynamic from "next/dynamic";
import type { Message, MessageAttachment } from "@/lib/types";
import ImagePreview from "./image-preview";
import VideoPreview from "./video-preview";
import FilePreview from "./file-preview";
import CodePreview from "./code-preview";
import OfficeFilePreview from "./office-file-preview";
import AudioPreview from "./audio-preview";
import { isCodeOrTextFile, isOfficeFile, isPdfFile } from "./file-utils";
import Typography from "../ui/typography";
import { FaCaretDown, FaCaretRight } from "react-icons/fa";
import { useAttachmentExpanded } from "@/hooks/use-attachment-expanded";

const PdfPreview = dynamic(() => import("./pdf-preview"), { ssr: false });

interface AttachmentListProps {
  message: Message;
  attachments: MessageAttachment[];
  onDownload?: (url: string, name: string) => void;
}

/**
 * AttachmentList — Render danh sách attachments trong message
 *
 * Layout:
 * - Single image: full width (max 400px)
 * - Multiple images: grid 2x2 hoặc 3x3
 * - Videos: stacked vertically (max 500px width)
 * - Office (PPT, Excel, Word): card với icon + mô tả (giống Slack)
 * - Code/text: syntax highlighting giống IDE
 * - Files khác: list view với icon
 */
export default function AttachmentList({
  message,
  attachments,
  onDownload,
}: AttachmentListProps) {
  const [isExpanded, handleToggle] = useAttachmentExpanded(message.id);

  if (!attachments.length) return null;

  const isAllImages = attachments.every((a) => a.type === "image");
  const isMixedOrFiles = attachments.length >= 2 && !isAllImages;

  if (isMixedOrFiles) {
    return (
      <>
        <button
          type="button"
          onClick={handleToggle}
          className="flex w-full gap-2 items-center text-left hover:opacity-80 transition-opacity dark:text-[#d1d2d3] truncate!"
        >
          <Typography
            variant="p"
            className="text-[10px]"
            text={`${attachments.length} files`}
          />
          {isExpanded ? (
            <FaCaretDown className="w-3 h-3 shrink-0 text-[#797c81]" />
          ) : (
            <FaCaretRight className="w-3 h-3 shrink-0 text-[#797c81]" />
          )}
        </button>
        {isExpanded && (
          <div className="flex flex-wrap gap-2 w-full mt-1">
            {attachments.map((file) => (
              <FilePreview
                key={file.id}
                message={message}
                attachment={file}
                onDownload={onDownload}
              />
            ))}
          </div>
        )}
      </>
    );
  }

  // Group theo type
  const images = attachments.filter((a) => a.type === "image");
  const videos = attachments.filter((a) => a.type === "video");
  const audioFiles = attachments.filter((a) => a.type === "audio");
  const allFiles = attachments.filter((a) => a.type === "file");

  const officeFiles = allFiles.filter((a) => isOfficeFile(a.name));
  const pdfFiles = allFiles.filter((a) => isPdfFile(a.name, a.mimeType));
  const codeFiles = allFiles.filter(
    (a) =>
      !isOfficeFile(a.name) &&
      !isPdfFile(a.name, a.mimeType) &&
      isCodeOrTextFile(a.name, a.mimeType),
  );
  const otherFiles = allFiles.filter(
    (a) =>
      !isOfficeFile(a.name) &&
      !isPdfFile(a.name, a.mimeType) &&
      !isCodeOrTextFile(a.name, a.mimeType),
  );

  return (
    <>
      <button
        type="button"
        onClick={handleToggle}
        className="flex w-full gap-2 items-center text-left hover:opacity-80 transition-opacity dark:text-[#d1d2d3] truncate!"
      >
        {attachments.length > 1 ? (
          <Typography
            variant="p"
            className="text-[10px]"
            text={`${attachments.length} files`}
          />
        ) : (
          <Typography
            variant="p"
            className="text-[10px] truncate!"
            text={attachments[0].name}
          />
        )}
        {isExpanded ? (
          <FaCaretDown className="w-3 h-3 shrink-0 text-[#797c81]" />
        ) : (
          <FaCaretRight className="w-3 h-3 shrink-0 text-[#797c81]" />
        )}
      </button>
      {isExpanded && (
        <div className="flex flex-wrap gap-2 w-full">
          {/* Images — hiển thị hết tất cả ảnh, mỗi ảnh rộng = kích thước ảnh. Lightbox có nút trái/phải */}
          {images.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full">
              {images.map((img) => (
                <ImagePreview
                  key={img.id}
                  message={message}
                  attachment={img}
                  allImages={images}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}

          {videos.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {videos.map((video) => (
                <VideoPreview
                  key={video.id}
                  message={message}
                  attachment={video}
                  onDownload={onDownload}
                  useExternalFullscreen
                />
              ))}
            </div>
          )}

          {audioFiles.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {audioFiles.map((audio) => (
                <AudioPreview
                  key={audio.id}
                  message={message}
                  attachment={audio}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}

          {officeFiles.length > 0  && (
            <div className="flex flex-wrap gap-2 w-full">
              {officeFiles.map((file) => (
                <OfficeFilePreview
                  key={file.id}
                  message={message}
                  attachment={file}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}

          {pdfFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full">
              {pdfFiles.map((file) => (
                <PdfPreview
                  key={file.id}
                  message={message}
                  attachment={file}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}

          {codeFiles.length > 0 && (
            <div className="flex flex-col gap-2 w-full">
              {codeFiles.map((file) => (
                <CodePreview
                  key={file.id}
                  message={message}
                  attachment={file}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}

          {/* Files khác — list view */}
          {otherFiles.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full">
              {otherFiles.map((file) => (
                <FilePreview
                  key={file.id}
                  message={message}
                  attachment={file}
                  onDownload={onDownload}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </>
  );
}
