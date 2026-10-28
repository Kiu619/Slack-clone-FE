"use client";

import { useMemo } from "react";
import AttachmentList from "@/components/attachment-previews/attachment-list";
import Avatar from "@/components/avatar";
import { useAppTranslation } from "@/hooks/use-translation";
import type { Message, MessageForwardSnapshot, User } from "@/lib/types";
import { sanitizeRenderedRichText } from "@/lib/sanitize-rich-text";
import { resolveUserDisplayInfo } from "@/lib/user-display";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";

export function parseForwardSnapshot(
  raw: Message["forwardSnapshot"],
): MessageForwardSnapshot | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  // Bắt buộc phải có sourceMessageId + sourceContent.
  // sourceUser có thể null (khi source message đã hard-delete) — FE sẽ
  // fallback "Deleted user" trong ForwardedMessageTimelineBlock.
  if (
    typeof o.sourceMessageId !== "string" ||
    typeof o.sourceContent !== "string"
  ) {
    return null;
  }
  // sourceUser: optional, có thể null/undefined (snapshot mới chỉ lưu
  // sourceMessageId và sẽ được BE resolve lúc đọc). Cũng chấp nhận object
  // (snapshot cũ có đầy đủ) hoặc null (BE đã resolve nhưng message gốc không
  // tồn tại nữa).
  const rawSourceUser = o.sourceUser;
  let sourceUser: User | null = null;
  if (rawSourceUser && typeof rawSourceUser === "object") {
    sourceUser = rawSourceUser as User;
  }
  return {
    sourceMessageId: o.sourceMessageId,
    sourceUser,
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
  const t = useAppTranslation("messageItem");
  const snapshot = parseForwardSnapshot(message.forwardSnapshot);

  // Khi snapshot.sourceUser null (source message đã bị hard-delete), tạo
  // synthetic user object với membershipStatus='deleted' để resolveUserDisplayInfo
  // nhận diện và trả về "Deleted user" + avatar mặc định (giống Slack tombstone).
  const sourceUser = snapshot?.sourceUser ?? null;
  const synthesizedDeletedUser = sourceUser
    ? null
    : sourceUser === null && snapshot
      ? ({ id: snapshot.sourceMessageId, membershipStatus: "deleted" } as Partial<User>)
      : null;

  const overlay = useWorkspaceMemberOverlay(
    workspaceId,
    sourceUser?.id ?? snapshot?.sourceMessageId ?? "",
  );
  const displayUser = useMemo(() => {
    if (synthesizedDeletedUser) {
      // mergeUserForDisplay expect User, cast là safe vì chỉ dùng id/membershipStatus
      return mergeUserForDisplay(
        synthesizedDeletedUser as User,
        overlay,
      )
    }
    if (!sourceUser) return null;
    return mergeUserForDisplay(sourceUser, overlay);
  }, [sourceUser, synthesizedDeletedUser, overlay]);

  const displayInfo = useMemo(
    () =>
      resolveUserDisplayInfo(displayUser, {
        deletedLabel: t("deletedUser"),
      }),
    [displayUser, t],
  );

  const sanitizedSource = snapshot?.sourceContent
    ? sanitizeRenderedRichText(snapshot.sourceContent)
    : "";

  // Cho phép render cả khi sourceUser null (synthesizedDeletedUser) — chỉ skip
  // khi không có snapshot hợp lệ (thiếu sourceMessageId/sourceContent).
  if (!snapshot || !displayUser) return null;

  const hasAttachments =
    message.attachments && message.attachments.length > 0;

  return (
    <div className="mt-2 flex gap-2 border-l-2 border-[#797c81]/80 pl-3">
      <div className="shrink-0 pt-0.5">
        <Avatar
          src={displayInfo.avatar ?? ""}
          className="size-8 rounded-md"
          alt={displayInfo.name}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={
            displayInfo.isDeleted
              ? "truncate text-[15px] font-bold text-[#ababad]"
              : "truncate text-[15px] font-bold "
          }
        >
          {displayInfo.name}
        </p>
        <div className="flex flex-wrap items-baseline gap-1.5">
          <div
            className="message-content min-w-0 text-[15px] leading-relaxed [&_a]:text-sky-400 [&_p]:my-0"
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
