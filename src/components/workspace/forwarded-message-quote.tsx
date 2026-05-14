"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import AttachmentList from "@/components/attachment-previews/attachment-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Message, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";

const SANITIZE_OPTS = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "em",
    "s",
    "u",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "a",
    "blockquote",
    "span",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class"],
};

interface ForwardedMessageQuoteProps {
  message: Message;
  workspaceId: string;
}

export const ForwardedMessageQuote = ({
  message,
  workspaceId,
}: ForwardedMessageQuoteProps) => {
  const overlay = useWorkspaceMemberOverlay(workspaceId, message.user.id);
  const displayUser = useMemo(
    () => mergeUserForDisplay(message.user as User, overlay),
    [message.user, overlay],
  );

  const sanitized = useMemo(() => {
    const content = message.content ?? "";
    if (typeof window === "undefined") return content;
    return DOMPurify.sanitize(content, SANITIZE_OPTS);
  }, [message.content]);

  const isFileOnlyPlaceholder =
    !!message.attachments?.length &&
    (message.content === "<p></p>" ||
      message.content.trim() === "<p></p>" ||
      message.content === "<p>📎</p>");

  const isUploadPlaceholder =
    message.content.includes("Đang tải file") ||
    message.content.includes("Tải file thất bại");

  const isEmptyContent =
    message.content === "<p></p>" || message.content.trim() === "<p></p>";

  const shouldShowContent =
    message.content.includes("Tải file thất bại") ||
    !(message.attachments?.length && (isUploadPlaceholder || isEmptyContent));

  const isEdited = !!message.editedAt && !isFileOnlyPlaceholder;

  const label = displayUser.displayName || displayUser.name || message.user.email;

  const hasAttachments = !!message.attachments?.length;

  return (
    <div className="flex gap-3 rounded-md border border-[#797c814d]/60 bg-black/10 py-3 pr-3 pl-2 dark:bg-white/3">
      <div
        className="w-1 shrink-0 rounded-full bg-[#797c81]/80"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 gap-2">
        <Avatar className="size-9 shrink-0 rounded-md">
          <AvatarImage src={displayUser.avatar || ""} />
          <AvatarFallback className="rounded-md bg-amber-500 text-xs text-white">
            {label.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <p className="truncate text-[15px] font-bold text-[#e8e8e8]">{label}</p>
          {shouldShowContent && (
            <div className="flex flex-wrap items-center gap-1">
              <div
                className="message-content text-[15px] leading-snug text-[#ababad] [&_a]:text-sky-400 [&_p]:my-0"
                dangerouslySetInnerHTML={{ __html: sanitized }}
              />
              {isEdited && (
                <span className="text-[11px] text-[#797c81]">(edited)</span>
              )}
            </div>
          )}
          {hasAttachments && (
            <AttachmentList
              message={message}
              attachments={message.attachments}
              onDownload={(url, name) => {
                const a = document.createElement("a");
                a.href = url;
                a.download = name;
                a.click();
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
