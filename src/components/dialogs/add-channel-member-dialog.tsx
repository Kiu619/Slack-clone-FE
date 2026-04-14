"use client";

import {
  addAllChannelMembersBulkApi,
  addChannelMemberApi,
  fetchChannelMembersApi,
  fetchWorkspaceMembersApi,
  sendWorkspaceInviteEmailsApi,
} from "@/apis";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { Channel } from "@/lib/types";
import type { WorkspaceMember } from "@/lib/types";
import { BiHash } from "react-icons/bi";
import Typography from "../ui/typography";
import { Button } from "../ui/button";
import { useWorkspace } from "@/hooks/use-workspace";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { channelKeys, workspaceKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Avatar from "../avatar";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { LuMailPlus, LuSend, LuX } from "react-icons/lu";
import { Form, FormControl, FormField } from "../ui/form";

const SEARCH_DEBOUNCE_MS = 300;

type AddChannelMemberFormValues = {
  search: string;
  addMode: "all" | "specific";
  pendingUserIds: string[];
  pendingInviteEmails: string[];
};

const defaultFormValues: AddChannelMemberFormValues = {
  search: "",
  addMode: "specific",
  pendingUserIds: [],
  pendingInviteEmails: [],
};

function matchesMemberSearch(m: WorkspaceMember, raw: string): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const name = (m.name ?? "").toLowerCase();
  const displayName = (m.displayName ?? "").toLowerCase();
  const email = m.email.toLowerCase();
  return (
    name.includes(q) || displayName.includes(q) || email.includes(q)
  );
}

function isValidEmailFormat(value: string): boolean {
  const t = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

function memberLabel(m: WorkspaceMember): string {
  return (
    m.displayName?.trim() || m.name?.trim() || m.email.split("@")[0] || m.email
  );
}

function memberHandleLine(m: WorkspaceMember): string {
  const h =
    m.displayName?.trim() ||
    m.name?.trim() ||
    m.email.split("@")[0] ||
    m.email;
  return h.startsWith("@") ? h : `@${h}`;
}

export default function AddChannelMemberDialog({
  open,
  onOpenChange,
  currentChannelData,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChannelData: Channel;
}) {
  const workspaceId = currentChannelData.workspaceId;
  const channelId = currentChannelData.id;
  const isDefaultChannel = currentChannelData.isDefaultChannel;

  const { data: workspaceMeta } = useWorkspace(workspaceId);
  const workspaceName = workspaceMeta?.name ?? "this workspace";

  const form = useForm<AddChannelMemberFormValues>({
    defaultValues: defaultFormValues,
  });

  const search = useWatch({ control: form.control, name: "search" });
  const addMode = useWatch({ control: form.control, name: "addMode" });
  const pendingUserIds = useWatch({
    control: form.control,
    name: "pendingUserIds",
  });
  const pendingInviteEmails = useWatch({
    control: form.control,
    name: "pendingInviteEmails",
  });

  const debouncedSearch = useDebouncedValue(search ?? "", SEARCH_DEBOUNCE_MS);
  const searchKey = debouncedSearch.trim();

  const queryClient = useQueryClient();

  const invalidateChannelMembers = useCallback(() => {
    void queryClient.invalidateQueries({
      predicate: (q) => {
        const k = q.queryKey;
        return (
          Array.isArray(k) &&
          k[0] === "channels" &&
          k[1] === workspaceId &&
          k[2] === channelId &&
          k[3] === "members"
        );
      },
    });
  }, [queryClient, workspaceId, channelId]);

  const { data: wsMembers = [], isPending: wsLoading } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: open && !!workspaceId,
    staleTime: 30_000,
  });

  const { data: directory } = useQuery({
    queryKey: channelKeys.members(workspaceId, channelId, ""),
    queryFn: () =>
      fetchChannelMembersApi(workspaceId, channelId, undefined),
    enabled: open && !!workspaceId && !!channelId,
    staleTime: 15_000,
  });

  const inChannelIds = useMemo(
    () => new Set(directory?.inChannel.map((m) => m.id) ?? []),
    [directory],
  );

  const notInChannelPool = useMemo(
    () => wsMembers.filter((m) => !inChannelIds.has(m.id)),
    [wsMembers, inChannelIds],
  );

  const pendingIdSet = useMemo(
    () => new Set(pendingUserIds ?? []),
    [pendingUserIds],
  );

  const filteredPool = useMemo(
    () =>
      notInChannelPool
        .filter((m) => !pendingIdSet.has(m.id))
        .filter((m) => matchesMemberSearch(m, searchKey)),
    [notInChannelPool, searchKey, pendingIdSet],
  );

  const inviteEmailParsed = useMemo(() => {
    const t = searchKey.trim();
    return isValidEmailFormat(t) ? t : null;
  }, [searchKey]);

  const memberExactByEmail = useMemo(() => {
    if (!inviteEmailParsed) return undefined;
    const low = inviteEmailParsed.toLowerCase();
    return wsMembers.find((m) => m.email.toLowerCase() === low);
  }, [inviteEmailParsed, wsMembers]);

  const alreadyInChannelByEmail =
    memberExactByEmail != null && inChannelIds.has(memberExactByEmail.id);

  const pendingEmailSet = useMemo(
    () => new Set((pendingInviteEmails ?? []).map((e) => e.toLowerCase())),
    [pendingInviteEmails],
  );

  const showInviteRow = Boolean(
    inviteEmailParsed &&
      !memberExactByEmail &&
      filteredPool.length === 0 &&
      !wsLoading &&
      !pendingEmailSet.has(inviteEmailParsed.toLowerCase()),
  );

  const showMemberResults = filteredPool.length > 0;
  const showDropdown =
    searchKey.length > 0 &&
    (showMemberResults || showInviteRow || alreadyInChannelByEmail);

  const showNoMatchesLine =
    searchKey.length > 0 && !wsLoading && !showDropdown;

  const pendingMembersResolved = useMemo(() => {
    const map = new Map(wsMembers.map((m) => [m.id, m]));
    return (pendingUserIds ?? [])
      .map((id) => map.get(id))
      .filter((m): m is WorkspaceMember => m != null);
  }, [pendingUserIds, wsMembers]);

  const addPendingUser = useCallback(
    (userId: string) => {
      const prev = form.getValues("pendingUserIds");
      if (prev.includes(userId)) return;
      form.setValue("pendingUserIds", [...prev, userId], {
        shouldDirty: true,
      });
      form.setValue("search", "");
      queueMicrotask(() => void form.setFocus("search"));
    },
    [form],
  );

  const removePendingUser = useCallback(
    (userId: string) => {
      const prev = form.getValues("pendingUserIds");
      form.setValue(
        "pendingUserIds",
        prev.filter((id) => id !== userId),
        { shouldDirty: true },
      );
    },
    [form],
  );

  const addPendingInviteEmail = useCallback(
    (email: string) => {
      const norm = email.trim().toLowerCase();
      const prev = form.getValues("pendingInviteEmails");
      if (prev.some((e) => e.toLowerCase() === norm)) return;
      form.setValue("pendingInviteEmails", [...prev, email.trim()], {
        shouldDirty: true,
      });
      form.setValue("search", "");
      queueMicrotask(() => void form.setFocus("search"));
    },
    [form],
  );

  const removePendingInviteEmail = useCallback(
    (email: string) => {
      const prev = form.getValues("pendingInviteEmails");
      form.setValue(
        "pendingInviteEmails",
        prev.filter((e) => e.toLowerCase() !== email.toLowerCase()),
        { shouldDirty: true },
      );
    },
    [form],
  );

  const handleDialogOpenChange = useCallback(
    (next: boolean) => {
      onOpenChange(next);
      if (!next) {
        form.reset(defaultFormValues);
      }
    },
    [form, onOpenChange],
  );

  const submitPendingMutation = useMutation({
    mutationFn: async () => {
      const { pendingUserIds: uids, pendingInviteEmails: emails } =
        form.getValues();
      for (const uid of uids) {
        await addChannelMemberApi(workspaceId, channelId, uid);
      }
      if (emails.length > 0) {
        return sendWorkspaceInviteEmailsApi(
          workspaceId,
          emails,
          channelId,
        );
      }
      return {
        sent: 0,
        skipped: 0,
        failed: [] as { email: string; message: string }[],
      };
    },
    onSuccess: (inviteResult) => {
      const { pendingUserIds: uids, pendingInviteEmails: emails } =
        form.getValues();
      const nUser = uids.length;
      const nMail = emails.length;
      invalidateChannelMembers();
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: channelKeys.all(workspaceId),
      });
      if (nUser > 0) {
        toast.success(
          nUser === 1
            ? "Added 1 person to the channel"
            : `Added ${nUser} people to the channel`,
        );
      }
      if (nMail > 0 && inviteResult) {
        const { sent, skipped, failed } = inviteResult;
        if (sent > 0) {
          toast.success(
            sent === 1
              ? "Sent 1 invitation email"
              : `Sent ${sent} invitation emails`,
          );
        }
        if (skipped > 0) {
          toast.info(
            `${skipped} address${skipped === 1 ? "" : "es"} already in the workspace (skipped).`,
          );
        }
        if (failed.length > 0) {
          toast.error(
            `Some emails failed: ${failed.map((f) => f.email).join(", ")}`,
          );
        }
        if (sent === 0 && skipped === 0 && failed.length === 0) {
          toast.info("No invitation emails sent.");
        }
      }
      if (nUser === 0 && nMail === 0) {
        toast.success("Done");
      }
      form.reset(defaultFormValues);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? ((e.response?.data as { message?: string })?.message ?? e.message)
        : e instanceof Error
          ? e.message
          : "Could not complete";
      toast.error(typeof msg === "string" ? msg : "Could not complete");
    },
  });

  const addAllMutation = useMutation({
    mutationFn: () => addAllChannelMembersBulkApi(workspaceId, channelId),
    onSuccess: (data) => {
      invalidateChannelMembers();
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: channelKeys.all(workspaceId),
      });
      toast.success(
        data.added > 0
          ? `Added ${data.added} member${data.added === 1 ? "" : "s"}`
          : "Everyone was already in this channel",
      );
      form.reset(defaultFormValues);
      onOpenChange(false);
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? ((e.response?.data as { message?: string })?.message ?? e.message)
        : "Could not add members";
      toast.error(typeof msg === "string" ? msg : "Could not add members");
    },
  });

  const workspaceMemberCount = wsMembers.length;

  const showSearchBlock =
    isDefaultChannel || (!isDefaultChannel && addMode === "specific");

  const hasPendingSelection =
    (pendingUserIds?.length ?? 0) > 0 ||
    (pendingInviteEmails?.length ?? 0) > 0;

  const headerDescription = isDefaultChannel
    ? "When someone joins this workspace, they are added to this default channel automatically."
    : addMode === "all"
      ? `Adds everyone in ${workspaceName} who is not in this channel yet.`
      : `You can also add email addresses of people who aren't members of ${workspaceName}.`;

  const handlePrimaryAction = () => {
    if (!isDefaultChannel && addMode === "all") {
      addAllMutation.mutate();
      return;
    }
    if (showSearchBlock && hasPendingSelection) {
      submitPendingMutation.mutate();
      return;
    }
    onOpenChange(false);
  };

  const busy =
    submitPendingMutation.isPending ||
    addAllMutation.isPending ||
    wsLoading;

  const footerLabel = (() => {
    if (addAllMutation.isPending) return "Adding…";
    if (submitPendingMutation.isPending) return "Adding…";
    if (!isDefaultChannel && addMode === "all") return "Done";
    if (showSearchBlock && hasPendingSelection) return "Add";
    return "Done";
  })();

  /** Done/Add: vô hiệu khi đang ở flow “specific” (hoặc default channel) mà chưa có chip pending */
  const primaryDisabled =
    busy ||
    (showSearchBlock &&
      !hasPendingSelection &&
      (isDefaultChannel || addMode === "specific")) ||
    (!isDefaultChannel && addMode === "all" && addAllMutation.isPending);

  return (
    <CustomDialog open={open} onOpenChange={handleDialogOpenChange} maxWidth="520px">
      <Form {...form}>
        <CustomDialogHeader onOpenChange={handleDialogOpenChange}>
          <div className="min-w-0 flex-1 pr-2">
            <CustomDialogTitle className="flex flex-wrap items-center gap-1 text-left text-xl">
              <span>Add people to</span>
              <span className="inline-flex items-center gap-0.5 font-bold">
                <BiHash size={18} className="shrink-0 opacity-90" />
                {currentChannelData.name}
              </span>
            </CustomDialogTitle>
            <Typography
              text={headerDescription}
              variant="p"
              className="mt-2 text-left text-[13px] leading-snug text-[#616061] dark:text-[#ababad]"
            />
          </div>
        </CustomDialogHeader>

        <CustomDialogBody className="space-y-4">
          {!isDefaultChannel ? (
            <div className="flex flex-col gap-3">
              <label className="flex cursor-pointer items-center gap-3 rounded-md p-2">
                <input
                  type="radio"
                  name="add-mode"
                  className="size-4 rounded-full border-[#616061] text-[#1264a3] focus:ring-[#1264a3]"
                  checked={addMode === "all"}
                  onChange={() => {
                    form.setValue("addMode", "all", { shouldDirty: true });
                    form.setValue("search", "");
                  }}
                />
                <span className="text-[14px] leading-snug text-[#1d1c1d] dark:text-[#f9f8f9]">
                  Add all {workspaceMemberCount} members of your workspace{" "}
                  {workspaceName}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-md p-2">
                <input
                  type="radio"
                  name="add-mode"
                  className="size-4 rounded-full border-[#616061] text-[#1264a3] focus:ring-[#1264a3]"
                  checked={addMode === "specific"}
                  onChange={() => {
                    form.setValue("addMode", "specific", { shouldDirty: true });
                    form.setValue("search", "");
                  }}
                />
                <span className="text-[14px] leading-snug text-[#1d1c1d] dark:text-[#f9f8f9]">
                  Add specific people
                </span>
              </label>
            </div>
          ) : null}

          {showSearchBlock ? (
            <div className="space-y-2">
              <div
                className={cn(
                  "flex min-h-[42px] cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-[#dddddd] bg-white px-2 py-1.5 text-[14px] dark:border-[#35373B] dark:bg-[#1A1D21]",
                  "focus-within:border-[#1264a3] focus-within:ring-1 focus-within:ring-[#1264a3]",
                )}
                onClick={() => void form.setFocus("search")}
              >
                {pendingMembersResolved.map((m) => (
                  <span
                    key={m.id}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#f0f0f0] py-0.5 pl-1 pr-0.5 text-[13px] font-semibold text-[#1d1c1d] dark:bg-[#2a2d31] dark:text-[#f9f8f9]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Avatar
                      src={m.avatar}
                      alt={memberLabel(m)}
                      className="size-6 shrink-0 rounded-sm"
                    />
                    <span className="max-w-[180px] truncate">{memberLabel(m)}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-[#616061] hover:bg-black/10 hover:text-[#1d1c1d] dark:hover:bg-white/10"
                      aria-label={`Remove ${memberLabel(m)}`}
                      onClick={() => removePendingUser(m.id)}
                    >
                      <LuX className="size-3.5" />
                    </button>
                  </span>
                ))}
                {(pendingInviteEmails ?? []).map((email) => (
                  <span
                    key={email}
                    className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#f0f0f0] py-0.5 pl-1 pr-0.5 text-[13px] font-semibold text-[#1d1c1d] dark:bg-[#2a2d31] dark:text-[#f9f8f9]"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-sm bg-[#1264a3]/15 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]">
                      <LuSend className="size-3.5" aria-hidden />
                    </span>
                    <span className="max-w-[200px] truncate">{email}</span>
                    <button
                      type="button"
                      className="rounded p-0.5 text-[#616061] hover:bg-black/10 hover:text-[#1d1c1d] dark:hover:bg-white/10"
                      aria-label={`Remove ${email}`}
                      onClick={() => removePendingInviteEmail(email)}
                    >
                      <LuX className="size-3.5" />
                    </button>
                  </span>
                ))}
                <FormField
                  control={form.control}
                  name="search"
                  render={({ field }) => (
                    <FormControl>
                      <input
                        {...field}
                        placeholder={
                          (pendingUserIds?.length ?? 0) +
                            (pendingInviteEmails?.length ?? 0) >
                          0
                            ? ""
                            : "Find members"
                        }
                        autoComplete="off"
                        disabled={busy}
                        className="min-w-[140px] flex-1 border-0 bg-transparent py-1 text-[14px] outline-none placeholder:text-[#616061] dark:placeholder:text-[#ababad]"
                      />
                    </FormControl>
                  )}
                />
              </div>

              {isDefaultChannel ? (
                <div className="flex items-start gap-2">
                  <IoIosInformationCircleOutline
                    className="mt-0.5 shrink-0 text-[#616061] dark:text-[#ababad]"
                    size={16}
                  />
                  <Typography
                    text="When new people join your workspace, they will be added to this default channel."
                    variant="p"
                    className="text-left text-[13px] leading-snug text-[#616061] dark:text-[#ababad]"
                  />
                </div>
              ) : null}

              {showDropdown ? (
                <div
                  className="overflow-hidden rounded-lg border border-[#e2e2e2] bg-white shadow-md dark:border-[#3f4248] dark:bg-[#222529] dark:shadow-lg"
                  role="listbox"
                >
                  <ul className="max-h-[240px] overflow-y-auto py-1">
                    {filteredPool.map((m) => (
                      <li key={m.id}>
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            "hover:bg-[#e8f5fa] dark:hover:bg-[#2a2d31]",
                          )}
                          onClick={() => addPendingUser(m.id)}
                        >
                          <Avatar
                            src={m.avatar}
                            alt={memberLabel(m)}
                            className="size-9 shrink-0 rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-[15px] font-bold text-[#1d1c1d] dark:text-[#f9f8f9]">
                              {memberLabel(m)}
                            </div>
                            <div className="truncate text-[13px] text-[#616061] dark:text-[#ababad]">
                              {memberHandleLine(m)}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}

                    {alreadyInChannelByEmail && inviteEmailParsed ? (
                      <li className="px-3 py-2.5 text-[13px] text-[#616061] dark:text-[#ababad]">
                        <span className="font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
                          {inviteEmailParsed}
                        </span>{" "}
                        is already in this channel.
                      </li>
                    ) : null}

                    {showInviteRow && inviteEmailParsed ? (
                      <li>
                        <button
                          type="button"
                          disabled={busy}
                          className={cn(
                            "flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors",
                            "hover:bg-[#e8f5fa] dark:hover:bg-[#2a2d31]",
                          )}
                          onClick={() => addPendingInviteEmail(inviteEmailParsed)}
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]">
                            <LuMailPlus className="size-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold text-[#1264a3] dark:text-[#1d9bd1]">
                              Invite{" "}
                              <span className="break-all">{inviteEmailParsed}</span>
                            </div>
                            <div className="text-[13px] text-[#616061] dark:text-[#ababad]">
                              Not in this workspace — will send invitation email
                              when you click Add.
                            </div>
                          </div>
                        </button>
                      </li>
                    ) : null}
                  </ul>
                </div>
              ) : null}

              {showNoMatchesLine ? (
                <p className="text-[13px] text-[#616061] dark:text-[#ababad]">
                  No matching people.
                </p>
              ) : null}
            </div>
          ) : null}
        </CustomDialogBody>

        <CustomDialogFooter>
          <Button
            variant="success"
            type="button"
            onClick={handlePrimaryAction}
            disabled={primaryDisabled}
          >
            {footerLabel}
          </Button>
        </CustomDialogFooter>
      </Form>
    </CustomDialog>
  );
}
