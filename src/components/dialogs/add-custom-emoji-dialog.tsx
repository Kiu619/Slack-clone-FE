"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Image as ImageIcon } from "lucide-react";

import { CustomDialog, CustomDialogBody, CustomDialogFooter, CustomDialogHeader, CustomDialogTitle } from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import { formatCustomEmojiShortcode, normalizeCustomEmojiName, validateCustomEmojiName } from "@/lib/custom-emojis";
import { useDialogs } from "@/hooks/use-translation";

export function AddCustomEmojiDialog({
  open,
  onOpenChange,
  canManageEmoji,
  existingNames,
  uploadFileBinary,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManageEmoji: boolean;
  existingNames: Set<string>;
  uploadFileBinary: (file: File) => Promise<{ url: string }>;
  onSubmit: (payload: { name: string; imageUrl: string }) => Promise<void>;
}) {
  const t = useDialogs();
  const [name, setName] = useState("");
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setName("");
      setFile(null);
      setError(null);
      setIsSubmitting(false);
      setPreviewUrl(null);
    }
  }, [open]);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const nameError = useMemo(() => {
    const validation = validateCustomEmojiName(name);
    if (validation) return validation;
    if (existingNames.has(normalizeCustomEmojiName(name))) {
      return t('addCustomEmoji.emojiNameExists');
    }
    return null;
  }, [existingNames, name, t]);

  const canSave = Boolean(name && file && !nameError && canManageEmoji && !isSubmitting);

  const clampNameCaret = () => {
    const input = nameInputRef.current;
    if (!input) return;
    const value = input.value;
    const min = value.startsWith(":") ? 1 : 0;
    const max = value.endsWith(":") ? Math.max(min, value.length - 1) : value.length;
    const start = input.selectionStart ?? min;
    const end = input.selectionEnd ?? start;
    input.setSelectionRange(
      Math.min(Math.max(start, min), max),
      Math.min(Math.max(end, min), max),
    );
  };

  const handleSubmit = async () => {
    if (!file) {
      setError(t('addCustomEmoji.chooseImageFile'));
      return;
    }
    if (nameError) {
      setError(nameError);
      return;
    }
    setIsSubmitting(true);
    try {
      const uploaded = await uploadFileBinary(file);
      await onSubmit({
        name: normalizeCustomEmojiName(name),
        imageUrl: uploaded.url,
      });
      onOpenChange(false);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : t('addCustomEmoji.failedToAdd'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="640px">
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{t('addCustomEmoji.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody className="space-y-6">
        <Typography
          className="text-[15px] leading-6 text-[#1d1c1d] dark:text-[#d1d2d3]"
          text={t('addCustomEmoji.description')}
        />

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]">
            <span>1.</span>
            <span>{t('addCustomEmoji.step1Upload')}</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center rounded-md border border-[#ece8ec] bg-[#fafafa] dark:border-[#2c2e33] dark:bg-[#141619]">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="h-full w-full object-contain" />
              ) : (
                <ImageIcon className="h-8 w-8 text-[#797c81]" />
              )}
            </div>
            <label className="inline-flex cursor-pointer items-center justify-center rounded-md border border-[#797c814d] px-4 py-2 text-sm font-semibold text-[#1d1c1d] transition-colors hover:bg-[#f2f0f1] dark:text-[#f2f2f2] dark:hover:bg-[#222529]">
              {t('addCustomEmoji.uploadButton')}
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                const selected = event.target.files?.[0] ?? null;
                if (!selected) return;
                if (!selected.type.startsWith("image/")) {
                  setError(t('addCustomEmoji.chooseImageFile'));
                  return;
                }
                setError(null);
                setFile(selected);
              }} />
            </label>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-2 text-[15px] font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]">
            <span>2.</span>
            <span>{t('addCustomEmoji.step2Name')}</span>
          </div>
          <Input
            ref={nameInputRef}
            value={formatCustomEmojiShortcode(name)}
            onChange={(event) => {
              const next = normalizeCustomEmojiName(event.target.value.replace(/:/g, ""));
              setName(next);
              if (error) setError(null);
              requestAnimationFrame(clampNameCaret);
            }}
            onFocus={() => requestAnimationFrame(clampNameCaret)}
            onClick={() => requestAnimationFrame(clampNameCaret)}
            onKeyUp={() => requestAnimationFrame(clampNameCaret)}
            placeholder="mom"
            className="h-10"
          />
          {nameError ? <p className="text-[12px] text-red-600">{nameError}</p> : null}
        </div>
        {error ? <p className="text-[12px] text-red-600">{error}</p> : null}
      </CustomDialogBody>
      <CustomDialogFooter className="justify-end gap-3">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
        <Button type="button" variant="success" onClick={() => void handleSubmit()} disabled={!canSave}>
          {isSubmitting ? t('addCustomEmoji.saving') : t('addCustomEmoji.save')}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
