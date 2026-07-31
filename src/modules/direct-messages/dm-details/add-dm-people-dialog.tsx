"use client";

import {
  addConversationMembersApi,
  fetchWorkspaceMembersApi,
  sendWorkspaceInviteEmailsApi,
} from "@/apis";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import Avatar from "@/components/avatar";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField } from "@/components/ui/form";
import Typography from "@/components/ui/typography";
import { useWorkspace } from "@/hooks/use-workspace";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { messageKeys, workspaceKeys } from "@/lib/query-keys";
import type { DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import { isActiveWorkspaceMember } from "@/lib/dm-members";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
  type WorkspaceMemberDisplay,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useRouter } from "next/navigation";
import { useCallback, useMemo } from "react";
import { useForm, useWatch } from "react-hook-form";
import { IoIosInformationCircleOutline } from "react-icons/io";
import { LuMailPlus, LuSend, LuX } from "react-icons/lu";
import { toast } from "sonner";

const SEARCH_DEBOUNCE_MS = 300;

type AddDmPeopleFormValues = {
  search: string;
  pendingUserIds: string[];
  pendingInviteEmails: string[];
};

const defaultFormValues: AddDmPeopleFormValues = {
  search: "",
  pendingUserIds: [],
  pendingInviteEmails: [],
};

function matchesMemberSearch(
  m: WorkspaceMember,
  raw: string,
  overlay?: WorkspaceMemberDisplay | null,
): boolean {
  const q = raw.trim().toLowerCase();
  if (!q) return true;
  const d = mergeUserForDisplay(m as User, overlay);
  const name = (d.name ?? "").toLowerCase();
  const displayName = (d.displayName ?? "").toLowerCase();
  const email = d.email.toLowerCase();
  return (
    name.includes(q) || displayName.includes(q) || email.includes(q)
  );
}

function isValidEmailFormat(value: string): boolean {
  const t = value.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  conversationId: string;
  /** userId của mọi thành viên hiện có trong conversation */
  memberIdsInConversation: string[];
}

export default function AddDmPeopleDialog({
  open,
  onOpenChange,
  workspaceId,
  conversationId,
  memberIdsInConversation,
}: Props) {
  const router = useRouter();
  const inDmSet = useMemo(
    () => new Set(memberIdsInConversation),
    [memberIdsInConversation],
  );
  const currentCount = memberIdsInConversation.length;
  const slotsRemaining = Math.max(0, 9 - currentCount);

  const { data: workspaceMeta } = useWorkspace(workspaceId);
  const workspaceName = workspaceMeta?.name ?? "this workspace";

  const form = useForm<AddDmPeopleFormValues>({
    defaultValues: defaultFormValues,
  });

  const search = useWatch({ control: form.control, name: "search" });
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

  const { data: wsMembers = [], isPending: wsLoading } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: open && !!workspaceId,
    staleTime: 30_000,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  const memberLabel = (m: WorkspaceMember) => {
    const d = displayMember(m);
    return (
      d.displayName?.trim() || d.name?.trim() || m.email.split("@")[0] || m.email
    );
  };

  const memberHandleLine = (m: WorkspaceMember) => {
    const d = displayMember(m);
    const h =
      d.displayName?.trim() ||
      d.name?.trim() ||
      m.email.split("@")[0] ||
      m.email;
    return h.startsWith("@") ? h : `@${h}`;
  };

  const notInDmPool = useMemo(
    () =>
      wsMembers.filter(
        (m) => isActiveWorkspaceMember(m) && !inDmSet.has(m.id),
      ),
    [wsMembers, inDmSet],
  );

  const pendingIdSet = useMemo(
    () => new Set(pendingUserIds ?? []),
    [pendingUserIds],
  );

  const filteredPool = useMemo(
    () =>
      notInDmPool
        .filter((m) => !pendingIdSet.has(m.id))
        .filter((m) => matchesMemberSearch(m, searchKey, memberOverlayMap[m.id])),
    [notInDmPool, searchKey, pendingIdSet, memberOverlayMap],
  );

  const inDmMatches = useMemo(
    () =>
      wsMembers
        .filter((m) => isActiveWorkspaceMember(m) && inDmSet.has(m.id))
        .filter((m) => matchesMemberSearch(m, searchKey, memberOverlayMap[m.id])),
    [wsMembers, inDmSet, searchKey, memberOverlayMap],
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

  const alreadyInDmByEmail =
    memberExactByEmail != null && inDmSet.has(memberExactByEmail.id);

  const pendingEmailSet = useMemo(
    () => new Set((pendingInviteEmails ?? []).map((e) => e.toLowerCase())),
    [pendingInviteEmails],
  );

  const showInviteRow = Boolean(
    inviteEmailParsed &&
      !memberExactByEmail &&
      filteredPool.length === 0 &&
      inDmMatches.length === 0 &&
      !wsLoading &&
      !pendingEmailSet.has(inviteEmailParsed.toLowerCase()),
  );

  const showMemberResults = filteredPool.length > 0 || inDmMatches.length > 0;
  const showDropdown =
    searchKey.length > 0 &&
    (showMemberResults || showInviteRow || alreadyInDmByEmail);

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
      if (prev.length >= slotsRemaining) {
        toast.error(
          `This conversation can have up to 9 people. You can add ${slotsRemaining} more.`,
        );
        return;
      }
      form.setValue("pendingUserIds", [...prev, userId], {
        shouldDirty: true,
      });
      form.setValue("search", "");
      queueMicrotask(() => void form.setFocus("search"));
    },
    [form, slotsRemaining],
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
      let updated: DirectMessageConversation | undefined;
      if (uids.length > 0) {
        updated = await addConversationMembersApi(
          workspaceId,
          conversationId,
          uids,
        );
      }
      let inviteResult = {
        sent: 0,
        skipped: 0,
        failed: [] as { email: string; message: string }[],
      };
      if (emails.length > 0) {
        inviteResult = await sendWorkspaceInviteEmailsApi(
          workspaceId,
          emails,
        );
      }
      return { updated, inviteResult, nUser: uids.length, nMail: emails.length };
    },
    onSuccess: (data) => {
      const { nUser, nMail, updated, inviteResult } = data;
      if (updated) {
        const oldId = conversationId;
        const newId = updated.id;
        if (newId !== oldId) {
          queryClient.removeQueries({
            queryKey: messageKeys.conversationDetail(oldId),
          });
          queryClient.removeQueries({ queryKey: messageKeys.list(oldId) });
          queryClient.removeQueries({
            queryKey: messageKeys.conversationAttachments(oldId),
          });
          queryClient.removeQueries({
            queryKey: ["pinned-messages", oldId],
          });
          void queryClient.invalidateQueries({
            predicate: (q) => {
              const k = q.queryKey;
              return (
                Array.isArray(k) &&
                k[0] === "dm-conversations" &&
                k[1] === oldId &&
                k[2] === "files-search"
              );
            },
          });
          queryClient.setQueryData(
            messageKeys.conversationDetail(newId),
            updated,
          );
          queryClient.setQueryData<DirectMessageConversation[]>(
            messageKeys.conversations(workspaceId),
            (old) => {
              if (!old) return [updated];
              const filtered = old.filter((c) => c.id !== oldId);
              const idx = filtered.findIndex((c) => c.id === newId);
              if (idx === -1) return [updated, ...filtered];
              const next = [...filtered];
              next[idx] = updated;
              return next;
            },
          );
          void queryClient.invalidateQueries({
            predicate: (q) => {
              const k = q.queryKey;
              return (
                Array.isArray(k) &&
                k[0] === "dm-conversations" &&
                k[1] === "invite-candidates" &&
                (k[2] === oldId || k[2] === newId)
              );
            },
          });
          router.replace(`/workspace/${workspaceId}/dm/${newId}`);
        } else {
          queryClient.setQueryData(
            messageKeys.conversationDetail(conversationId),
            updated,
          );
          queryClient.setQueryData<DirectMessageConversation[]>(
            messageKeys.conversations(workspaceId),
            (old) => {
              if (!old) return old;
              return old.map((c) => (c.id === conversationId ? updated! : c));
            },
          );
          void queryClient.invalidateQueries({
            predicate: (q) => {
              const k = q.queryKey;
              return (
                Array.isArray(k) &&
                k[0] === "dm-conversations" &&
                k[1] === "invite-candidates" &&
                k[2] === conversationId
              );
            },
          });
        }
      } else {
        void queryClient.invalidateQueries({
          predicate: (q) => {
            const k = q.queryKey;
            return (
              Array.isArray(k) &&
              k[0] === "dm-conversations" &&
              k[1] === "invite-candidates" &&
              k[2] === conversationId
            );
          },
        });
      }
      void queryClient.invalidateQueries({
        queryKey: workspaceKeys.members(workspaceId),
      });

      if (nUser > 0) {
        toast.success(
          updated && updated.id !== conversationId
            ? "Merged with an existing group conversation"
            : nUser === 1
              ? "Added 1 person to the conversation"
              : `Added ${nUser} people to the conversation`,
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

  const hasPendingSelection =
    (pendingUserIds?.length ?? 0) > 0 ||
    (pendingInviteEmails?.length ?? 0) > 0;

  const headerDescription = `You can also add email addresses of people who aren't members of ${workspaceName}.`;

  const handlePrimaryAction = () => {
    if (!hasPendingSelection) return;
    submitPendingMutation.mutate();
  };

  const busy = submitPendingMutation.isPending || wsLoading;

  const footerLabel = (() => {
    if (submitPendingMutation.isPending) return "Adding…";
    if (hasPendingSelection) return "Add";
    return "Done";
  })();

  const primaryDisabled =
    busy || slotsRemaining <= 0 || !hasPendingSelection;

  return (
    <CustomDialog open={open} onOpenChange={handleDialogOpenChange} maxWidth="520px">
      <Form {...form}>
        <CustomDialogHeader onOpenChange={handleDialogOpenChange}>
          <div className="min-w-0 flex-1 pr-2">
            <CustomDialogTitle className="text-left text-xl font-bold">
              Add people to this conversation
            </CustomDialogTitle>
            <Typography
              text={headerDescription}
              variant="p"
              className="mt-2 text-left text-[13px] leading-snug text-[#616061] dark:text-[#ababad]"
            />
          </div>
        </CustomDialogHeader>

        <CustomDialogBody className="space-y-4">
          {slotsRemaining > 0 ? (
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
                      src={displayMember(m).avatar ?? null}
                      alt={memberLabel(m)}
                      className="size-6 shrink-0 rounded-sm"
                    />
                    <div className="inline-flex min-w-0 max-w-[220px] items-center gap-0.5">
                      <span className="min-w-0 flex-1 truncate">
                        {memberLabel(m)}
                      </span>
                      <UserStatusEmojiInline
                        statusEmoji={displayMember(m).statusEmoji}
                        statusText={displayMember(m).statusText}
                        emojiClassName="text-[12px]"
                        interactive={Boolean(
                          displayMember(m).statusText?.trim(),
                        )}
                      />
                    </div>
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

              <div className="flex items-start gap-2">
                <IoIosInformationCircleOutline
                  className="mt-0.5 shrink-0 text-[#616061] dark:text-[#ababad]"
                  size={16}
                />
                <Typography
                  text="DMs can have up to 9 people (including you)."
                  variant="p"
                  className="text-left text-[13px] leading-snug text-[#616061] dark:text-[#ababad]"
                />
              </div>

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
                            src={displayMember(m).avatar ?? null}
                            alt={memberLabel(m)}
                            className="size-9 shrink-0 rounded-md"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1">
                              <div className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#1d1c1d] dark:text-[#f9f8f9]">
                                {memberLabel(m)}
                              </div>
                              <UserStatusEmojiInline
                                statusEmoji={displayMember(m).statusEmoji}
                                statusText={displayMember(m).statusText}
                                emojiClassName="text-[14px]"
                              />
                            </div>
                            <div className="truncate text-[13px] text-[#616061] dark:text-[#ababad]">
                              {memberHandleLine(m)}
                            </div>
                          </div>
                        </button>
                      </li>
                    ))}

                    {inDmMatches.map((m) => (
                      <li key={`in-${m.id}`}>
                        <div className="flex w-full items-center gap-3 px-3 py-2.5 text-left">
                          <Avatar
                            src={displayMember(m).avatar ?? null}
                            alt={memberLabel(m)}
                            className="size-9 shrink-0 rounded-md opacity-80"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex min-w-0 items-center gap-1">
                              <div className="min-w-0 flex-1 truncate text-[15px] font-bold text-[#1d1c1d] dark:text-[#f9f8f9]">
                                {memberLabel(m)}
                              </div>
                              <UserStatusEmojiInline
                                statusEmoji={displayMember(m).statusEmoji}
                                statusText={displayMember(m).statusText}
                                emojiClassName="text-[14px]"
                              />
                            </div>
                            <div className="truncate text-[13px] text-[#616061] dark:text-[#ababad]">
                              {memberHandleLine(m)}
                            </div>
                          </div>
                          <span className="shrink-0 text-right text-[12px] text-[#616061] dark:text-[#ababad]">
                            Already in this conversation
                          </span>
                        </div>
                      </li>
                    ))}

                    {alreadyInDmByEmail && inviteEmailParsed ? (
                      <li className="px-3 py-2.5 text-[13px] text-[#616061] dark:text-[#ababad]">
                        <span className="font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]">
                          {inviteEmailParsed}
                        </span>{" "}
                        is already in this conversation.
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
                          onClick={() =>
                            addPendingInviteEmail(inviteEmailParsed)
                          }
                        >
                          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/20 dark:text-[#1d9bd1]">
                            <LuMailPlus className="size-5" aria-hidden />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-bold text-[#1264a3] dark:text-[#1d9bd1]">
                              Invite{" "}
                              <span className="break-all">
                                {inviteEmailParsed}
                              </span>
                            </div>
                            <div className="text-[13px] text-[#616061] dark:text-[#ababad]">
                              Not in this workspace — will send invitation
                              email when you click Add.
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
