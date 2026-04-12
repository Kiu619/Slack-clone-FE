"use client";

import { addAttachmentToFolderApi, listChannelFoldersApi } from "@/apis";
import { folderKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { toast } from "sonner";
import { Separator } from "../ui/separator";
import Typography from "../ui/typography";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";

const ITEM =
  "px-5 py-1.5 cursor-pointer text-sm hover:text-white hover:bg-selection-hover";

type Props = {
  channelId: string;
  attachmentId: string;
  className?: string;
  /** Mở flow tạo folder (thường chuyển tab Folders + dialog) */
  onRequestCreateFolder?: () => void;
  effectiveFolderId?: string | null;
};

export function AddToFolderSubmenu({
  channelId,
  attachmentId,
  className,
  onRequestCreateFolder,
  effectiveFolderId,
}: Props) {
  const queryClient = useQueryClient();
  const { data, isPending } = useQuery({
    queryKey: folderKeys.list(channelId),
    queryFn: () => listChannelFoldersApi(channelId),
  });

  const { mutate, isPending: isAdding } = useMutation({
    mutationFn: (folderId: string) =>
      addAttachmentToFolderApi(channelId, folderId, attachmentId),
    onSuccess: () => {
      toast.success("Added to folder");
      void queryClient.invalidateQueries({
        queryKey: folderKeys.list(channelId),
      });
      void queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          q.queryKey[0] === "channels" &&
          q.queryKey[1] === channelId &&
          q.queryKey[2] === "folders" &&
          q.queryKey.length >= 5 &&
          q.queryKey[4] === "attachments",
      });
    },
    onError: (err: unknown) => {
      const msg = isAxiosError(err)
        ? ((err.response?.data as { message?: string })?.message ?? err.message)
        : "Could not add to folder";
      toast.error(typeof msg === "string" ? msg : "Could not add to folder");
    },
  });

  const folders = data?.folders ?? [];

  if (isPending) {
    return (
      <div className={cn("py-2 px-3 text-[13px] text-[#797c81]", className)}>
        Loading folders…
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className={cn("py-2 min-w-[200px]", className)}>
        <p className="px-3 text-[13px] text-[#616061] dark:text-[#ababad] mb-2">
          No folders yet.
        </p>
        {onRequestCreateFolder ? (
          <button
            type="button"
            className={ITEM + " w-full text-left"}
            onClick={(e) => {
              e.stopPropagation();
              onRequestCreateFolder();
            }}
          >
            <Typography variant="p" text="Create folder" />
          </button>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "py-1 min-w-[200px] max-h-[280px] overflow-y-auto",
        className,
      )}
    >
      {folders.map(
        (f, i) =>
          effectiveFolderId !== f.id && (
            <div key={f.id}>
              <Button
                variant="submenu"
                disabled={isAdding}
                onClick={(e) => {
                  e.stopPropagation();
                  mutate(f.id);
                }}
              >
                <Typography variant="p" text={f.name} className="truncate" />
              </Button>
              {i < folders.length - 1 ? (
                <Separator className="my-0.5 bg-[#797c814d]" />
              ) : null}
            </div>
          ),
      )}
      {onRequestCreateFolder ? (
        <>
          <Button
            variant="submenu"
            onClick={(e) => {
              e.stopPropagation();
              onRequestCreateFolder();
            }}
          >
            <Typography variant="p" text="New folder…" />
          </Button>
        </>
      ) : null}
    </div>
  );
}
