"use client";

import {
  addChannelMemberApi,
  fetchChannelMembersApi,
  removeChannelMemberApi,
} from "@/apis";
import Avatar from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import Typography from "@/components/ui/typography";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useWorkspace } from "@/hooks/use-workspace";
import { channelKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import type { Channel, ChannelMember, User } from "@/lib/types";
import { hasWorkspacePermission } from "@/lib/workspace-permissions";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import {
  mergeChannelMemberWithOverlay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { useUserStore } from "@/stores/useUserStore";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useCallback, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { LuUserPlus } from "react-icons/lu";
import { toast } from "sonner";
import AddChannelMemberDialog from "@/components/dialogs/add-channel-member-dialog";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";

const SEARCH_DEBOUNCE_MS = 300;

function displayLabel(m: ChannelMember): string {
  return (
    m.displayName?.trim() ||
    m.name?.trim() ||
    m.email.split("@")[0] ||
    m.email
  );
}

function secondaryLine(m: ChannelMember): string {
  if (m.statusText?.trim()) {
    return m.statusText.trim();
  }
  return m.email.split("@")[0] || m.email;
}

function MemberRow({
  m,
  workspaceId,
  currentUserId,
  onOpenProfile,
  onCloseDialog,
  showRemove,
  showAdd,
  addPending,
  removePending,
  onAdd,
  onRemove,
}: {
  m: ChannelMember;
  workspaceId: string;
  currentUserId: string | undefined;
  onOpenProfile: (m: ChannelMember) => void;
  onCloseDialog: () => void;
  showRemove: boolean;
  showAdd: boolean;
  addPending: boolean;
  removePending: boolean;
  onAdd: () => void;
  onRemove: () => void;
}) {
  const overlay = useWorkspaceMemberOverlay(workspaceId, m.id);
  const row = useMemo(() => mergeChannelMemberWithOverlay(m, overlay), [m, overlay]);
  const isYou = currentUserId === row.id;
  const primary = displayLabel(row);
  const secondary = secondaryLine(row);

  return (
    <li className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <button
        type="button"
        onClick={() => {
          onOpenProfile(row);
          onCloseDialog();
        }}
        className={cn(
          "flex min-w-0 flex-1 items-center gap-3 rounded-md px-1 py-2.5 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6",
        )}
      >
        <Avatar
          src={row.avatar}
          alt={primary}
          className="h-10! w-10! shrink-0 rounded-md"
        />
        <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <Typography
                text={isYou ? `${primary} (you)` : primary}
                className="truncate text-sm font-bold text-[#1d1c1d] dark:text-[#f9f8f9]"
              />
            </div>
            <UserStatusEmojiInline
              statusEmoji={row.statusEmoji}
              statusText={row.statusText}
              emojiClassName="text-[15px]"
            />
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[#616061] dark:text-[#ababad]">
            <UserPresenceIndicator
              workspaceId={workspaceId}
              userId={row.id}
              isAway={row.isAway}
              size="sm"
            />
            <span className="truncate">{secondary}</span>
          </div>
        </div>
      </button>

      {showAdd ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 border-[#c4c4c4] text-[13px] font-semibold text-[#1d1c1d] dark:border-[#565856] dark:text-[#f9f8f9]"
          disabled={addPending}
          onClick={(e) => {
            e.stopPropagation();
            onAdd();
          }}
        >
          Add to channel
        </Button>
      ) : null}

      {showRemove ? (
        <button
          type="button"
          className="shrink-0 px-2 py-1 text-[13px] font-semibold text-[#1264a3] hover:underline disabled:opacity-50 dark:text-[#1d9bd1]"
          disabled={removePending}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
        >
          Remove
        </button>
      ) : null}
    </li>
  );
}

export default function MembersTab({
  currentChannelData,
  onOpenChange,
  isMember,
}: {
  currentChannelData: Channel;
  onOpenChange: (open: boolean) => void;
  isMember: boolean;
}) {
  const [openAddMemberDialog, setOpenAddMemberDialog] = useState(false);
  const [addMemberDialogNonce, setAddMemberDialogNonce] = useState(0);
  const workspaceId = currentChannelData.workspaceId;
  const channelId = currentChannelData.id;
  const isDefaultChannel = currentChannelData.isDefaultChannel;
  const { user: currentUser } = useUserStore();
  const openProfile = useProfilePanelStore((s) => s.open);
  const queryClient = useQueryClient();

  const { data: workspaceMeta } = useWorkspace(workspaceId);
  const role = workspaceMeta?.role;
  const canRemoveOthers = hasWorkspacePermission(
    workspaceMeta,
    role ?? null,
    currentChannelData.isPrivate
      ? "remove_users_from_private_channels"
      : "remove_users_from_public_channels",
  );

  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);
  const searchKey = debouncedSearch.trim();

  const {
    data: directory,
    isPending,
    isError,
    refetch,
  } = useQuery({
    queryKey: channelKeys.members(workspaceId, channelId, searchKey),
    queryFn: () =>
      fetchChannelMembersApi(workspaceId, channelId, searchKey || undefined),
    enabled: !!workspaceId && !!channelId,
    staleTime: 30_000,
  });

  const inChannel = directory?.inChannel ?? [];
  const notInChannel = directory?.notInChannel ?? [];
  /** Chỉ hiện khối "Not in this channel" khi user đang search (API cũng chỉ trả khi có search). */
  const showNotInSection = searchKey.length > 0 && notInChannel.length > 0;

  const invalidateMemberQueries = useCallback(() => {
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

  const addMutation = useMutation({
    mutationFn: (userId: string) =>
      addChannelMemberApi(workspaceId, channelId, userId),
    onSuccess: () => {
      invalidateMemberQueries();
      toast.success("Added to channel");
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? e.message
        : "Could not add member";
      toast.error(typeof msg === "string" ? msg : "Could not add member");
    },
  });

  const removeMutation = useMutation({
    mutationFn: (memberUserId: string) =>
      removeChannelMemberApi(workspaceId, channelId, memberUserId),
    onSuccess: () => {
      invalidateMemberQueries();
      toast.success("Removed from channel");
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? e.message
        : "Could not remove member";
      toast.error(typeof msg === "string" ? msg : "Could not remove member");
    },
  });

  const handleAddPeople = useCallback(() => {
    setAddMemberDialogNonce((n) => n + 1);
    setOpenAddMemberDialog(true);
  }, []);

  const openMemberProfile = useCallback(
    (m: ChannelMember) => {
      const u: User = {
        id: m.id,
        email: m.email,
        name: m.name,
        displayName: m.displayName ?? null,
        avatar: m.avatar,
        statusEmoji: m.statusEmoji ?? null,
        statusText: m.statusText ?? null,
      };
      openProfile({ userData: u, workspaceId });
    },
    [openProfile, workspaceId],
  );

  const showEmpty =
    !isPending &&
    (searchKey
      ? inChannel.length === 0 && notInChannel.length === 0
      : inChannel.length === 0);

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
        <Typography
          text="Could not load members"
          className="text-[14px] font-semibold text-[#1d1c1d] dark:text-[#f9f8f9]"
        />
        <button
          type="button"
          onClick={() => void refetch()}
          className="text-[13px] font-semibold text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="relative shrink-0">
        <FiSearch
          className="pointer-events-none absolute left-2.5 top-1/2 size-[18px] -translate-y-1/2 text-[#616061] sm:left-3 dark:text-[#ababad]"
          aria-hidden
        />
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Find members"
          autoComplete="off"
          className={cn(
            "h-10 rounded-lg border-[#dddddd] bg-white pl-9 text-[14px] placeholder:text-[#616061] sm:pl-10 sm:text-[15px] dark:border-[#35373B] dark:bg-[#1A1D21] dark:placeholder:text-[#ababad]",
            inputValue ? "pr-16" : "pr-3",
          )}
        />
        {inputValue ? (
          <button
            type="button"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[13px] font-semibold text-[#1264a3] hover:underline dark:text-[#1d9bd1]"
            onClick={() => setInputValue("")}
          >
            Clear
          </button>
        ) : null}
      </div>

      {isMember ? (
        <button
          type="button"
          onClick={handleAddPeople}
          className="flex w-full shrink-0 items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/15 dark:text-[#1d9bd1]">
            <LuUserPlus className="size-5" aria-hidden />
          </span>
          <Typography
            text="Add people"
            className="text-[15px] font-semibold text-[#1264a3] dark:text-[#1d9bd1]"
          />
        </button>
      ) : null}

      <div className="min-h-0 flex-1">
        {isPending ? (
          <ul className="flex flex-col gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <li
                key={i}
                className="flex items-center gap-3 rounded-md border border-transparent px-1 py-2"
              >
                <Skeleton className="size-9 shrink-0 rounded-md bg-[#e8e8e8] dark:bg-[#2a2d31]" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40 bg-[#e8e8e8] dark:bg-[#2a2d31]" />
                  <Skeleton className="h-3 w-28 bg-[#e8e8e8] dark:bg-[#2a2d31]" />
                </div>
              </li>
            ))}
          </ul>
        ) : showEmpty ? (
          <p className="py-6 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
            {searchKey
              ? "No members match your search."
              : "No members in this channel."}
          </p>
        ) : (
          <div className="flex flex-col gap-6">
            {inChannel.length > 0 ? (
              <section>
                <Typography
                  text="In this channel"
                  className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-[#616061] dark:text-[#ababad]"
                />
                <ul className="flex flex-col gap-1">
                  {inChannel.map((m) => {
                    const isYou = currentUser?.id === m.id;
                    const showRemove =
                      !isDefaultChannel && !isYou && canRemoveOthers;
                    return (
                      <MemberRow
                        key={m.id}
                        m={m}
                        workspaceId={workspaceId}
                        currentUserId={currentUser?.id}
                        onOpenProfile={openMemberProfile}
                        onCloseDialog={() => onOpenChange(false)}
                        showRemove={showRemove}
                        showAdd={false}
                        addPending={addMutation.isPending}
                        removePending={removeMutation.isPending}
                        onAdd={() => addMutation.mutate(m.id)}
                        onRemove={() => removeMutation.mutate(m.id)}
                      />
                    );
                  })}
                </ul>
              </section>
            ) : null}

            {showNotInSection && inChannel.length > 0 ? (
              <div className="border-t border-[#dddddd] pt-2 dark:border-[#35373B]" />
            ) : null}

            {showNotInSection ? (
              <section>
                <Typography
                  text="Not in this channel"
                  className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-[#616061] dark:text-[#ababad]"
                />
                <ul className="flex flex-col gap-1">
                  {notInChannel.map((m) => (
                    <MemberRow
                      key={m.id}
                      m={m}
                      workspaceId={workspaceId}
                      currentUserId={currentUser?.id}
                      onOpenProfile={openMemberProfile}
                      onCloseDialog={() => onOpenChange(false)}
                      showRemove={false}
                      showAdd
                      addPending={addMutation.isPending}
                      removePending={removeMutation.isPending}
                      onAdd={() => addMutation.mutate(m.id)}
                      onRemove={() => removeMutation.mutate(m.id)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <AddChannelMemberDialog
        key={`${channelId}-${addMemberDialogNonce}`}
        open={openAddMemberDialog}
        onOpenChange={setOpenAddMemberDialog}
        currentChannelData={currentChannelData}
      />
    </div>
  );
}
