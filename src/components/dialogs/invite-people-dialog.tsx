"use client";

import { useChannels } from "@/hooks/use-channel";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useAppTranslation } from "@/hooks/use-translation";
import { useWorkspace } from "@/hooks/use-workspace";
import type { Channel } from "@/lib/types";
import { fetchWorkspaceMemberEmailsApi, sendWorkspaceInviteEmailsApi } from "@/apis";
import { Button } from "@/components/ui/button";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { Form, FormControl, FormField } from "@/components/ui/form";
import { workspaceKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Check, Lock, Send, X } from "lucide-react";
import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { LuHash } from "react-icons/lu";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 300;

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type InvitePeopleFormValues = {
  emailInput: string;
  channelInput: string;
  pendingEmails: string[];
  selectedChannelIds: string[];
};

const defaultFormValues: InvitePeopleFormValues = {
  emailInput: "",
  channelInput: "",
  pendingEmails: [],
  selectedChannelIds: [],
};

function parseEmails(raw: string): string[] {
  return raw
    .split(/[\s,;]+/g)
    .map((e) => e.trim().toLowerCase())
    .filter((e) => e.length > 0);
}

function isValidEmail(value: string): boolean {
  return EMAIL_REGEX.test(value.trim());
}

export default function InvitePeopleDialog({
  open,
  onOpenChange,
  workspaceId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
}) {
  const t = useAppTranslation("dialogs.invitePeople");
  const { data: workspace } = useWorkspace(workspaceId);
  const workspaceName = workspace?.name ?? "this workspace";

  const form = useForm<InvitePeopleFormValues>({
    defaultValues: defaultFormValues,
  });

  const emailInput = useWatch({ control: form.control, name: "emailInput" });
  const channelInput = useWatch({
    control: form.control,
    name: "channelInput",
  });
  const pendingEmails = useWatch({
    control: form.control,
    name: "pendingEmails",
  });
  const selectedChannelIds = useWatch({
    control: form.control,
    name: "selectedChannelIds",
  });

  const debouncedChannelInput = useDebouncedValue(
    channelInput ?? "",
    SEARCH_DEBOUNCE_MS,
  );

  const { data: channels = [] } = useChannels(workspaceId);

  // Lookup email đã ở workspace để block ngay khi user hình thành chip
  // (tránh phải đợi backend skip + toast sau khi gửi). Chỉ fetch khi dialog mở,
  // cache 30s — đủ cho 1 lần invite mà không lo stale.
  const { data: memberEmails } = useQuery({
    queryKey: workspaceKeys.memberEmails(workspaceId),
    queryFn: () => fetchWorkspaceMemberEmailsApi(workspaceId),
    staleTime: 30 * 1000,
    enabled: open,
  })

  const memberEmailSet = useMemo(
    () => new Set((memberEmails ?? []).map((e) => e.toLowerCase())),
    [memberEmails],
  )

  const selectedChannelIdSet = useMemo(
    () => new Set(selectedChannelIds ?? []),
    [selectedChannelIds],
  );

  const pendingEmailSet = useMemo(
    () => new Set((pendingEmails ?? []).map((e) => e.toLowerCase())),
    [pendingEmails],
  );

  // Real-time detection cho email hiện tại trong input. Khi user gõ email hợp
  // lệ mà match memberEmailSet → render inline message dưới input + disable
  // nút Send nếu user Enter thành chip. Pattern lấy cảm hứng từ
  // add-channel-member-dialog.tsx (dòng 198-225 + 647-654) — show inline
  // thay vì toast.
  const trimmedCurrentInput = useMemo(
    () => (emailInput ?? "").trim().toLowerCase(),
    [emailInput],
  );

  const currentInputAlreadyMember =
    trimmedCurrentInput.length > 0 &&
    isValidEmail(trimmedCurrentInput) &&
    memberEmailSet.has(trimmedCurrentInput);

  // Set pending emails đã match member (lowercase) — dùng để style chip
  // "đã ở workspace" + disable nút Send.
  const pendingMemberEmailSet = useMemo(() => {
    const next = new Set<string>();
    for (const e of pendingEmails ?? []) {
      const lower = e.toLowerCase();
      if (memberEmailSet.has(lower)) next.add(lower);
    }
    return next;
  }, [pendingEmails, memberEmailSet]);

  const hasAnyMemberInPending = pendingMemberEmailSet.size > 0;

  const channelPool = useMemo<Channel[]>(
    () => channels.filter((c) => !selectedChannelIdSet.has(c.id)),
    [channels, selectedChannelIdSet],
  );

  const filteredChannels = useMemo(() => {
    const q = debouncedChannelInput.trim().toLowerCase();
    if (!q) return [];
    return channelPool
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 50);
  }, [channelPool, debouncedChannelInput]);

  const selectedChannels = useMemo(() => {
    const map = new Map(channels.map((c) => [c.id, c]));
    return (selectedChannelIds ?? [])
      .map((id) => map.get(id))
      .filter((c): c is Channel => c != null);
  }, [channels, selectedChannelIds]);

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) {
        form.reset(defaultFormValues);
      }
    },
    [form, onOpenChange],
  );

  /**
   * Parse `raw` → list email hợp lệ → add vào `pendingEmails` (skip trùng
   * trong dialog). Email đã là workspace member vẫn add vào chip như bình
   * thường — chip sẽ tự render style "đã ở workspace" (xám + check) và nút
   * Send sẽ disable cho đến khi user remove chip đó. Inline message ngay dưới
   * input cảnh báo user real-time khi gõ email đã là member.
   */
  const addPendingEmails = useCallback(
    (raw: string) => {
      const parsed = parseEmails(raw);
      if (parsed.length === 0) return;
      const prev = form.getValues("pendingEmails") ?? [];
      const next: string[] = [...prev];
      let added = 0;
      for (const candidate of parsed) {
        if (!isValidEmail(candidate)) continue;
        const lower = candidate.toLowerCase();
        if (pendingEmailSet.has(lower)) continue;
        if (next.some((e) => e.toLowerCase() === lower)) continue;
        next.push(candidate);
        added += 1;
      }
      if (added === 0) return;
      form.setValue("pendingEmails", next, { shouldDirty: true });
      form.setValue("emailInput", "", { shouldDirty: true });
      queueMicrotask(() => void form.setFocus("emailInput"));
    },
    [form, pendingEmailSet],
  );

  const removePendingEmail = useCallback(
    (email: string) => {
      const prev = form.getValues("pendingEmails") ?? [];
      form.setValue(
        "pendingEmails",
        prev.filter((e) => e.toLowerCase() !== email.toLowerCase()),
        { shouldDirty: true },
      );
    },
    [form],
  );

  const addSelectedChannel = useCallback(
    (channel: Channel) => {
      const prev = form.getValues("selectedChannelIds") ?? [];
      if (prev.includes(channel.id)) return;
      form.setValue("selectedChannelIds", [...prev, channel.id], {
        shouldDirty: true,
      });
      form.setValue("channelInput", "", { shouldDirty: true });
      queueMicrotask(() => void form.setFocus("channelInput"));
    },
    [form],
  );

  const removeSelectedChannel = useCallback(
    (channelId: string) => {
      const prev = form.getValues("selectedChannelIds") ?? [];
      form.setValue(
        "selectedChannelIds",
        prev.filter((id) => id !== channelId),
        { shouldDirty: true },
      );
    },
    [form],
  );

  const sendInviteMutation = useMutation({
    mutationFn: async () => {
      const emails = form.getValues("pendingEmails") ?? [];
      const channelIds = form.getValues("selectedChannelIds") ?? [];
      return sendWorkspaceInviteEmailsApi(
        workspaceId,
        emails,
        channelIds.length > 0 ? channelIds : undefined,
      );
    },
    onSuccess: (result) => {
      const emailCount = form.getValues("pendingEmails")?.length ?? 0;
      const { sent, skipped, failed } = result;
      if (sent > 0) {
        toast.success(
          sent === 1
            ? t("sendOneInvitationEmail")
            : t("sendManyInvitationEmails", { count: sent }),
        );
      }
      if (skipped > 0) {
        toast.info(
          t("alreadyInWorkspaceSkipped", { count: skipped }),
        );
      }
      if (failed.length > 0) {
        toast.error(
          t("someEmailsFailed", {
            emails: failed.map((f) => f.email).join(", "),
          }),
        );
      }
      if (sent === 0 && skipped === 0 && failed.length === 0) {
        toast.info(t("noInvitationEmailsSent"));
      }
      if (emailCount > 0) {
        form.reset(defaultFormValues);
        onOpenChange(false);
      }
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? ((e.response?.data as { message?: string })?.message ?? e.message)
        : e instanceof Error
          ? e.message
          : t("couldNotSendInvitations");
      toast.error(typeof msg === "string" ? msg : t("couldNotSendInvitations"));
    },
  });

  const trimmedEmailInput = (emailInput ?? "").trim();
  const hasPendingEmails = (pendingEmails?.length ?? 0) > 0;
  // Disable Send khi có BẤT KỲ chip là member — user phải remove chip đó
  // (hoặc gõ email mới) trước khi gửi. Backend vẫn filter defense-in-depth
  // (memberEmailSet skip) nếu có bug bypass button.
  const canSubmit =
    hasPendingEmails &&
    !sendInviteMutation.isPending &&
    !hasAnyMemberInPending;

  const handleSend = () => {
    if (trimmedEmailInput.length > 0) {
      addPendingEmails(trimmedEmailInput);
    }
    queueMicrotask(() => sendInviteMutation.mutate());
  };

  return (
    <CustomDialog
      open={open}
      onOpenChange={handleDialogOpenChange}
      maxWidth="560px"
    >
      <Form {...form}>
        <CustomDialogHeader onOpenChange={handleDialogOpenChange}>
          <div className="min-w-0 flex-1 pr-2">
            <CustomDialogTitle className="text-left text-xl">
              {t("title", { workspace: workspaceName })}
            </CustomDialogTitle>
            <p className="mt-1 text-left text-[13px] leading-snug text-[#616061] dark:text-[#ababad]">
              {t("subtitle")}
            </p>
          </div>
        </CustomDialogHeader>

        <CustomDialogBody className="space-y-5">
          <div className="space-y-1.5">
            <label
              htmlFor="invite-people-email-input"
              className="block text-left text-[13px] font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]"
            >
              {t("emailAddressesLabel")}
            </label>
            <div
              className={cn(
                "flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-[#dddddd] bg-white px-2 py-1.5 text-[14px] dark:border-[#35373B] dark:bg-[#1A1D21]",
                "focus-within:border-[#1264a3] focus-within:ring-1 focus-within:ring-[#1264a3]",
              )}
              onClick={() => void form.setFocus("emailInput")}
            >
              {(pendingEmails ?? []).map((email) => {
                const isMember = memberEmailSet.has(email.toLowerCase());
                return (
                  <span
                    key={email}
                    className={cn(
                      "inline-flex max-w-full items-center gap-1 rounded-md py-0.5 pl-1 pr-0.5 text-[13px] font-semibold",
                      isMember
                        ? "bg-[#e8e8e8] text-[#616061] line-through dark:bg-[#2a2d31] dark:text-[#ababad]"
                        : "bg-[#f0f0f0] text-[#1d1c1d] dark:bg-[#2a2d31] dark:text-[#f9f8f9]",
                    )}
                    onClick={(e) => e.stopPropagation()}
                    title={isMember ? t("alreadyInWorkspaceTooltip") : undefined}
                  >
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-sm",
                        isMember
                          ? "bg-[#2bac76]/15 text-[#2bac76] dark:bg-[#2bac76]/20"
                          : "bg-[#1264a3]/15 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]",
                      )}
                    >
                      {isMember ? (
                        <Check className="size-3.5" aria-hidden />
                      ) : (
                        <Send className="size-3.5" aria-hidden />
                      )}
                    </span>
                    <span className="max-w-[200px] truncate">{email}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-[#616061] hover:bg-black/10 hover:text-[#1d1c1d] dark:hover:bg-white/10"
                      aria-label={`Remove ${email}`}
                      onClick={() => removePendingEmail(email)}
                    >
                      <X className="size-3.5" />
                    </button>
                  </span>
                );
              })}
              <FormField
                control={form.control}
                name="emailInput"
                render={({ field }) => (
                  <FormControl>
                    <input
                      {...field}
                      id="invite-people-email-input"
                      placeholder={
                        (pendingEmails?.length ?? 0) > 0
                          ? ""
                          : t("emailAddressesPlaceholder")
                      }
                      autoComplete="off"
                      disabled={sendInviteMutation.isPending}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" ||
                          e.key === "," ||
                          e.key === " " ||
                          e.key === "Tab"
                        ) {
                          const v = field.value?.trim();
                          if (v && v.length > 0) {
                            e.preventDefault();
                            addPendingEmails(v);
                          }
                        } else if (
                          e.key === "Backspace" &&
                          (field.value ?? "").length === 0 &&
                          (pendingEmails?.length ?? 0) > 0
                        ) {
                          const prev = form.getValues("pendingEmails") ?? [];
                          removePendingEmail(prev[prev.length - 1]);
                        }
                      }}
                      onPaste={(e) => {
                        const pasted = e.clipboardData.getData("text");
                        if (pasted && /[\s,;]/.test(pasted)) {
                          e.preventDefault();
                          addPendingEmails(pasted);
                        }
                      }}
                      onBlur={() => {
                        const v = field.value?.trim();
                        if (v && v.length > 0) {
                          addPendingEmails(v);
                        }
                      }}
                      className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-[14px] outline-none placeholder:text-[#616061] dark:placeholder:text-[#ababad]"
                    />
                  </FormControl>
                )}
              />
            </div>

            {/* Inline message cảnh báo real-time khi user gõ email đã ở workspace.
                Pattern tham chiếu add-channel-member-dialog.tsx (dòng 647-654). */}
            {currentInputAlreadyMember ? (
              <p
                role="status"
                className="flex items-center gap-1.5 text-[13px] text-[#616061] dark:text-[#ababad]"
              >
                <Check
                  className="size-3.5 shrink-0 text-[#2bac76]"
                  aria-hidden
                />
                <span>
                  {trimmedCurrentInput}{" "}
                  <span className="font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
                    {t("alreadyInWorkspaceInline")}
                  </span>
                </span>
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="invite-people-channel-input"
              className="block text-left text-[13px] font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]"
            >
              {t("optionalAddToChannels")}
            </label>
            <div
              className={cn(
                "flex min-h-[42px] flex-wrap items-center gap-1.5 rounded-lg border border-[#dddddd] bg-white px-2 py-1.5 text-[14px] dark:border-[#35373B] dark:bg-[#1A1D21]",
                "focus-within:border-[#1264a3] focus-within:ring-1 focus-within:ring-[#1264a3]",
              )}
              onClick={() => void form.setFocus("channelInput")}
            >
              {selectedChannels.map((c) => (
                <span
                  key={c.id}
                  className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#f0f0f0] py-0.5 pl-1 pr-0.5 text-[13px] font-semibold text-[#1d1c1d] dark:bg-[#2a2d31] dark:text-[#f9f8f9]"
                  onClick={(e) => e.stopPropagation()}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-[#1264a3]/15 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]">
                    {c.isPrivate ? (
                      <Lock className="size-3.5" aria-hidden />
                    ) : (
                      <LuHash className="size-3.5" aria-hidden />
                    )}
                  </span>
                  <span className="max-w-[200px] truncate">{c.name}</span>
                  <button
                    type="button"
                    className="rounded p-0.5 text-[#616061] hover:bg-black/10 hover:text-[#1d1c1d] dark:hover:bg-white/10"
                    aria-label={`Remove ${c.name}`}
                    onClick={() => removeSelectedChannel(c.id)}
                  >
                    <X className="size-3.5" />
                  </button>
                </span>
              ))}
              <FormField
                control={form.control}
                name="channelInput"
                render={({ field }) => (
                  <FormControl>
                    <input
                      {...field}
                      id="invite-people-channel-input"
                      placeholder={
                        selectedChannels.length > 0
                          ? ""
                          : t("channelsPlaceholder")
                      }
                      autoComplete="off"
                      disabled={sendInviteMutation.isPending}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Backspace" &&
                          (field.value ?? "").length === 0 &&
                          selectedChannels.length > 0
                        ) {
                          const last =
                            selectedChannels[selectedChannels.length - 1];
                          removeSelectedChannel(last.id);
                        }
                      }}
                      className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-[14px] outline-none placeholder:text-[#616061] dark:placeholder:text-[#ababad]"
                    />
                  </FormControl>
                )}
              />
            </div>

            {debouncedChannelInput.trim().length > 0 ? (
              filteredChannels.length > 0 ? (
                <div
                  className="overflow-hidden rounded-lg border border-[#e2e2e2] bg-white shadow-md dark:border-[#3f4248] dark:bg-[#222529] dark:shadow-lg"
                  role="listbox"
                >
                  <ul className="max-h-[240px] overflow-y-auto py-1">
                    {filteredChannels.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          disabled={sendInviteMutation.isPending}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            "hover:bg-[#e8f5fa] dark:hover:bg-[#2a2d31]",
                          )}
                          onClick={() => addSelectedChannel(c)}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]">
                            {c.isPrivate ? (
                              <Lock className="size-4" aria-hidden />
                            ) : (
                              <LuHash className="size-4" aria-hidden />
                            )}
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-bold text-[#1d1c1d] dark:text-[#f9f8f9]">
                              {c.name}
                            </div>
                            {c.isPrivate ? (
                              <div className="text-[13px] text-[#616061] dark:text-[#ababad]">
                                {t("channelIsPrivate")}
                              </div>
                            ) : null}
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <p className="text-[13px] text-[#616061] dark:text-[#ababad]">
                  {t("noMatchingChannels")}
                </p>
              )
            ) : null}
          </div>
        </CustomDialogBody>

        <CustomDialogFooter className="justify-between">
          <button
            type="button"
            className="text-[14px] font-semibold text-[#1264a3] hover:underline"
            onClick={async () => {
              try {
                const link = `${window.location.origin}/join/${workspace?.inviteCode}`;
                await navigator.clipboard.writeText(link);
                toast.success(t("inviteLinkCopied"));
              } catch {
                toast.error(t("couldNotCopyInviteLink"));
              }
            }}
          >
            {t("copyInviteLink")}
          </button>
          <Button
            type="button"
            variant="success"
            disabled={!canSubmit}
            title={hasAnyMemberInPending ? t("sendDisabledMemberHint") : undefined}
            onClick={handleSend}
          >
            {sendInviteMutation.isPending ? t("sending") : t("sendInvitation")}
          </Button>
        </CustomDialogFooter>
      </Form>
    </CustomDialog>
  );
}
