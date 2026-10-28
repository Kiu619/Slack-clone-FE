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
import { cn } from "@/lib/utils";
import {
  getChannelNameError,
  getChannelNameInvalidChars,
  isValidChannelName,
  normalizeChannelNameInput,
  slugifyChannelName,
} from "@/lib/channel-slug";
import { format } from "date-fns";
import { isAxiosError } from "axios";
import { Copy } from "lucide-react";
import { useCallback, useState } from "react";
import { BiHash } from "react-icons/bi";
import { toast } from "sonner";
import { useAppTranslation } from "@/hooks/use-translation";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";

type EditField = "name" | "topic" | "description" | null;

export default function AboutTab({
  currentChannelData,
  isMember,
}: {
  currentChannelData: Channel;
  isMember: boolean;
}) {
  const workspaceId = currentChannelData.workspaceId;
  const channelId = currentChannelData.id;
  const { mutateAsync: updateChannel, isPending } = useUpdateChannel(
    workspaceId,
    channelId,
  );
  const t = useAppTranslation('channel.about')
  const language = useLanguageRegionStore((s) => s.language)

  const [editField, setEditField] = useState<EditField>(null);
  const [draft, setDraft] = useState("");
  const [invalidChars, setInvalidChars] = useState<string[]>([]);

  const openEdit = useCallback(
    (field: Exclude<EditField, null>) => {
      setEditField(field);
      setInvalidChars([]);
      if (field === "name") setDraft(currentChannelData.name);
      else if (field === "topic") setDraft(currentChannelData.topic ?? "");
      else setDraft(currentChannelData.description ?? "");
    },
    [currentChannelData],
  );

  const closeEdit = useCallback(() => {
    setEditField(null);
    setDraft("");
    setInvalidChars([]);
  }, []);

  const saveEdit = useCallback(async () => {
    if (!editField) return;
    try {
      if (editField === "name") {
        const trimmedDraft = draft.trim();
        const errorMessage = getChannelNameError(trimmedDraft);
        if (errorMessage !== null) {
          toast.error(errorMessage);
          return;
        }
        if (!isValidChannelName(trimmedDraft)) {
          toast.error(t('nameOnlyLowercase'));
          return;
        }
        await updateChannel({ name: slugifyChannelName(trimmedDraft) });
        toast.success(t('channelNameUpdated'));
      } else if (editField === "topic") {
        const v = draft.trim();
        await updateChannel({ topic: v.length ? v : null });
        toast.success(t('topicUpdated'));
      } else {
        const v = draft.trim();
        await updateChannel({ description: v.length ? v : null });
        toast.success(t('descriptionUpdated'));
      }
      closeEdit();
    } catch (e: unknown) {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? e.message
        : t('updateFailed');
      toast.error(typeof msg === "string" ? msg : t('updateFailed'));
    }
  }, [editField, draft, updateChannel, closeEdit, t]);

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-[#797c814d] bg-white p-4 dark:bg-[#1A1D21]">
        <div className="flex items-center justify-between gap-2">
          <Typography text={t('channelName')} className="font-bold" />
            {isMember ? (
              <button
                type="button"
                onClick={() => openEdit("name")}
                className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
              >
                {t('edit')}
              </button>
            ) : null}
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
            text={t('defaultChannelNote')}
            className="mt-2 text-[12px] text-[#616061] dark:text-[#ababad]"
          />
        ) : null}
      </div>

      <div className="rounded-md border border-[#797c814d] bg-white dark:bg-[#1A1D21]">
        <div className="border-b border-[#797c814d] p-4">
          <div className="flex items-center justify-between gap-2">
            <Typography text={t('topic')} className="font-bold" />
            {isMember ? (
              <button
                type="button"
                onClick={() => openEdit("topic")}
                className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
              >
                {t('edit')}
              </button>
            ) : null}
          </div>
          <Typography
            text={
              currentChannelData.topic?.trim()
                ? currentChannelData.topic
                : t('addTopic')
            }
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        <div className="border-b border-[#797c814d] p-4">
          <div className="flex items-center justify-between gap-2">
            <Typography text={t('description')} className="font-bold" />
            {isMember ? (
              <button
                type="button"
                onClick={() => openEdit("description")}
                className="w-fit shrink-0 text-left text-[12px] font-semibold text-selection-hover hover:underline sm:text-[13px] dark:text-selection-hover! dark:hover:bg-transparent! dark:hover:text-selection-hover! hover:bg-transparent! hover:text-selection-hover!"
              >
                {t('edit')}
              </button>
            ) : null}
          </div>
          <Typography
            text={
              currentChannelData.description?.trim()
                ? currentChannelData.description
                : t('addDescription')
            }
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
        <div className="p-4">
          <Typography text={t('createdOn')} className="font-bold" />
          <Typography
            text={format(
              currentChannelData.createdAt,
              language === "vi" ? "dd/MM/yyyy" : "MM/dd/yyyy"
            )}
            variant="p"
            className="text-[14px] text-[#8e9297]"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-[#8e9297]">
        <Typography
          text={`${t('channelId')}: ${currentChannelData.id}`}
          className="text-xs"
        />
        <Copy
          size={12}
          className="cursor-pointer"
          onClick={() => {
            void navigator.clipboard.writeText(currentChannelData.id);
            toast.success(t('channelIdCopied'));
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
                  ? t('editChannelName')
                  : editField === "topic"
                    ? t('editTopic')
                    : t('editDescription')
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
                onChange={(e) => {
                  const next = normalizeChannelNameInput(e.target.value);
                  setDraft(next);
                  setInvalidChars(getChannelNameInvalidChars(next));
                }}
                placeholder={t('namePlaceholder')}
                className={cn(
                  "font-mono text-[14px]",
                  invalidChars.length > 0 &&
                    "border-red-500 focus-visible:ring-red-500",
                )}
                autoFocus
              />
              {invalidChars.length > 0 ? (
                <Typography
                  variant="p"
                  text={t('channelNameInvalidChars').replace(
                    '{chars}',
                    Array.from(new Set(invalidChars)).join(' '),
                  )}
                  className="text-[12px] text-red-500 dark:text-red-400"
                />
              ) : (
                <Typography
                  variant="p"
                  text={t('nameHint')}
                  className="text-[12px] text-[#616061] dark:text-[#ababad]"
                />
              )}
            </>
          ) : (
            <Textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={editField === "topic" ? 3 : 5}
              className="min-h-0 resize-y text-[14px]"
              placeholder={
                editField === "topic" ? t('topicPlaceholder') : t('descriptionPlaceholder')
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
