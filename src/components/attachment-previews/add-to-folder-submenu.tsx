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
import { useAppTranslation } from "@/hooks/use-translation";
import { useFolderDialogStore } from "@/stores/useFolderDialogStore";

const ITEM =
  "px-5 py-1.5 cursor-pointer text-sm hover:text-white hover:bg-selection-hover";

type Props = {
  targetId: string;
  attachmentId: string;
  className?: string;
  /** Mở flow tạo folder (thường chuyển tab Folders + dialog) */
  onRequestCreateFolder?: (attachmentId: string) => void;
  effectiveFolderId?: string | null;
  /** True nếu đang trong DM conversation, false nếu trong channel */
  isDM?: boolean;
};

export function AddToFolderSubmenu({
  targetId,
  attachmentId,
  className,
  onRequestCreateFolder,
  effectiveFolderId,
  isDM = false,
}: Props) {
  const t = useAppTranslation("attachments")
  const queryClient = useQueryClient();
  const folderDialog = useFolderDialogStore();

  // Use prop if provided, otherwise fallback to Zustand store
  const handleCreateFolder = onRequestCreateFolder
    ? () => onRequestCreateFolder?.(attachmentId)
    : () => folderDialog.open(targetId, isDM ?? false, attachmentId);

  const { data, isPending } = useQuery({
    queryKey: folderKeys.list(targetId),
    queryFn: () => listChannelFoldersApi(targetId, isDM),
  });

  const { mutate, isPending: isAdding } = useMutation({
    mutationFn: (folderId: string) =>
      addAttachmentToFolderApi(targetId, folderId, attachmentId, isDM),
    onSuccess: () => {
      toast.success(t("folder.addedToFolder"));
      void queryClient.invalidateQueries({
        queryKey: folderKeys.list(targetId),
      });
      void queryClient.invalidateQueries({
        predicate: (q) =>
          Array.isArray(q.queryKey) &&
          (q.queryKey[0] === "channels" || q.queryKey[0] === "conversations") &&
          q.queryKey[1] === targetId &&
          q.queryKey[2] === "folders" &&
          q.queryKey.length >= 5 &&
          q.queryKey[4] === "attachments",
      });
    },
    onError: (err: unknown) => {
      if (isAxiosError(err) && err.response?.status === 409) {
        // Attachment already exists in folder (backend returns ConflictException)
        toast.error(t("folder.alreadyInFolder"));
      } else {
        const msg = isAxiosError(err)
          ? ((err.response?.data as { message?: string })?.message ?? err.message)
          : t("folder.couldNotAdd");
        toast.error(typeof msg === "string" ? msg : t("folder.couldNotAdd"));
      }
    },
  });

  const folders = data?.folders ?? [];

  if (isPending) {
    return (
      <div className={cn("py-2 px-3 text-[13px] text-[#797c81]", className)}>
        {t("folder.loading")}
      </div>
    );
  }

  if (folders.length === 0) {
    return (
      <div className={cn("py-2 min-w-[200px]", className)}>
        <p className="px-3 text-[13px] text-[#616061] dark:text-[#ababad] mb-2">
          {t("folder.noFolders")}
        </p>
        <button
          type="button"
          className={ITEM + " w-full text-left"}
          onClick={(e) => {
            e.stopPropagation();
            handleCreateFolder();
          }}
        >
          <Typography variant="p" text={t("folder.createFolder")} />
        </button>
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
      <Button
        variant="submenu"
        onClick={(e) => {
          e.stopPropagation();
          handleCreateFolder();
        }}
      >
        <Typography variant="p" text={t("folder.newFolder")} />
      </Button>
    </div>
  );
}
