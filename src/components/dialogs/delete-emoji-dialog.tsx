"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkspaceCustomEmoji } from "@/lib/types";

import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Typography from "@/components/ui/typography";

type DeleteEmojiDialogItem = WorkspaceCustomEmoji & {
  label: string;
  kind: "original" | "alias";
};

export function DeleteEmojiDialog({
  open,
  onOpenChange,
  title,
  description,
  items,
  defaultSelectedId,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: DeleteEmojiDialogItem[];
  defaultSelectedId: string | null;
  onDelete: (emojiId: string) => Promise<void>;
}) {
  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectedId ? [defaultSelectedId] : []);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const originalItem = useMemo(
    () => items.find((item) => item.kind === "original") ?? null,
    [items],
  );
  const aliasItems = useMemo(
    () => items.filter((item) => item.kind === "alias"),
    [items],
  );

  useEffect(() => {
    if (!open) {
      setSelectedIds(defaultSelectedId ? [defaultSelectedId] : []);
      setError(null);
      setIsSubmitting(false);
      return;
    }
    if (defaultSelectedId && originalItem?.id === defaultSelectedId) {
      setSelectedIds([originalItem.id, ...aliasItems.map((item) => item.id)]);
      return;
    }
    setSelectedIds(defaultSelectedId ? [defaultSelectedId] : []);
  }, [aliasItems, defaultSelectedId, open, originalItem]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIds.includes(item.id)),
    [items, selectedIds],
  );
  const isOriginalSelected = Boolean(
    originalItem && selectedIds.includes(originalItem.id),
  );

  const handleDelete = async () => {
    if (selectedItems.length === 0) {
      setError("Please choose at least one item to delete");
      return;
    }

    setIsSubmitting(true);
    try {
      if (isOriginalSelected && originalItem) {
        await onDelete(originalItem.id);
      } else {
        for (const item of selectedItems) {
          await onDelete(item.id);
        }
      }
      onOpenChange(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Failed to delete emoji",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="720px">
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{title}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="space-y-4">
        <Typography
          className="text-[15px] leading-6 text-[#1d1c1d] dark:text-[#d1d2d3]"
          text={description}
        />
        <Separator />
        <div className="max-h-[320px] overflow-y-auto rounded-md border border-[#ece8ec] dark:border-[#2c2e33]">
          {items.map((item) => {
            const selected = selectedIds.includes(item.id);
            const disabled = item.kind === "alias" && isOriginalSelected;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  if (disabled) return;

                  if (item.kind === "original") {
                    setSelectedIds((current) => {
                      const nextHasOriginal = !current.includes(item.id);
                      if (!nextHasOriginal) {
                        return current.filter((id) => id !== item.id);
                      }
                      const aliasIds = aliasItems.map((alias) => alias.id);
                      return Array.from(new Set([item.id, ...aliasIds]));
                    });
                    return;
                  }

                  setSelectedIds((current) =>
                    current.includes(item.id)
                      ? current.filter((id) => id !== item.id)
                      : [...current, item.id],
                  );
                }}
                className={`flex w-full items-center gap-4 border-b border-[#ece8ec] px-4 py-3 text-left last:border-b-0 dark:border-[#2c2e33] ${
                  selected
                    ? "bg-[#f8f8f8] dark:bg-[#1e2227]"
                    : "bg-white dark:bg-[#141619]"
                } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
              >
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[#ece8ec] bg-white dark:border-[#2c2e33] dark:bg-[#141619]">
                  <img
                    src={item.imageUrl}
                    alt={`:${item.name}:`}
                    className="h-full w-full object-contain"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]">
                    :{item.name}:
                  </div>
                  <div className="text-[12px] text-[#616061] dark:text-[#ababad]">
                    {item.label}
                  </div>
                </div>
                <div className="text-[#d62929]">
                  <input
                    type="checkbox"
                    readOnly
                    checked={selected}
                    aria-label={`Select ${item.name}`}
                    className="size-3 cursor-pointer accent-selection-hover disabled:cursor-not-allowed"
                    disabled={disabled}
                  />
                </div>
              </button>
            );
          })}
        </div>
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      </CustomDialogBody>
      <CustomDialogFooter className="justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="destructive"
          onClick={() => void handleDelete()}
          disabled={selectedItems.length === 0 || isSubmitting}
        >
          {isSubmitting ? "Deleting..." : "Delete"}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
