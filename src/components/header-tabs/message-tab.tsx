"use client";

import { fetchChannelMembersApi } from "@/apis";
import VideoFullscreenPortal from "@/components/attachment-previews/video-fullscreen-portal";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import Editor from "@/components/editor";
import MessageList from "@/components/message-list";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import UploadingFileItem from "@/components/uploading-file-item";
import { useJoinChannel } from "@/hooks/use-join-channel";
import { useMessageComposer } from "@/hooks/use-message-composer";
import {
  useDeleteMessage,
  useUpdateMessage,
} from "@/hooks/use-messages";
import { useSocket } from "@/hooks/use-socket";
import { useWorkspaceUnreadCounts } from "@/hooks/use-workspace-unread-counts";
import type { Channel, DirectMessageConversation, Message } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useUserStore } from "@/stores/useUserStore";
import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from "react";
import ScheduleSendDialog from "../dialogs/schedule-send-dialog";
import { ScheduledSendAckBanner } from "@/components/scheduled-send-ack-banner";
import { canUserPostInChannel, getRestrictedPostingLabel } from "@/lib/channel-posting-permissions";
import { useAppTranslation } from "@/hooks/use-translation";

interface MainProps {
  currentChannelData?: Channel;
  currentConversationData?: DirectMessageConversation;
  isNewMessageMode?: boolean;
  isMember?: boolean;
}

const MessageTab = ({
  currentChannelData,
  currentConversationData,
  isNewMessageMode = false,
  isMember,
}: MainProps) => {
  const t = useAppTranslation("headerTabs");
  const currentUser = useUserStore((state) => state.user);
  const postingPermission = useMemo(
    () =>
      currentChannelData
        ? canUserPostInChannel(
            currentChannelData,
            currentUser?.id ?? null,
            currentUser?.role ?? null,
          )
        : null,
    [currentChannelData, currentUser?.id, currentUser?.role],
  );
  const restrictedPostingLabel = useMemo(
    () =>
      getRestrictedPostingLabel(
        currentChannelData,
        currentUser?.id ?? null,
        currentUser?.role ?? null,
      ),
    [currentChannelData, currentUser?.id, currentUser?.role],
  );

  const targetId = (currentChannelData?.id ||
    currentConversationData?.id) as string;
  const workspaceId = (currentChannelData?.workspaceId ||
    currentConversationData?.workspaceId) as string;
  const targetName = currentChannelData?.name || "";
  const isArchivedDm =
    !!currentConversationData?.isArchivedBecausePeerDeactivated;


  const { isConnected } = useSocket();
  const { channelUnreadById, dmUnreadById } = useWorkspaceUnreadCounts();
  const conversationUnreadCount = currentConversationData?.id
    ? (dmUnreadById[currentConversationData.id] ?? currentConversationData.unreadCount ?? 0)
    : 0;

  const { mutate: joinChannel, isPending: isJoining } = useJoinChannel(workspaceId, currentChannelData?.id ?? "");

  const { data: channelMembersData } = useQuery({
    queryKey: ["channels", workspaceId, currentChannelData?.id, "members"],
    queryFn: () => fetchChannelMembersApi(workspaceId, currentChannelData!.id),
    enabled: !!workspaceId && !!currentChannelData?.id,
    staleTime: 0
  });

  const currentMembers = useMemo(() => {
    if (currentChannelData) {
      return channelMembersData?.inChannel || [];
    }
    if (currentConversationData) {
      return currentConversationData.members || [];
    }
    return [];
  }, [currentChannelData, channelMembersData, currentConversationData]);

  const [scheduleOpen, setScheduleOpen] = useState(false);

  const {
    onSubmit,
    scheduleMessage,
    isScheduling,
    isSending,
    pendingFiles,
    uploadingFiles,
    addPendingFiles,
    removePendingFile,
    onComposerHtmlChange,
    composerInitialHtml,
    composerEditorKey,
    scheduledSendAck,
    workspaceTimeZone,
  } = useMessageComposer({
    workspaceId,
    channelId: currentChannelData?.id,
    conversationId: currentConversationData?.id,
    currentConversationData,
    isNewMessageMode,
  });

  const { mutate: updateMessage } = useUpdateMessage(targetId);
  const { mutate: deleteMessage } = useDeleteMessage(targetId);

  const [messageToDelete, setMessageToDelete] = useState<string | null>(null);
  const [isFileDragOver, setIsFileDragOver] = useState(false);
  const fileDragDepthRef = useRef(0);

  const isFileDrag = useCallback((e: DragEvent<Element>) => {
    return Array.from(e.dataTransfer.types).includes("Files");
  }, []);

  useEffect(() => {
    const clearDrag = () => {
      fileDragDepthRef.current = 0;
      setIsFileDragOver(false);
    };
    window.addEventListener("dragend", clearDrag);
    return () => window.removeEventListener("dragend", clearDrag);
  }, []);

  const handleEditMessage = useCallback(
    (message: Message) => {
      updateMessage({ messageId: message.id, content: message.content });
    },
    [updateMessage],
  );

  const handleDeleteMessage = useCallback((messageId: string) => {
    setMessageToDelete(messageId);
  }, []);

  const handleFileAttach = useCallback(
    (files: File[]) => {
      if (!files.length) return;
      addPendingFiles(files);
    },
    [addPendingFiles],
  );

  const handleMainDragEnter = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (isSending || isScheduling || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fileDragDepthRef.current += 1;
      setIsFileDragOver(true);
    },
    [isSending, isScheduling, isFileDrag],
  );

  const handleMainDragLeave = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (isSending || isScheduling || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      fileDragDepthRef.current -= 1;
      if (fileDragDepthRef.current <= 0) {
        fileDragDepthRef.current = 0;
        setIsFileDragOver(false);
      }
    },
    [isSending, isScheduling, isFileDrag],
  );

  const handleMainDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      if (isSending || isScheduling || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      e.dataTransfer.dropEffect = "copy";
    },
    [isSending, isScheduling, isFileDrag],
  );

  const handleMainDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      fileDragDepthRef.current = 0;
      setIsFileDragOver(false);
      if (isSending || isScheduling || !isFileDrag(e)) return;
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      if (!files.length) return;
      addPendingFiles(files);
    },
    [isSending, isScheduling, isFileDrag, addPendingFiles],
  );

  return (
    <div
      className={cn(
        "relative flex h-full flex-col justify-between overflow-hidden",
        isFileDragOver &&
          "ring-2 ring-inset ring-[#1264a3] dark:ring-[#1d9bd1]",
      )}
      onDragEnter={handleMainDragEnter}
      onDragLeave={handleMainDragLeave}
      onDragOver={handleMainDragOver}
      onDrop={handleMainDrop}
    >
      {isFileDragOver ? (
        <div
          className="pointer-events-none absolute inset-0 z-50 flex flex-col items-center justify-center gap-2 bg-[#1264a3]/12 p-4 backdrop-blur-[1px] dark:bg-black/35 sm:gap-3"
          aria-hidden
        >
          <div className="max-w-[min(100%,18rem)] rounded-xl border-2 border-dashed border-[#1264a3] bg-white/95 px-5 py-5 dark:border-[#1d9bd1] dark:bg-[#1A1D21]/95 sm:max-w-none sm:px-8 sm:py-6">
            <Typography
              variant="p"
              text={t("message.dropToAttach")}
              className="text-center text-base font-bold text-[#1264a3] dark:text-[#1d9bd1] sm:text-lg"
            />
            <Typography
              variant="p"
              text={t("message.filesAppearBelow")}
              className="mt-1 text-center text-xs text-[#616061] dark:text-[#ababad] sm:text-[13px]"
            />
          </div>
        </div>
      ) : null}
      <VideoFullscreenPortal />
      <MessageList
        channelId={currentChannelData?.id}
        conversationId={currentConversationData?.id}
        members={currentConversationData?.members}
        isGroup={currentConversationData?.isGroup}
        createdAt={currentConversationData?.createdAt || currentChannelData?.createdAt}
        currentUserId={currentUser?.id ?? ""}
        workspaceId={workspaceId}
        isConnected={isConnected}
        onEditMessage={handleEditMessage}
        onDeleteMessage={handleDeleteMessage}
        fromPublicChannel={currentChannelData?.isPrivate === false}
        isMember={isMember}
        channelPostingSettings={currentChannelData?.postingSettings ?? null}
        unreadBoundaryAt={currentConversationData?.lastReadAt ?? null}
        unreadCount={
          currentChannelData?.id
            ? (channelUnreadById[currentChannelData.id] ?? 0)
            : conversationUnreadCount
        }
      />

      <div className="px-4 pb-4 shrink-0">
        {isArchivedDm && currentConversationData ? (
          <div className="flex flex-col items-center justify-center gap-2 h-28 bg-[rgba(232,226,226,0.4)] dark:bg-[#222529] border-[#797c814d] border rounded-lg">
            <Typography
              variant="p"
              text={t("message.viewingArchives")}
              className="text-sm font-medium text-[#1d1c1d] dark:text-[#f9f8f9]"
            />
          </div>
        ) : isMember === false && currentChannelData ? (
          <div className="flex flex-col items-center justify-center gap-2 h-28 bg-[rgba(232,226,226,0.4)] dark:bg-[#222529] border-[#797c814d] border rounded-lg">
            <Typography
              variant="p"
              text={t("message.viewingChannel", { channel: currentChannelData.name })}
              className="text-sm font-medium text-[#1d1c1d] dark:text-[#f9f8f9]"
            />
            <Typography
              variant="p"
              text={t("message.viewingChannelDescription")}
              className="text-xs text-[#616061] dark:text-[#ababad] mb-1"
            />
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                {t("message.details")}
              </Button>
              <Button
                variant="success"
                size="sm"
                disabled={isJoining}
                onClick={() => {
                  joinChannel(currentUser!.id);
                }}
              >
                {isJoining ? t("message.joining") : t("message.joinChannel")}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {currentChannelData && postingPermission && !postingPermission.canPost ? (
              <div className="flex flex-col items-center justify-center gap-2 h-28 bg-[rgba(232,226,226,0.4)] dark:bg-[#222529] border-[#797c814d] border rounded-lg">
                <Typography
                  variant="p"
                  text={restrictedPostingLabel ?? t("message.restrictedPosting")}
                  className="text-sm font-medium text-[#1d1c1d] dark:text-[#f9f8f9]"
                />
              </div>
            ) : null}
            {scheduledSendAck && (
              <ScheduledSendAckBanner
                workspaceId={workspaceId}
                scheduledAtIso={scheduledSendAck.scheduledAtIso}
                pendingScheduledCount={
                  scheduledSendAck.pendingScheduledCount
                }
                workspaceTimeZone={workspaceTimeZone}
              />
            )}
            {isArchivedDm ? null : currentChannelData && postingPermission && !postingPermission.canPost ? null : (
              <>
                <Editor
                  key={composerEditorKey}
                  channelName={targetName}
                  workspaceId={workspaceId}
                  currentMembers={currentMembers}
                  onSubmit={onSubmit}
                  onFileAttach={handleFileAttach}
                  disabled={isSending || isScheduling}
                  hasPendingFiles={pendingFiles.length > 0}
                  pendingFiles={pendingFiles}
                  onRemoveFile={removePendingFile}
                  initialContent={composerInitialHtml}
                  onContentChange={onComposerHtmlChange}
                  onScheduleClick={() => setScheduleOpen(true)}
                  onScheduleQuickPick={async (iso) => {
                    try {
                      await scheduleMessage({
                        scheduledAtIso: iso,
                        alsoSendToChannel: false,
                      })
                    } catch {
                      /* toast trong hook */
                    }
                  }}
                  channelPostingSettings={currentChannelData?.postingSettings ?? null}
                />

                {uploadingFiles.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {uploadingFiles.map((file) => (
                      <UploadingFileItem
                        key={file.id}
                        file={file}
                        onCancel={(id) => {
                          console.log("Cancel upload:", id);
                        }}
                      />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      <ScheduleSendDialog
        open={scheduleOpen}
        onOpenChange={setScheduleOpen}
        isSubmitting={isScheduling}
        onConfirm={async (iso) => {
          try {
            await scheduleMessage({
              scheduledAtIso: iso,
              alsoSendToChannel: false,
            })
            setScheduleOpen(false)
          } catch {
            /* toast trong hook */
          }
        }}
      />

      <CustomDialog
        open={!!messageToDelete}
        onOpenChange={(open) => !open && setMessageToDelete(null)}
      >
        <CustomDialogHeader onOpenChange={() => setMessageToDelete(null)}>
          <CustomDialogTitle>{t("message.deleteMessage")}</CustomDialogTitle>
        </CustomDialogHeader>
        <CustomDialogBody>
          <p className="text-[15px] dark:text-[#d1d2d3]">
            {t("message.deleteMessageConfirmation")}
          </p>
        </CustomDialogBody>
        <CustomDialogFooter>
          <Button
            variant="outline"
            className="dark:text-white"
            onClick={() => setMessageToDelete(null)}
          >
            {t("message.cancel")}
          </Button>
          <Button
            variant="destructive"
            onClick={() => {
              if (messageToDelete) {
                deleteMessage({ messageId: messageToDelete });
                setMessageToDelete(null);
              }
            }}
          >
            {t("message.delete")}
          </Button>
        </CustomDialogFooter>
      </CustomDialog>
    </div>
  );
};

export default MessageTab;
