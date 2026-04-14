"use client";

import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import { useUpdateChannel } from "@/hooks/use-channel";
import type { Channel } from "@/lib/types";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { isAxiosError } from "axios";
import { Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { BiHash } from "react-icons/bi";
import { toast } from "sonner";

const NAME_PATTERN = /^[a-z0-9-_]+$/;

type EditField = "name" | "topic" | "description" | null;

export default function AboutTab({
  currentChannelData,
}: {
  currentChannelData: Channel;
}) {
  const workspaceId = currentChannelData.workspaceId;
  const channelId = currentChannelData.id;
  const { mutateAsync: updateChannel, isPending } = useUpdateChannel(
    workspaceId,
    channelId,
  );

  const [editField, setEditField] = useState<EditField>(null);
  const [draft, setDraft] = useState("");

  const openEdit = useCallback(
    (field: Exclude<EditField, null>) => {
      setEditField(field);
      if (field === "name") setDraft(currentChannelData.name);
      else if (field === "topic") setDraft(currentChannelData.topic ?? "");
      else setDraft(currentChannelData.description ?? "");
    },
    [currentChannelData],
  );

  const closeEdit = useCallback(() => {
    setEditField(null);
    setDraft("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editField) return;
    try {
      if (editField === "name") {
        const t = draft.trim();
        if (t.length < 2 || t.length > 80) {
          toast.error("Name must be 2–80 characters");
          return;
        }
        if (!NAME_PATTERN.test(t)) {
          toast.error(
            "Only lowercase letters, numbers, hyphens and underscores",
          );
          return;
        }
        await updateChannel({ name: t });
        toast.success("Channel name updated");
      } else if (editField === "topic") {
        const v = draft.trim();
        await updateChannel({ topic: v.length ? v : null });
        toast.success("Topic updated");
      } else {
        const v = draft.trim();
        await updateChannel({ description: v.length ? v : null });
        toast.success("Description updated");
      }
      closeEdit();
    } catch (e: unknown) {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? e.message
        : "Update failed";
      toast.error(typeof msg === "string" ? msg : "Update failed");
    }
  }, [editField, draft, updateChannel, closeEdit]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-[#797c814d] bg-white p-4 dark:bg-[#1A1D21]">
        <div className="flex items-center justify-between gap-2">
          <Typography text="Channel name" className="font-bold" />
            <button
              type="button"
              onClick={() => openEdit("name")}
              className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
            >
              Edit
            </button>
        </div>
        <div className="flex items-center gap-0.5">
          <BiHash size={14} className="text-[#8e9297]" />
          <Typography
            text={currentChannelData.name}
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        {currentChannelData.isDefaultChannel ? (
          <Typography
            variant="p"
            text="This is the default channel for the workspace — new members land here."
            className="mt-2 text-[12px] text-[#616061] dark:text-[#ababad]"
          />
        ) : null}
      </div>

      <div className="rounded-md border border-[#797c814d] bg-white dark:bg-[#1A1D21]">
        <div className="border-b border-[#797c814d] p-4">
          <div className="flex items-center justify-between gap-2">
            <Typography text="Topic" className="font-bold" />
            <button
              type="button"
              onClick={() => openEdit("topic")}
              className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
            >
              Edit
            </button>
          </div>
          <Typography
            text={
              currentChannelData.topic?.trim()
                ? currentChannelData.topic
                : "Add a topic to the channel"
            }
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        <div className="border-b border-[#797c814d] p-4">
          <div className="flex items-center justify-between gap-2">
            <Typography text="Description" className="font-bold" />
            <button
              type="button"
              onClick={() => openEdit("description")}
              className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
            >
              Edit
            </button>
          </div>
          <Typography
            text={
              currentChannelData.description?.trim()
                ? currentChannelData.description
                : "Add a description to the channel"
            }
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        <div className="p-4">
          <Typography text="Created on" className="font-bold" />
          <Typography
            text={format(currentChannelData.createdAt, "EEEE, MMMM d, yyyy", {
              locale: enUS,
            })}
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[#8e9297]">
        <Typography
          text={`Channel ID: ${currentChannelData.id}`}
          className="text-xs"
        />
        <Copy
          size={12}
          className="cursor-pointer"
          onClick={() => {
            void navigator.clipboard.writeText(currentChannelData.id);
            toast.success("Channel ID copied to clipboard");
          }}
        />
      </div>

      <CustomDialog
        open={editField !== null}
        onOpenChange={(open) => !open && closeEdit()}
        maxWidth="440px"
      >
        <CustomDialogHeader onOpenChange={closeEdit}>
          <CustomDialogTitle>
            <Typography
              text={
                editField === "name"
                  ? "Edit channel name"
                  : editField === "topic"
                    ? "Edit topic"
                    : "Edit description"
              }
              className="text-[17px] font-bold"
            />
          </CustomDialogTitle>
        </CustomDialogHeader>
        <CustomDialogBody className="space-y-3">
          {editField === "name" ? (
            <>
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="channel-name"
                className="font-mono text-[14px]"
                autoFocus
              />
              <Typography
                variant="p"
                text="Lowercase letters, numbers, hyphens and underscores only."
                className="text-[12px] text-[#616061] dark:text-[#ababad]"
              />
            </>
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={editField === "topic" ? 3 : 5}
              className="min-h-0 resize-y text-[14px]"
              placeholder={
                editField === "topic" ? "What is this channel about?" : ""
              }
              autoFocus
            />
          )}
        </CustomDialogBody>
        <CustomDialogFooter>
          <Button type="button" variant="outline" onClick={closeEdit}>
            Cancel
          </Button>
          <Button
            type="button"
            variant="success"
            disabled={isPending}
            onClick={() => void saveEdit()}
          >
            Save
          </Button>
        </CustomDialogFooter>
      </CustomDialog>
    </div>
  );
}
