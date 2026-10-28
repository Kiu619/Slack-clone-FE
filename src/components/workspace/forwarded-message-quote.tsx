"use client";

import { useMemo } from "react";
import AttachmentList from "@/components/attachment-previews/attachment-list";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAppTranslation } from "@/hooks/use-translation";
import { sanitizeRenderedRichText } from "@/lib/sanitize-rich-text";
import { resolveUserDisplayInfo } from "@/lib/user-display";
import type { Message, User } from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";

interface ForwardedMessageQuoteProps {
  message: Message;
  workspaceId: string;
}

export const ForwardedMessageQuote = ({
  message,
  workspaceId,
}: ForwardedMessageQuoteProps) => {
  const t = useAppTranslation("messageItem");
  const overlay = useWorkspaceMemberOverlay(workspaceId, message.user.id);
  const displayUser = useMemo(
    () => mergeUserForDisplay(message.user as User, overlay),
    [message.user, overlay],
  );

  const displayInfo = useMemo(
    () =>
      resolveUserDisplayInfo(displayUser, {
        deletedLabel: t("deletedUser"),
      }),
    [displayUser, t],
  );

  const sanitized = useMemo(() => {
    const content = message.content ?? "";
    return sanitizeRenderedRichText(content);
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

  const hasAttachments = !!message.attachments?.length;

  return (
    <div className="flex gap-3 rounded-md border border-[#797c814d]/60 bg-black/10 py-3 pr-3 pl-2 dark:bg-white/3">
      <div
        className="w-1 shrink-0 rounded-full bg-[#797c81]/80"
        aria-hidden
      />
      <div className="flex min-w-0 flex-1 gap-2">
        <Avatar className="size-9 shrink-0 rounded-md">
          {displayInfo.avatar ? (
            <AvatarImage src={displayInfo.avatar} />
          ) : null}
          <AvatarFallback
            className={
              displayInfo.isDeleted
                ? "rounded-md bg-[#3a3d41] text-xs text-[#ababad]"
                : "rounded-md bg-amber-500 text-xs text-white"
            }
          >
            {displayInfo.initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 space-y-2">
          <p
            className={
              displayInfo.isDeleted
                ? "truncate text-[15px] font-bold text-[#ababad]"
                : "truncate text-[15px] font-bold text-[#e8e8e8]"
            }
          >
            {displayInfo.name}
          </p>
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
