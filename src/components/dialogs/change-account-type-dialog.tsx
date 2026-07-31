"use client";

import { useMemo, useState } from "react";
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
import { cn } from "@/lib/utils";
import type {
  Workspace,
  WorkspaceMember,
  WorkspaceMemberRole,
} from "@/lib/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: WorkspaceMember;
  workspace: Workspace;
  onSave: (role: WorkspaceMemberRole) => Promise<void> | void;
  saving?: boolean;
}

const roleOptions: Array<{ value: WorkspaceMemberRole; label: string }> = [
  { value: "primary_owner", label: "Primary Workspace Owner" },
  { value: "owner", label: "Workspace Owner" },
  { value: "admin", label: "Workspace Admin" },
  { value: "member", label: "Regular Member" },
];

export default function ChangeAccountTypeDialog({
  open,
  onOpenChange,
  member,
  workspace,
  onSave,
  saving = false,
}: Props) {
  const initialRole = member.role ?? "member";
  const [selectedRole, setSelectedRole] =
    useState<WorkspaceMemberRole>(initialRole);

  const description = useMemo(() => {
    const memberName =
      member.name?.trim() || member.displayName?.trim() || member.email;
    return (
      <>
        Select the account type <strong>{memberName}</strong> should have for{" "}
        <strong>{workspace.name}</strong>.
      </>
    );
  }, [member.displayName, member.email, member.name, workspace.name]);

  const canSave = selectedRole !== initialRole && !saving;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="620px">
      <CustomDialogHeader
        onOpenChange={onOpenChange}
        className="border-[#ece8ec] px-7 py-6"
      >
        <CustomDialogTitle className="text-[28px] font-bold tracking-[-0.03em]">
          Change account type
        </CustomDialogTitle>
      </CustomDialogHeader>

      <CustomDialogBody className="px-7 py-5">
        <div className="flex flex-col gap-6">
          <Typography className="text-[18px] leading-7">
            {description}
          </Typography>

          <div className="flex flex-col gap-3">
            <Typography className="text-[16px] font-semibold">
              Choose account type
            </Typography>

            <div className="flex flex-col gap-3">
              {roleOptions.map((option) => {
                const checked = selectedRole === option.value;
                return (
                  <label
                    key={option.value}
                    className="flex cursor-pointer items-center gap-3 text-[16px]"
                  >
                    <span
                      className={cn(
                        "relative flex size-3 items-center justify-center rounded-full border transition-colors",
                        checked
                          ? "border-selection-hover bg-selection-hover"
                          : "border-[#77797d] bg-transparent",
                      )}
                    >
                      {checked ? <span className="size-1 rounded-full bg-white" /> : null}
                    </span>
                    <input
                      type="radio"
                      name="account-type"
                      value={option.value}
                      checked={checked}
                      onChange={() => setSelectedRole(option.value)}
                      className="sr-only"
                    />
                    <Typography as="span" className="text-[13px] font-semibold">
                      {option.label}
                    </Typography>
                  </label>

                );
              })}
            </div>
          </div>

        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="justify-end gap-3 border-[#ece8ec] px-7 py-5">
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
          onClick={() => void onSave(selectedRole)}
          disabled={!canSave}
          className="h-10 rounded-[6px] px-5 text-[14px] font-semibold disabled:opacity-50"
        >
          {saving ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving
            </span>
          ) : (
            "Save changes"
          )}
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
