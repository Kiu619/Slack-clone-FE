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
  onDeactivate: () => Promise<void> | void;
}

export default function DeactivateUserDialog({
  open,
  onOpenChange,
  member,
  saving = false,
  onDeactivate,
}: Props) {
  const memberName = member.name?.trim() || member.displayName?.trim() || member.email;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="620px">
      <CustomDialogHeader onOpenChange={onOpenChange} className="px-7 py-6">
        <CustomDialogTitle className="text-[28px] font-bold tracking-[-0.03em]">
          Deactivate user
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <div className="flex flex-col gap-5">
          <Typography className="text-[18px] leading-7">
            Deactivate <strong>{memberName}</strong>?
          </Typography>

          <ul className="list-disc space-y-2 pl-6 text-[14px] leading-6 text-[#616061]">
            <li>The member will no longer be able to sign in to the workspace.</li>
            <li>The member’s messages and files will still remain accessible.</li>
          </ul>
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
          onClick={() => void onDeactivate()}
          disabled={saving}
          className="h-10 rounded-[6px] px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Deactivating
            </span>
          ) : (
            "Deactivate"
          )}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
