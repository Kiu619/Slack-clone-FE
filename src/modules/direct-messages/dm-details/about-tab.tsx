"use client";

import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Typography from "@/components/ui/typography";
import { useUpdateConversation } from "@/hooks/use-conversation";
import type { DirectMessageConversation } from "@/lib/types";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";
import { isAxiosError } from "axios";
import { useCallback, useState } from "react";
import { LuUserPlus } from "react-icons/lu";
import { toast } from "sonner";
import AddDmPeopleDialog from "./add-dm-people-dialog";
import { Copy } from "lucide-react";

type EditField = "topic" | "description" | null;

export default function AboutTab({
  currentDmData,
}: {
  currentDmData: DirectMessageConversation;
}) {
  const workspaceId = currentDmData.workspaceId;
  const conversationId = currentDmData.id;
  const { mutateAsync: updateConversation, isPending } = useUpdateConversation(
    workspaceId,
    conversationId,
  );

  const [editField, setEditField] = useState<EditField>(null);
  const [draft, setDraft] = useState("");
  const [openAddPeople, setOpenAddPeople] = useState(false);

  const showAddPeopleCta =
    !currentDmData.isGroup && currentDmData.members.length < 9;

  const openEdit = useCallback(
    (field: Exclude<EditField, null>) => {
      setEditField(field);
      if (field === "topic") setDraft(currentDmData.topic ?? "");
      else setDraft(currentDmData.description ?? "");
    },
    [currentDmData],
  );

  const closeEdit = useCallback(() => {
    setEditField(null);
    setDraft("");
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editField) return;
    try {
      if (editField === "topic") {
        const v = draft.trim();
        await updateConversation({ topic: v.length ? v : null });
        toast.success("Topic updated");
      } else {
        const v = draft.trim();
        await updateConversation({ description: v.length ? v : null });
        toast.success("Description updated");
      }
      closeEdit();
    } catch (e: unknown) {
      console.error(e);
      const msg = isAxiosError(e)
        ? ((e.response?.data as { message?: string })?.message ?? e.message)
        : "Update failed";
      toast.error(typeof msg === "string" ? msg : "Update failed");
    }
  }, [editField, draft, updateConversation, closeEdit]);

  return (
    <div className="flex flex-col gap-4">
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
              currentDmData.topic?.trim() ? currentDmData.topic : "Add a topic"
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
              currentDmData.description?.trim()
                ? currentDmData.description
                : "Add a description"
            }
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        <div className="p-4">
          <Typography text="Created on" className="font-bold" />
          <Typography
            text={format(currentDmData.createdAt, "EEEE, MMMM d, yyyy", {
              locale: enUS,
            })}
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
      </div>

      {showAddPeopleCta ? (
        <div className="rounded-md border border-[#797c814d] bg-white p-4 dark:bg-[#1A1D21]">
          <button
            type="button"
            onClick={() => setOpenAddPeople(true)}
            className="flex w-full items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/15 dark:text-[#1d9bd1]">
              <LuUserPlus className="size-5" aria-hidden />
            </span>
            <Typography
              text="Add people to this conversation"
              className="text-[15px] font-semibold text-[#1264a3] dark:text-[#1d9bd1]"
            />
          </button>
        </div>
      ) : null}

      <div className="flex items-center gap-2 text-[#8e9297]">
        <Typography
          text={`Conversation ID: ${currentDmData.id}`}
          className="text-xs"
        />
        <Copy
          size={12}
          className="cursor-pointer"
          onClick={() => {
            void navigator.clipboard.writeText(currentDmData.id);
            toast.success("Channel ID copied to clipboard");
          }}
        />
      </div>

      <AddDmPeopleDialog
        open={openAddPeople}
        onOpenChange={setOpenAddPeople}
        workspaceId={workspaceId}
        conversationId={conversationId}
        memberIdsInConversation={currentDmData.members.map((m) => m.id)}
      />

      <CustomDialog
        open={editField !== null}
        onOpenChange={(open) => !open && closeEdit()}
        maxWidth="440px"
      >
        <CustomDialogHeader onOpenChange={closeEdit}>
          <CustomDialogTitle>
            <Typography
              text={editField === "topic" ? "Edit topic" : "Edit description"}
              className="text-[17px] font-bold"
            />
          </CustomDialogTitle>
        </CustomDialogHeader>
        <CustomDialogBody className="space-y-3">
          <Textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={editField === "topic" ? 3 : 5}
            className="min-h-0 resize-y text-[14px]"
            placeholder={
              editField === "topic"
                ? "What is this conversation about?"
                : "Add a description to the conversation"
            }
            autoFocus
          />
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
