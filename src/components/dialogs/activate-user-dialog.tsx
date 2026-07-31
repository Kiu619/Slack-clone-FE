import { Loader2 } from "lucide-react";

import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { Button } from "../ui/button";
import Typography from "../ui/typography";
import type { WorkspaceMember } from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember;
  saving?: boolean;
  onActivate: () => Promise<void> | void;
}

export default function ActivateUserDialog({
  open,
  onOpenChange,
  member,
  saving = false,
  onActivate,
}: Props) {
  const memberName = member.name?.trim() || member.displayName?.trim() || member.email;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="620px">
      <CustomDialogHeader onOpenChange={onOpenChange} className="px-7 py-6">
        <CustomDialogTitle className="text-[28px] font-bold tracking-[-0.03em]">
          Activate user
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <div className="flex flex-col gap-5">
          <Typography className="text-[18px] leading-7">
            <strong>{memberName}</strong>&apos;s account is deactivated for this workspace. Do you want to reactivate it?
          </Typography>
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="justify-end gap-3 px-7 py-5">
        <Button
          type="button"
          variant="outline"
          onClick={() => onOpenChange(false)}
          className="h-10 rounded-[6px] border-[#cfcacf] px-5 text-[14px] font-semibold"
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="error"
          onClick={() => void onActivate()}
          disabled={saving}
          className="h-10 rounded-[6px] px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Reactivating
            </span>
          ) : (
            "Reactivate"
          )}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
