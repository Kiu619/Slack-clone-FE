"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
} from "../custom-dialog";
import { WorkspaceRecipientChipsInput } from "@/components/workspace/workspace-recipient-chips-input";
import { Button } from "@/components/ui/button";
import { useForwardRecipientSearch } from "@/hooks/use-forward-recipient-search";
import { getMainGatewaySocket } from "@/hooks/use-socket";
import { apiClient } from "@/lib/axios";
import { applyIncomingDmMessageToConversationsCaches } from "@/lib/conversations-cache";
import { buildForwardDestinations } from "@/lib/message-destinations";
import { attachmentToOutgoingSendPayload } from "@/lib/outgoing-attachment";
import type { Channel, Message, MessageAttachment, WorkspaceMember } from "@/lib/types";
import { useMessageStore } from "@/stores/useMessageStore";
import PillowFile from "../attachment-previews/pillow-file";

function commentaryPayload(html: string): string | undefined {
  const plain = html.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim();
  if (!plain) return undefined;
  return html;
}

function ShareFileDialogContent({
  attachment,
  workspaceId,
  onOpenChange,
}: {
  attachment: MessageAttachment;
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
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setIsSearchFocused]);

  const shareMutation = useMutation({
    mutationFn: async () => {
      const destinations = await buildForwardDestinations(
        workspaceId,
        selectedTargets,
      );
      if (destinations.length === 0) {
        throw new Error("No destinations");
      }
      const s = getMainGatewaySocket();
      const headers =
        s.connected && s.id ? { "x-socket-id": s.id } : undefined;
      const att = attachmentToOutgoingSendPayload(attachment);
      const commentary = commentaryPayload(commentaryHtml);
      const baseBody = {
        content: commentary ?? "",
        attachments: [att],
      };

      const results = await Promise.allSettled(
        destinations.map((dest) => {
          const url =
            dest.type === "channel"
              ? `/channels/${dest.channelId}/messages`
              : `/direct-messages/${dest.conversationId}/messages`;
          return apiClient
            .post<Message>(url, baseBody, headers ? { headers } : undefined)
            .then((r) => r.data);
        }),
      );

      const messages: Message[] = [];
      for (const r of results) {
        if (r.status === "fulfilled") messages.push(r.value);
      }
      const failed = results.length - messages.length;
      if (messages.length === 0) {
        const first = results.find((x) => x.status === "rejected") as
          | PromiseRejectedResult
          | undefined;
        throw first?.reason ?? new Error("Could not share file");
      }
      return { messages, failed, total: destinations.length };
    },
    onSuccess: ({ messages, failed, total }) => {
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
      if (failed > 0) {
        toast.success(
          `Shared to ${messages.length} of ${total} ${total === 1 ? "place" : "places"}`,
        );
      } else {
        toast.success(
          messages.length === 1
            ? "File shared"
            : `File shared to ${messages.length} places`,
        );
      }
      reset();
      setCommentaryHtml("");
      onOpenChange(false);
    },
    onError: (err) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string } | undefined)?.message
        : undefined;
      toast.error(msg || "Could not share file");
    },
  });

  const showDropdown = isSearchFocused && searchQuery.trim().length > 0;

  const handleForwardClick = useCallback(() => {
    shareMutation.mutate();
  }, [shareMutation]);

  return (
    <>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Share this file</CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="bg-white dark:bg-[#1A1D21] p-6 space-y-4">
        <div className="flex w-full flex-col gap-4">
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

          <div className="w-full">
            <Editor
              key={`share-file-editor-${attachment.id}`}
              variant="forward"
              workspaceId={workspaceId}
              initialContent=""
              onContentChange={setCommentaryHtml}
              onCancel={() => onOpenChange(false)}
              editorPlaceholder="Add a message, if you'd like."
            />
          </div>

          <div className="flex w-full justify-center">
            <PillowFile attachment={attachment} />
          </div>
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="px-6 py-4 justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="success"
          disabled={selectedTargets.length === 0 || shareMutation.isPending}
          onClick={handleForwardClick}
        >
          Forward
        </Button>
      </CustomDialogFooter>
    </>
  );
}

export function ShareFileDialog({
  open,
  onOpenChange,
  attachment,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  attachment: MessageAttachment;
  workspaceId: string;
}) {
  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      {open ? (
        <ShareFileDialogContent
          key={attachment.id}
          attachment={attachment}
          workspaceId={workspaceId}
          onOpenChange={onOpenChange}
        />
      ) : null}
    </CustomDialog>
  );
}
