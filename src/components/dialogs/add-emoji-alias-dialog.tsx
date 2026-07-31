"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState } from "react";
import { type EmojiClickData, Theme } from "emoji-picker-react";

import { CustomDialog, CustomDialogBody, CustomDialogFooter, CustomDialogHeader, CustomDialogTitle } from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { buildCustomEmojiLookup, formatCustomEmojiShortcode, normalizeCustomEmojiName, toPickerCustomEmojis, validateCustomEmojiName } from "@/lib/custom-emojis";
import type { WorkspaceCustomEmoji } from "@/lib/types";
import { useTheme } from "next-themes";
import { useWorkspaceCustomEmojis } from "@/hooks/use-workspace-custom-emojis";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

export function AddEmojiAliasDialog({
  open,
  onOpenChange,
  canManageEmoji,
  emojis,
  existingNames,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageEmoji: boolean;
  emojis: WorkspaceCustomEmoji[];
  existingNames: Set<string>;
  onSubmit: (payload: { sourceEmojiId?: string; sourceDefaultEmoji?: string; alias: string }) => Promise<void>;
}) {
  const { theme } = useTheme();
  const [aliasName, setAliasName] = useState("");
  const [sourceEmojiId, setSourceEmojiId] = useState<string | null>(null);
  const [sourceDefaultEmoji, setSourceDefaultEmoji] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const aliasInputRef = useRef<HTMLInputElement | null>(null);

  const { data: remoteEmojis } = useWorkspaceCustomEmojis(
    emojis[0]?.workspaceId,
    {
      enabled: emojis.length === 0,
    },
  );
  const sourceEmojis = emojis.length > 0 ? emojis : remoteEmojis ?? [];
  const customEmojiLookup = useMemo(() => buildCustomEmojiLookup(sourceEmojis), [sourceEmojis]);
  const customEmojiLookupById = useMemo(() => {
    const lookup = new Map<string, WorkspaceCustomEmoji>();
    sourceEmojis.forEach((emoji) => lookup.set(emoji.id, emoji));
    return lookup;
  }, [sourceEmojis]);
  const pickerCustomEmojis = useMemo(() => toPickerCustomEmojis(sourceEmojis), [sourceEmojis]);
  const sourceEmoji = useMemo(() => {
    if (sourceEmojiId) return customEmojiLookupById.get(sourceEmojiId) ?? null;
    return null;
  }, [customEmojiLookupById, sourceEmojiId]);

  useEffect(() => {
    if (!open) {
      setAliasName("");
      setSourceEmojiId(null);
      setSourceDefaultEmoji(null);
      setPickerOpen(false);
      setError(null);
      setIsSubmitting(false);
    }
  }, [open]);

  const aliasError = useMemo(() => {
    const validation = validateCustomEmojiName(aliasName);
    if (validation) return validation;
    if (existingNames.has(normalizeCustomEmojiName(aliasName))) {
      return "This emoji name already exists in the workspace";
    }
    return null;
  }, [aliasName, existingNames]);

  const canSave = Boolean(
    (sourceEmojiId || sourceDefaultEmoji) &&
      aliasName &&
      !aliasError &&
      canManageEmoji &&
      !isSubmitting,
  );

  const clampAliasCaret = () => {
    const input = aliasInputRef.current;
    if (!input) return;
    const value = input.value;
    const min = value.startsWith(":") ? 1 : 0;
    const max = value.endsWith(":") ? Math.max(min, value.length - 1) : value.length;
    const start = input.selectionStart ?? min;
    const end = input.selectionEnd ?? start;
    const nextStart = Math.min(Math.max(start, min), max);
    const nextEnd = Math.min(Math.max(end, min), max);
    if (start !== nextStart || end !== nextEnd) {
      input.setSelectionRange(nextStart, nextEnd);
    }
  };

  const handleSubmit = async () => {
    if (!sourceEmojiId && !sourceDefaultEmoji) {
      setError("Please choose an existing emoji");
      return;
    }
    if (aliasError) {
      setError(aliasError);
      return;
    }
    setIsSubmitting(true);
    try {
      await onSubmit({
        sourceEmojiId: sourceEmojiId ?? undefined,
        sourceDefaultEmoji: sourceDefaultEmoji ?? undefined,
        alias: normalizeCustomEmojiName(aliasName),
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Failed to create alias");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="680px">
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Add alias for an existing emoji</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="space-y-6">
        <Typography
          className="text-[15px] leading-6 text-[#1d1c1d] dark:text-[#d1d2d3]"
          text="Choose a standard emoji or a custom emoji, then give the alias a name."
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]">
            <span>1.</span>
            <span>Choose an existing emoji</span>
          </div>
          <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                disabled={!canManageEmoji}
                className="inline-flex h-11 items-center gap-3 rounded-md border border-[#d9d7da] bg-white px-4 text-left text-[15px] text-[#1d1c1d] hover:bg-[#f8f8f8] disabled:cursor-not-allowed disabled:opacity-70 dark:border-[#2c2e33] dark:bg-[#141619] dark:text-[#f2f2f2] dark:hover:bg-[#1e2227]"
              >
                <span className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-sm">
                  {sourceEmoji ? (
                    <img
                      src={sourceEmoji.imageUrl}
                      alt={`:${sourceEmoji.name}:`}
                      className="h-full w-full object-contain"
                    />
                  ) : (
                    <span className="text-xl leading-none">
                      {sourceDefaultEmoji || "?"}
                    </span>
                  )}
                </span>
                <span>
                  {sourceDefaultEmoji
                    ? sourceDefaultEmoji
                    : sourceEmoji
                      ? formatCustomEmojiShortcode(sourceEmoji.name)
                      : "Choose Emoji"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent
              side="bottom"
              align="start"
              sideOffset={8}
              className="w-auto border-none bg-transparent p-0 z-9999"
              withOverlay
              onOpenAutoFocus={(event) => event.preventDefault()}
            >
              <EmojiPicker
                onEmojiClick={(emojiData: EmojiClickData) => {
                  const pickedName = normalizeCustomEmojiName(
                    emojiData.names[0] ?? emojiData.emoji,
                  );
                  const picked =
                    emojiData.isCustom || customEmojiLookup.has(pickedName)
                    ? customEmojiLookup.get(pickedName) ?? null
                      : null;
                  if (picked) {
                    setSourceEmojiId(picked.id);
                    setSourceDefaultEmoji(null);
                  } else {
                    setSourceDefaultEmoji(emojiData.emoji);
                    setSourceEmojiId(null);
                  }
                  setPickerOpen(false);
                  if (error) setError(null);
                }}
                theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                width={340}
                height={420}
                className="z-[9999]"
                searchPlaceHolder="Search emoji..."
                previewConfig={{ showPreview: false }}
                customEmojis={pickerCustomEmojis}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]">
            <span>2.</span>
            <span>Enter an alias</span>
          </div>
          <Input
            ref={aliasInputRef}
            value={formatCustomEmojiShortcode(aliasName)}
            onChange={(event) => {
              const next = normalizeCustomEmojiName(event.target.value.replace(/:/g, ""));
              setAliasName(next);
              if (error) setError(null);
              requestAnimationFrame(clampAliasCaret);
            }}
            onFocus={() => requestAnimationFrame(clampAliasCaret)}
            onClick={() => requestAnimationFrame(clampAliasCaret)}
            onKeyUp={() => requestAnimationFrame(clampAliasCaret)}
            placeholder=":avocado:"
            className="h-10"
          />
          {aliasError ? <p className="text-[12px] text-red-600">{aliasError}</p> : null}
        </div>
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      </CustomDialogBody>
      <CustomDialogFooter className="justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="button" variant="success" onClick={() => void handleSubmit()} disabled={!canSave}>
          {isSubmitting ? "Saving..." : "Save"}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
