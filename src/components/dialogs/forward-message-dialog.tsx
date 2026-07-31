"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { isAxiosError } from "axios";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Editor from "@/components/editor";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { ForwardedMessageQuote } from "@/components/workspace/forwarded-message-quote";
import {
  ForwardedMessageTimelineBlock,
  parseForwardSnapshot,
} from "@/components/workspace/forwarded-message-timeline";
import { WorkspaceRecipientChipsInput } from "@/components/workspace/workspace-recipient-chips-input";
import { Button } from "@/components/ui/button";
import { useForwardRecipientSearch } from "@/hooks/use-forward-recipient-search";
import { getMainGatewaySocket } from "@/hooks/use-socket";
import { forwardMessageApi } from "@/apis";
import type { Channel, Message, WorkspaceMember } from "@/lib/types";
import { applyIncomingDmMessageToConversationsCaches } from "@/lib/conversations-cache";
import { buildForwardDestinations } from "@/lib/message-destinations";
import { useMessageStore } from "@/stores/useMessageStore";

interface ForwardMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  message: Message;
}

function commentaryPayload(html: string): string | undefined {
  const plain = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!plain) return undefined;
  return html;
}

function hasMeaningfulForwarderHtml(html: string | null | undefined): boolean {
  if (html == null) return false;
  const t = html.trim();
  if (
    t === "" ||
    t === "<p></p>" ||
    t === "<p><br></p>" ||
    /^<p>\s*<\/p>$/i.test(t)
  ) {
    return false;
  }
  if (t.includes("Đang tải file") || t.includes("Tải file thất bại")) {
    return false;
  }
  return t.replace(/<[^>]+>/g, "").replace(/&nbsp;/gi, " ").trim().length > 0;
}

function hasBodyOwnedAttachments(
  attachments: Message["attachments"] | undefined,
): boolean {
  return (attachments ?? []).some((a) => a.originScope !== "forward_quote");
}

function ForwardMessageDialogContent({
  message,
  workspaceId,
  onOpenChange,
}: {
  message: Message;
  workspaceId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const searchRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const [commentaryHtml, setCommentaryHtml] = useState("");

  const {
    searchQuery,
    setSearchQuery,
    selectedTargets,
    filteredResults,
    handleSelect,
    handleSelectConversation,
    removeTarget,
    displayMember,
    currentUserId,
    isSearchFocused,
    setIsSearchFocused,
    reset,
  } = useForwardRecipientSearch(workspaceId);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsSearchFocused]);

  const forwardMutation = useMutation({
    mutationFn: async () => {
      const destinations = await buildForwardDestinations(
        workspaceId,
        selectedTargets,
      );
      if (destinations.length === 0) {
        throw new Error("No destinations");
      }
      const commentary = commentaryPayload(commentaryHtml);
      const s = getMainGatewaySocket();
      const headers =
        s.connected && s.id ? { "x-socket-id": s.id } : undefined;
      return forwardMessageApi(
        message.id,
        { destinations, commentary },
        headers ? { headers } : undefined,
      );
    },
    onSuccess: (data) => {
      const { messages } = data;
      const store = useMessageStore.getState();
      store.upsertEntities(messages);
      for (const m of messages) {
        const targetId = m.channelId || m.conversationId;
        if (targetId) {
          store.addMessage(targetId, m);
        }
        if (m.conversationId) {
          applyIncomingDmMessageToConversationsCaches(
            queryClient,
            workspaceId,
            m,
          );
        }
      }
      toast.success(
        messages.length === 1
          ? "Message forwarded"
          : `Message forwarded to ${messages.length} places`,
      );
      reset();
      setCommentaryHtml("");
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || "Could not forward message");
    },
  });

  const title =
    message.conversationId != null
      ? "Forward this private message"
      : "Forward message";

  const showDropdown = isSearchFocused && searchQuery.trim().length > 0;

  const forwardPreviewSnapshot = useMemo(
    () => parseForwardSnapshot(message.forwardSnapshot),
    [message.forwardSnapshot],
  );

  const hasOwnBodyForForward = useMemo(
    () =>
      hasMeaningfulForwarderHtml(message.content) ||
      hasBodyOwnedAttachments(message.attachments),
    [message.content, message.attachments],
  );

  /** Chỉ preview block quote khi tin thuần forward (không có text/file riêng ngoài quote). */
  const showNestedForwardTimelinePreview = Boolean(
    forwardPreviewSnapshot && !hasOwnBodyForForward,
  );

  const previewDisplayMessage = useMemo((): Message => {
    if (!forwardPreviewSnapshot || !hasOwnBodyForForward) {
      return message;
    }
    return {
      ...message,
      forwardSnapshot: undefined,
      attachments: (message.attachments ?? []).filter(
        (a) => a.originScope !== "forward_quote",
      ),
    };
  }, [message, forwardPreviewSnapshot, hasOwnBodyForForward]);

  const handleForwardClick = useCallback(() => {
    forwardMutation.mutate();
  }, [forwardMutation]);

  return (
    <>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{title}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="flex flex-col gap-4">
        <WorkspaceRecipientChipsInput
          workspaceId={workspaceId}
          searchRef={searchRef}
          selectedTargets={selectedTargets}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onSearchFocus={() => setIsSearchFocused(true)}
          placeholder="Add by name or channel"
          isDropdownOpen={showDropdown}
          filteredResults={filteredResults}
          onSelectChannel={(ch: Channel) => handleSelect("channel", ch)}
          onSelectMember={(m: WorkspaceMember) => handleSelect("member", m)}
          onSelectConversation={handleSelectConversation}
          onRemoveTarget={removeTarget}
          currentUserId={currentUserId}
        />

        <Editor
          key={`forward-editor-${message.id}`}
          variant="forward"
          workspaceId={workspaceId}
          initialContent=""
          onContentChange={setCommentaryHtml}
          onCancel={() => onOpenChange(false)}
          editorPlaceholder="Add a message, if you'd like."
        />

        {showNestedForwardTimelinePreview ? (
          <ForwardedMessageTimelineBlock
            message={message}
            workspaceId={workspaceId}
          />
        ) : (
          <ForwardedMessageQuote
            message={previewDisplayMessage}
            workspaceId={workspaceId}
          />
        )}
      </CustomDialogBody>
      <CustomDialogFooter className="justify-between">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="success"
          disabled={
            selectedTargets.length === 0 || forwardMutation.isPending
          }
          onClick={handleForwardClick}
        >
          Forward
        </Button>
      </CustomDialogFooter>
    </>
  );
}

export const ForwardMessageDialog = ({
  open,
  onOpenChange,
  workspaceId,
  message,
}: ForwardMessageDialogProps) => {
  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="560px">
      {open ? (
        <ForwardMessageDialogContent
          key={message.id}
          message={message}
          workspaceId={workspaceId}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </CustomDialog>
  );
};
