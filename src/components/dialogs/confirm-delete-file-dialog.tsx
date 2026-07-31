import { useDeleteAttachment } from "@/hooks/use-messages";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
  CustomDialogFooter
} from "../custom-dialog"
import { Button } from "../ui/button"
import { Message, MessageAttachment } from "@/lib/types";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
}

export default function ConfirmDeleteFileDialog({ open, onOpenChange, onConfirm}: Props) {
  return (
    <CustomDialog open={open}  onOpenChange={onOpenChange}>
      <CustomDialogHeader  onOpenChange={onOpenChange}>
        <CustomDialogTitle>Confirm Delete File</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <p>Are you sure you want to delete this file?</p>
      </CustomDialogBody>
        <CustomDialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="error" onClick={onConfirm}>
            Delete
          </Button>
        </CustomDialogFooter>
    </CustomDialog>
  )
}
