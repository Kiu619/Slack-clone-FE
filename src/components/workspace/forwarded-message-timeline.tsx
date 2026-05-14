"use client";

import { useMemo } from "react";
import DOMPurify from "dompurify";
import AttachmentList from "@/components/attachment-previews/attachment-list";
import Avatar from "@/components/avatar";
import type { Message, MessageForwardSnapshot, User } from "@/lib/types";
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

export function parseForwardSnapshot(
  raw: Message["forwardSnapshot"],
): MessageForwardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (
    typeof o.sourceMessageId !== "string" ||
    !o.sourceUser ||
    typeof o.sourceContent !== "string"
  ) {
    return null;
  }
  return {
    sourceMessageId: o.sourceMessageId,
    sourceUser: o.sourceUser as User,
    sourceContent: o.sourceContent,
    sourceEditedAt:
      (o.sourceEditedAt as string | null | undefined) ?? null,
  };
}

interface ForwardedMessageTimelineBlockProps {
  message: Message;
  workspaceId: string;
}

export const ForwardedMessageTimelineBlock = ({
  message,
  workspaceId,
}: ForwardedMessageTimelineBlockProps) => {
  const snapshot = parseForwardSnapshot(message.forwardSnapshot);
  const overlay = useWorkspaceMemberOverlay(
    workspaceId,
    snapshot?.sourceUser?.id ?? "",
  );
  const displayUser = useMemo(() => {
    if (!snapshot?.sourceUser) return null;
    return mergeUserForDisplay(snapshot.sourceUser as User, overlay);
  }, [snapshot?.sourceUser, overlay]);

  const sanitizedSource = useMemo(() => {
    if (!snapshot?.sourceContent) return "";
    if (typeof window === "undefined") return snapshot.sourceContent;
    return DOMPurify.sanitize(snapshot.sourceContent, SANITIZE_OPTS);
  }, [snapshot?.sourceContent]);

  if (!snapshot || !displayUser) return null;

  const label =
    displayUser.displayName || displayUser.name || snapshot.sourceUser.email;
  const hasAttachments =
    message.attachments && message.attachments.length > 0;

  return (
    <div className="mt-2 flex gap-2 border-l-2 border-[#797c81]/80 pl-3">
      <div className="shrink-0 pt-0.5">
        <Avatar
          src={displayUser.avatar ?? ""}
          className="size-8 rounded-md"
          alt={label}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-[15px] font-bold text-[#e8e8e8]">{label}</p>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <div
            className="message-content min-w-0 text-[15px] leading-relaxed text-[#ababad] [&_a]:text-sky-400 [&_p]:my-0"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: sanitizedSource }}
          />
          {snapshot.sourceEditedAt ? (
            <span className="shrink-0 text-[11px] text-[#797c81]">(edited)</span>
          ) : null}
        </div>
        {hasAttachments ? (
          <div className="pt-1">
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
          </div>
        ) : null}
      </div>
    </div>
  );
};
