"use client"

import { useDialogs } from "@/hooks/use-translation";
import {
    CustomDialog,
    CustomDialogBody,
    CustomDialogFooter,
    CustomDialogHeader,
    CustomDialogTitle
} from "../custom-dialog";
import { Button } from "../ui/button";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteFileDialog({ open, onOpenChange, onConfirm}: Props) {
  const t = useDialogs();

  return (
    <CustomDialog open={open}  onOpenChange={onOpenChange}>
      <CustomDialogHeader  onOpenChange={onOpenChange}>
        <CustomDialogTitle>{t('confirmDeleteFile.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <p>{t('confirmDeleteFile.description')}</p>
      </CustomDialogBody>
        <CustomDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button variant="error" onClick={onConfirm}>
            {t('common.delete')}
          </Button>
        </CustomDialogFooter>
    </CustomDialog>
  )
}
