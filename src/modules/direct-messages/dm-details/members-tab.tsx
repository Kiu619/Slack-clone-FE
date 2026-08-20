"use client";

import Avatar from "@/components/avatar";
import { Input } from "@/components/ui/input";
import Typography from "@/components/ui/typography";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useAppTranslation } from "@/hooks/use-translation";
import { cn } from "@/lib/utils";
import { getMemberBaseDisplayName, isDeactivatedUser } from "@/lib/dm-members";
import type { DirectMessageConversation, User } from "@/lib/types";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { useUserStore } from "@/stores/useUserStore";
import {
  mergeUserForDisplay,
  useWorkspaceMemberOverlay,
} from "@/stores/useWorkspaceMemberStore";
import { useCallback, useMemo, useState } from "react";
import { FiSearch } from "react-icons/fi";
import { GoDot, GoDotFill } from "react-icons/go";
import { LuUserPlus } from "react-icons/lu";
import AddDmPeopleDialog from "./add-dm-people-dialog";
import { UserStatusEmojiInline } from "@/components/user-status-emoji-inline";

const SEARCH_DEBOUNCE_MS = 300;

function displayLabel(m: User): string {
  return getMemberBaseDisplayName(m);
}

function secondaryLine(m: User): string {
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
  t,
}: {
  m: User;
  workspaceId: string;
  currentUserId: string | undefined;
  onOpenProfile: (m: User) => void;
  onCloseDialog: () => void;
  t: ReturnType<typeof useAppTranslation>;
}) {
  const overlay = useWorkspaceMemberOverlay(workspaceId, m.id);
  const row = useMemo(() => mergeUserForDisplay(m, overlay), [m, overlay]);
  const isYou = currentUserId === row.id;
  const isDeactivated = isDeactivatedUser(row);
  const primary = displayLabel(row);
  const secondary = isDeactivated ? t("deactivatedAccount") : secondaryLine(row);

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
          isDeactivated && "opacity-75",
        )}
      >
        <Avatar
          src={row.avatar ?? null}
          alt={primary}
          className="h-10! w-10! shrink-0 rounded-md"
        />
            <div className="min-w-0 flex-1 text-left">
          <div className="flex min-w-0 items-center gap-1">
            <div className="min-w-0 flex-1">
              <Typography
                text={isYou ? `${primary} ${t("you2")}` : primary}
                className="truncate text-sm font-bold text-[#1d1c1d] dark:text-[#f9f8f9]"
              />
            </div>
            {isDeactivated ? (
              <span className="shrink-0 rounded bg-[#e8e8e8] px-1.5 py-0.5 text-[11px] font-semibold text-[#616061] dark:bg-[#2f3338] dark:text-[#ababad]">
                deactivated
              </span>
            ) : (
              <UserStatusEmojiInline
                statusEmoji={row.statusEmoji}
                statusText={row.statusText}
                emojiClassName="text-[15px]"
              />
            )}
          </div>
          <div className="mt-0.5 flex min-w-0 items-center gap-1.5 text-[13px] text-[#616061] dark:text-[#ababad]">
            {isDeactivated ? null : row.isAway ? (
              <GoDot className="shrink-0 text-[12px] text-[#e8912d]" />
            ) : (
              <GoDotFill className="size-3 shrink-0 text-[#007a5a]" />
            )}
            <span className="truncate">{secondary}</span>
          </div>
        </div>
      </button>
    </li>
  );
}

export default function MembersTab({
  currentDmData,
  onOpenChange,
}: {
  currentDmData: DirectMessageConversation;
  onOpenChange: (open: boolean) => void;
}) {
  const [openAdd, setOpenAdd] = useState(false);
  const workspaceId = currentDmData.workspaceId;
  const conversationId = currentDmData.id;
  const members = currentDmData.members;
  const slotsRemaining = Math.max(0, 9 - members.length);
  const t = useAppTranslation("directMessages");

  const { user: currentUser } = useUserStore();
  const openProfile = useProfilePanelStore((s) => s.open);

  const [inputValue, setInputValue] = useState("");
  const debouncedSearch = useDebouncedValue(inputValue, SEARCH_DEBOUNCE_MS);
  const searchKey = debouncedSearch.trim().toLowerCase();

  const filtered = useMemo(() => {
    if (!searchKey) return members;
    return members.filter((m) => {
      const name = (m.name ?? "").toLowerCase();
      const displayName = (m.displayName ?? "").toLowerCase();
      const email = m.email.toLowerCase();
      return (
        name.includes(searchKey) ||
        displayName.includes(searchKey) ||
        email.includes(searchKey)
      );
    });
  }, [members, searchKey]);

  const openMemberProfile = useCallback(
    (m: User) => {
      openProfile({ userData: m, workspaceId });
    },
    [openProfile, workspaceId],
  );

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
          placeholder={t("findMembers")}
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
            {t("clear")}
          </button>
        ) : null}
      </div>

      {slotsRemaining > 0 ? (
        <button
          type="button"
          onClick={() => setOpenAdd(true)}
          className="flex w-full shrink-0 items-center gap-3 rounded-md px-1 py-2 text-left transition-colors hover:bg-black/4 dark:hover:bg-white/6"
        >
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-[#1264a3]/12 text-[#1264a3] dark:bg-[#1d9bd1]/15 dark:text-[#1d9bd1]">
            <LuUserPlus className="size-5" aria-hidden />
          </span>
          <Typography
            text={t("addPeople")}
            className="text-[15px] font-semibold text-[#1264a3] dark:text-[#1d9bd1]"
          />
        </button>
      ) : null}

      <div className="min-h-0 flex-1">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-[13px] text-[#616061] dark:text-[#ababad]">
            {searchKey
              ? t("noMembersMatchSearch")
              : t("noMembersInThisConversation")}
          </p>
        ) : (
          <section>
            <Typography
              text={t("members2")}
              className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-wide text-[#616061] dark:text-[#ababad]"
            />
            <ul className="flex flex-col gap-1">
              {filtered.map((m) => (
                <MemberRow
                  key={m.id}
                  m={m}
                  workspaceId={workspaceId}
                  currentUserId={currentUser?.id}
                  onOpenProfile={openMemberProfile}
                  onCloseDialog={() => onOpenChange(false)}
                  t={t}
                />
              ))}
            </ul>
          </section>
        )}
      </div>

      <AddDmPeopleDialog
        open={openAdd}
        onOpenChange={setOpenAdd}
        workspaceId={workspaceId}
        conversationId={conversationId}
        memberIdsInConversation={members.map((m) => m.id)}
      />
    </div>
  );
}
