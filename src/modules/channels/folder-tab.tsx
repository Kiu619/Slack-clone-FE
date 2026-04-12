"use client";

import { deleteChannelFolderApi } from "@/apis";
import FilePreview from "@/components/attachment-previews/file-preview";
import { ConfirmDeleteFolderDialog } from "@/components/dialogs/confirm-delete-folder-dialog";
import { RenameFolderDialog } from "@/components/dialogs/rename-folder-dialog";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import { useChannelFolders } from "@/hooks/use-channel-folders";
import { useFolderAttachments } from "@/hooks/use-folder-attachments";
import { folderKeys, messageKeys } from "@/lib/query-keys";
import type { Channel, ChannelFolder } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { File, Laptop, Loader2, LucideMoreVertical } from "lucide-react";
import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";
import { FiPlus } from "react-icons/fi";
import { toast } from "sonner";
import { Virtuoso } from "react-virtuoso";
import { useThemeStore } from "@/stores/useThemeStore";
import { useFileUpload } from "@/hooks/use-file-upload";

export default function FolderTab({
  currentChannelData,
  onOpenCreateFolderDialog,
  onGoToFilesTab,
}: {
  currentChannelData: Channel;
  onOpenCreateFolderDialog?: () => void;
  onGoToFilesTab?: () => void;
}) {
  const channelId = currentChannelData.id;
  const { theme: storeTheme } = useThemeStore();
  const queryClient = useQueryClient();
  const { data, isPending, isError, refetch } = useChannelFolders(channelId);
  const folders = useMemo(() => data?.folders ?? [], [data?.folders]);

  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [renameFolder, setRenameFolder] = useState<ChannelFolder | null>(null);
  const [deleteFolder, setDeleteFolder] = useState<ChannelFolder | null>(null);
  const [plusOpen, setPlusOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { uploadFileToFolder, uploadingFiles } = useFileUpload();

  const effectiveFolderId = useMemo(() => {
    if (folders.length === 0) return null;
    if (
      selectedFolderId &&
      folders.some((f) => f.id === selectedFolderId)
    ) {
      return selectedFolderId;
    }
    return folders[0]!.id;
  }, [folders, selectedFolderId]);

  const attachmentsQuery = useFolderAttachments(channelId, effectiveFolderId);
  const {
    data: attData,
    isPending: attPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = attachmentsQuery;

  const items = useMemo(() => {
    if (!attData?.pages?.length) return [];
    return attData.pages.flatMap((p) => p.results);
  }, [attData]);

  const { mutate: removeFolder } = useMutation({
    mutationFn: (folderId: string) =>
      deleteChannelFolderApi(channelId, folderId),
    onSuccess: () => {
      toast.success("Folder deleted");
      void queryClient.invalidateQueries({
        queryKey: folderKeys.list(channelId),
      });
      setDeleteFolder(null);
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err)
        ? (err.response?.data as { message?: string })?.message ??
          err.message
        : "Delete failed";
      toast.error(typeof msg === "string" ? msg : "Delete failed");
    },
  });

  const selectedFolder =
    folders.find((f) => f.id === effectiveFolderId) ?? null;

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const virtuosoComponents = useMemo(
    () => ({
      Footer: () => (
        <div className="min-h-4">
          {isFetchingNextPage ? (
            <p className="py-3 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
              Loading more…
            </p>
          ) : null}
        </div>
      ),
    }),
    [isFetchingNextPage],
  );

  const invalidateAfterFolderUpload = useCallback(() => {
    if (effectiveFolderId) {
      void queryClient.invalidateQueries({
        queryKey: folderKeys.attachments(channelId, effectiveFolderId),
      });
    }
    void queryClient.invalidateQueries({
      predicate: (q) =>
        Array.isArray(q.queryKey) &&
        q.queryKey[0] === "channels" &&
        q.queryKey[1] === channelId &&
        q.queryKey[2] === "folders" &&
        q.queryKey.length >= 5 &&
        q.queryKey[4] === "attachments",
    });
    void queryClient.invalidateQueries({
      queryKey: messageKeys.list(channelId),
    });
    void queryClient.invalidateQueries({
      queryKey: messageKeys.channelAttachments(channelId),
    });
  }, [channelId, effectiveFolderId, queryClient]);

  const handleUploadInputChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const list = e.target.files;
      if (!list?.length || !effectiveFolderId) return;
      // Snapshot files before reset: FileList is live; clearing value can empty it.
      const files = Array.from(list);
      e.target.value = "";
      setPlusOpen(false);
      let ok = 0;
      for (const file of files) {
        try {
          await uploadFileToFolder(file, channelId, effectiveFolderId);
          ok += 1;
        } catch {
          toast.error(`Could not upload: ${file.name}`);
        }
      }
      if (ok > 0) {
        toast.success(ok === 1 ? "File added to folder" : `${ok} files added to folder`);
        invalidateAfterFolderUpload();
      }
    },
    [
      channelId,
      effectiveFolderId,
      invalidateAfterFolderUpload,
      uploadFileToFolder,
    ],
  );

  if (isPending) {
    return (
      <div className="flex flex-col w-[1050px] mx-auto mt-3 gap-3 px-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col w-[1050px] mx-auto mt-6 items-center gap-2 px-4">
        <Typography
          variant="p"
          text="Could not load folders."
          className="text-[#616061] dark:text-[#ababad]"
        />
        <Button type="button" variant="ghost" onClick={() => void refetch()}>
          Retry
        </Button>
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className="flex flex-col w-[1050px] mx-auto mt-8 items-center gap-4 px-4 text-center">
        <Typography
          variant="h4"
          text="No folders in this channel yet"
          className="font-semibold"
        />
        <Typography
          variant="p"
          text="Create a folder to organize files from this channel."
          className="text-[#616061] dark:text-[#ababad] max-w-md"
        />
        {onOpenCreateFolderDialog ? (
          <Button type="button" variant="success" onClick={onOpenCreateFolderDialog}>
            Create folder
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-[1050px] mx-auto mt-3 min-h-0 flex-1 gap-0 min-w-0">
      {/* Sub-tabs: một tab mỗi folder */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-[#797c814d] shrink-0 px-1">
        {folders.map((f) => {
          const active = f.id === effectiveFolderId;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setSelectedFolderId(f.id)}
              className={cn(
                "shrink-0 px-3 py-2 text-[13px] font-semibold rounded-t-md border-b-2 transition-colors max-w-[200px] truncate",
                active
                  ? ""
                  : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
              )}
              style={
                active
                  ? {
                      borderColor: storeTheme.selectedItems,
                      borderBottomWidth: 3,
                      color: storeTheme.selectedItems,
                    }
                  : {}
              }
              title={f.name}
            >
              {f.name}
            </button>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-2 px-1 pt-3 pb-2 shrink-0">
        <Typography
          variant="p"
          text={selectedFolder?.name ?? ""}
          className="text-[15px] font-semibold truncate min-w-0"
        />
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleUploadInputChange}
          />
          <Popover open={plusOpen} onOpenChange={setPlusOpen}>
            <PopoverTrigger asChild>
              <Button variant="success" size="icon" type="button">
                <FiPlus size={16} className="text-white" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-52" align="end">
              <div className="flex flex-col py-2">
                <Button
                  variant="submenu"
                  onClick={() => {
                    setPlusOpen(false);
                    onGoToFilesTab?.();
                  }}
                >
                  <File size={16} />
                  <Typography text="Add from Files tab" variant="p" />
                </Button>
                <Separator className="my-1" />
                <Button
                  variant="submenu"
                  onClick={() => {
                    setPlusOpen(false);
                    fileInputRef.current?.click();
                  }}
                >
                  <Laptop size={16} />
                  <Typography text="Upload file" variant="p" />
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon">
                <LucideMoreVertical size={16} />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-44">
              <div className="flex flex-col py-2">
                <button
                  type="button"
                  className="flex w-full items-center gap-x-2 hover:text-white! hover:bg-selection-hover! px-5 py-1 cursor-pointer text-left"
                  onClick={() => selectedFolder && setRenameFolder(selectedFolder)}
                >
                  <Typography text="Rename folder" variant="p" />
                </button>
                <Separator className="my-1" />
                <button
                  type="button"
                  className="flex items-center gap-x-2 text-red-500 hover:text-white! hover:bg-red-700! px-5 py-1 cursor-pointer text-left"
                  onClick={() => selectedFolder && setDeleteFolder(selectedFolder)}
                >
                  <Typography text="Delete folder" variant="p" />
                </button>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {uploadingFiles.some((u) => u.status === "uploading") ? (
        <div className="px-3 py-2 shrink-0 flex flex-wrap gap-2 items-center text-[13px] text-[#616061] dark:text-[#ababad] border-b border-[#797c814d]/50">
          <Loader2 className="size-4 animate-spin shrink-0" />
          <span>
            Uploading{" "}
            {uploadingFiles.find((u) => u.status === "uploading")?.file.name}
            …
          </span>
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-1 pb-6">
        {attPending && items.length === 0 ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <Typography
            variant="p"
            text="This folder is empty."
            className="text-[#616061] dark:text-[#ababad] py-8 text-center px-4"
          />
        ) : (
          <div className="min-h-0 min-w-0 flex-1">
            <Virtuoso
              style={{ height: "100%" }}
              className="min-w-0"
              data={items}
              components={virtuosoComponents}
              defaultItemHeight={92}
              increaseViewportBy={{ top: 120, bottom: 240 }}
              atBottomThreshold={120}
              endReached={handleEndReached}
              computeItemKey={(_, item) => item.attachment.id}
              itemContent={(_, item) => (
                <div className="min-w-0 pb-2">
                  <FilePreview
                    message={item.message}
                    attachment={item.attachment}
                    fromFilesTab
                    effectiveFolderId={effectiveFolderId}
                  />
                </div>
              )}
            />
          </div>
        )}
      </div>

      <RenameFolderDialog
        open={!!renameFolder}
        onOpenChange={(o) => {
          if (!o) setRenameFolder(null);
        }}
        channelId={channelId}
        folder={renameFolder}
      />

      <ConfirmDeleteFolderDialog
        open={!!deleteFolder}
        onOpenChange={(o) => {
          if (!o) setDeleteFolder(null);
        }}
        folderName={deleteFolder?.name ?? ""}
        onConfirm={() => {
          if (deleteFolder) removeFolder(deleteFolder.id);
        }}
      />
    </div>
  );
}
