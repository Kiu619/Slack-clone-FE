"use client";

import { Button } from "../ui/button";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle
} from "../custom-dialog";
import { useDialogs } from "@/hooks/use-translation";

export function ConfirmDeleteFolderDialog({
  open,
  onOpenChange,
  folderName,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderName: string;
  onConfirm: () => void;
}) {
  const t = useDialogs();

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{t('confirmDeleteFolder.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <p className="text-sm text-[#616061] dark:text-[#ababad]">
          {t('confirmDeleteFolder.description', { name: folderName })}
        </p>
      </CustomDialogBody>
      <CustomDialogFooter>
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
          {t('common.cancel')}
        </Button>
        <Button
          type="button"
          variant="error"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          {t('common.delete')}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
