"use client";

import { Loader2 } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";
import {
    CustomDialog,
    CustomDialogBody,
    CustomDialogFooter,
    CustomDialogHeader,
    CustomDialogTitle,
} from "../custom-dialog";
import { Button } from "../ui/button";
import Typography from "../ui/typography";

export type PermissionRoleOption = {
  key: string;
  label: string;
  checked: boolean;
  locked?: boolean;
};

interface PermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  permissionName: string;
  roles: PermissionRoleOption[];
  saving?: boolean;
  onSave: (nextRoles: PermissionRoleOption[]) => Promise<void> | void;
}

export default function PermissionsDialog({
  open,
  onOpenChange,
  permissionName,
  roles,
  saving,
  onSave,
}: PermissionsDialogProps) {
  const [draftRoles, setDraftRoles] = useState<PermissionRoleOption[]>(roles);

  const hasChanges = useMemo(
    () =>
      draftRoles.some(
        (role, index) => role.checked !== roles[index]?.checked,
      ),
    [draftRoles, roles],
  );

  const handleToggle = (index: number) => {
    setDraftRoles((current) =>
      current.map((role, roleIndex) =>
        roleIndex === index && !role.locked
          ? { ...role, checked: !role.checked }
          : role,
      ),
    );
  };

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="620px">
      <CustomDialogHeader onOpenChange={onOpenChange} className="px-7 py-6">
        <CustomDialogTitle className="text-[28px] font-bold tracking-[-0.03em] text-[#1d1c1d] dark:text-[#f2f2f2]">
          {permissionName}
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <div className="flex flex-col gap-5">
          <Typography className="text-[18px] font-semibold leading-7 text-[#1d1c1d] dark:text-[#f2f2f2]">
            Who can access?
          </Typography>

          <div className="space-y-3">
            {draftRoles.map((role, index) => (
              <label
                key={role.key}
                className={cn(
                  "flex items-center gap-3 text-[15px] text-[#1d1c1d] dark:text-[#f2f2f2]",
                  role.locked ? "cursor-not-allowed opacity-70" : "cursor-pointer",
                )}
              >
                <input
                  type="checkbox"
                  checked={role.checked}
                  disabled={role.locked}
                  onChange={() => handleToggle(index)}
                  className={cn(
                    "size-3 cursor-pointer accent-selection-hover",
                    role.locked && "opacity-50",
                  )}
                />
                <span className="flex-1">{role.label}</span>
              </label>
            ))}
          </div>
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
          variant="success"
          onClick={() => void onSave(draftRoles)}
          disabled={saving || !hasChanges}
          className="h-10 rounded-[6px] px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </span>
          ) : (
            "Save"
          )}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
