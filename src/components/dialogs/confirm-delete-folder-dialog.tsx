"use client";

import { Button } from "../ui/button";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";

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
  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Delete folder</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <p className="text-sm text-[#616061] dark:text-[#ababad]">
          Delete &quot;{folderName}&quot;? Files in the channel are not deleted;
          only this folder and its shortcuts are removed.
        </p>
      </CustomDialogBody>
      <CustomDialogFooter>
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          type="button"
          variant="error"
          onClick={() => {
            onConfirm();
            onOpenChange(false);
          }}
        >
          Delete folder
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
