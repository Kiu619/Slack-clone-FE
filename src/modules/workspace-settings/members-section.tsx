"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, MoreHorizontal, Search } from "lucide-react";
import { useMemo, useState } from "react";

import {
    activateWorkspaceMemberApi,
    deactivateWorkspaceMemberApi,
    fetchWorkspaceMembersPageApi,
    removeDeactivatedWorkspaceMemberApi,
    updateWorkspaceMemberRoleApi,
} from "@/apis";
import ChangeAccountTypeDialog from "@/components/dialogs/change-account-type-dialog";
import DeactivateUserDialog from "@/components/dialogs/deactivate-user-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import Typography from "@/components/ui/typography";
import { UserPresenceIndicator } from "@/components/user-presence-indicator";
import { useWorkspace } from "@/hooks/use-workspace";
import { authKeys, messageKeys, workspaceKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAppTranslation } from "@/hooks/use-translation";

import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

import ActivateUserDialog from "@/components/dialogs/activate-user-dialog";
import DeleteDeactivatedUserDialog from "@/components/dialogs/delete-deactivated-user-dialog";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { ACTIVE_ITEM_STYLE, MENU_ITEM_STYLE } from "@/constants/styles";
import type { WorkspaceMember } from "@/lib/types";
import { accountTypeLabel } from "./helpers";

type SortDirection = "asc" | "desc";
type SortKey =
  | "fullName"
  | "displayName"
  | "email"
  | "accountType"
  | "joined"
  | "status";
type PaginationValue = number | "...";

type MembersPage = {
  items: WorkspaceMember[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

const PAGE_SIZE = 25;

function SortButton({
  label,
  sortField,
  activeSortKey,
  activeSortDirection,
  onSort,
}: {
  label: string;
  sortField: SortKey;
  activeSortKey: SortKey;
  activeSortDirection: SortDirection;
  onSort: (key: SortKey) => void;
}) {
  const active = activeSortKey === sortField;
  const Icon =
    active && activeSortDirection === "desc" ? ChevronDown : ChevronUp;

  return (
    <button
      type="button"
      onClick={() => onSort(sortField)}
      className={cn(
        "inline-flex items-center gap-1 text-left font-semibold  hover:text-[#1264a3]",
        active ? "text-selection-hover!" : "text-[#616061]",
      )}
    >
      <span>{label}</span>
      <Icon
        className={cn(
          "h-3.5 w-3.5",
          active ? "text-[#1264a3]" : "text-[#8e8d93]",
        )}
      />
    </button>
  );
}

function formatJoinedAt(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function getPaginationRange(currentPage: number, totalPages: number) {
  const pages: PaginationValue[] = [];
  const push = (value: PaginationValue) => {
    if (pages[pages.length - 1] !== value) pages.push(value);
  };

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) push(page);
    return pages;
  }

  push(1);
  if (currentPage > 3) push("...");

  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let page = start; page <= end; page += 1) push(page);

  if (currentPage < totalPages - 2) push("...");
  push(totalPages);

  return pages;
}

export function MembersSection({ workspaceId }: { workspaceId: string }) {
  const t = useAppTranslation("workspaceSettings");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("fullName");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [page, setPage] = useState(1);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<WorkspaceMember | null>(
    null,
  );
  const [savingRole, setSavingRole] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [savingDeactivate, setSavingDeactivate] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [savingActivate, setSavingActivate] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [savingDelete, setSavingDelete] = useState(false);
  const queryClient = useQueryClient();
  const { data: workspace } = useWorkspace(workspaceId);
  const normalizedSearch = search.trim();

  const { data, isPending, isError, refetch } = useQuery<MembersPage>({
    queryKey: workspaceKeys.membersPage(workspaceId, {
      page,
      pageSize: PAGE_SIZE,
      sortKey,
      sortDirection,
      search: normalizedSearch,
    }),
    queryFn: () =>
      fetchWorkspaceMembersPageApi(workspaceId, {
        page,
        pageSize: PAGE_SIZE,
        sortBy: sortKey,
        sortDirection,
        q: normalizedSearch || undefined,
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const members = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = data?.totalPages ?? 1;
  const currentPage = data?.page ?? page;
  const currentPageSize = data?.pageSize ?? PAGE_SIZE;
  const paginationPages = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setSortKey(key);
    setSortDirection("asc");
  };

  const invalidateMemberDependentCaches = async () => {
    await Promise.all([
      queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "members"],
      }),
      queryClient.invalidateQueries({
        queryKey: ["workspaces", workspaceId, "members-page"],
      }),
      queryClient.invalidateQueries({
        queryKey: messageKeys.conversations(workspaceId),
      }),
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.recents(workspaceId),
      }),
      queryClient.invalidateQueries({
        predicate: (query) => {
          const key = query.queryKey;
          return (
            Array.isArray(key) &&
            key[0] === "dm-conversations" &&
            (key[1] === workspaceId || key[1] === "detail")
          );
        },
      }),
    ]);
  };

  if (isError) {
    return (
      <div className="rounded-[4px] border border-input p-6">
        <Typography
          text={t("membersSection.couldNotLoadMembers")}
          className="text-[14px] font-semibold "
        />
        <button
          type="button"
          onClick={() => void refetch()}
          className="mt-2 text-[13px] font-semibold text-[#1264a3] hover:underline"
        >
          {t("membersSection.tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-4 bg-white dark:bg-[#1A1D21]">
      <div className="flex flex-col gap-4 py-4 md:flex-row md:items-center md:justify-between ">
        <div>
              <Typography
            as="h1"
            variant="h3"
            className="text-[24px] font-bold tracking-[-0.03em] md:text-[32px]"
          >
            {t("membersSection.manageMembers")}
          </Typography>
        </div>

        <Button
          variant="success"
          size="sm"
          className="h-9 rounded-lg px-4 text-[14px] font-semibold"
        >
          {t("membersSection.invitePeople")}
        </Button>
      </div>

      <div className="flex flex-col gap-3 py-3 text-[13px] md:flex-row md:items-center md:justify-between">
        <div className="mt-2 flex flex-wrap items-center gap-3 text-[13px] md:gap-4">
          <span>
            {t("membersSection.membersCount", { count: total })}
          </span>
          <button type="button" className="text-[#1264a3] hover:underline">
            {t("membersSection.exportFullMemberList")}
          </button>
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative w-full md:w-auto">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#616061]" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder={t("membersSection.filterByNameEmailOrId")}
              className="h-10 w-full bg-transparent pl-10 border-[#dddddd] dark:border-[#35373B] md:w-[260px]"
              autoComplete="off"
            />
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto rounded-[4px] border border-[#ece8ec] bg-white dark:border-[#35373B] dark:bg-[#1A1D21]">
        <Table className="min-w-[1120px] border-separate border-spacing-0">
          <TableHeader>
            <TableRow className="sticky top-0 z-20 border-b border-[#ece8ec] bg-white text-[13px] font-semibold text-[#1d1c1d] dark:border-[#35373B] dark:bg-[#1A1D21] dark:text-[#d1d2d3] hover:bg-white dark:hover:bg-[#1A1D21]">
              <TableHead className="sticky left-0 z-30 w-[400px] min-w-[400px] max-w-[400px] border-r border-[#ece8ec] bg-white px-4 py-4 shadow-[10px_0_12px_-12px_rgba(0,0,0,0.35)] dark:border-[#35373B] dark:bg-[#1A1D21] md:px-6">
                <SortButton
                  label={t("membersSection.fullName")}
                  sortField="fullName"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="px-4 py-4 md:px-6">
                <SortButton
                  label={t("membersSection.displayName")}
                  sortField="displayName"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="px-4 py-4 md:px-6">
                <SortButton
                  label={t("membersSection.emailAddress")}
                  sortField="email"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="px-4 py-4 md:px-6">{t("membersSection.memberId")}</TableHead>
              <TableHead className="px-4 py-4 md:px-6">
                <SortButton
                  label={t("membersSection.accountType")}
                  sortField="accountType"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="px-4 py-4 md:px-6">
                <SortButton
                  label={t("membersSection.joined")}
                  sortField="joined"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
              <TableHead className="px-4 py-4 md:px-6">
                <SortButton
                  label={t("membersSection.status")}
                  sortField="status"
                  activeSortKey={sortKey}
                  activeSortDirection={sortDirection}
                  onSort={handleSort}
                />
              </TableHead>
            </TableRow>
          </TableHeader>

          <TableBody className="divide-y divide-[#ece8ec] dark:divide-[#35373B]">
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-4 py-8 text-center text-[14px] text-[#616061] dark:text-[#b4b8be]"
                >
                  {t("membersSection.loadingMembers")}
                </TableCell>
              </TableRow>
            ) : members.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="px-4 py-8 text-center text-[14px] text-[#616061] dark:text-[#b4b8be]"
                >
                  {t("membersSection.noMembersMatchSearch")}
                </TableCell>
              </TableRow>
            ) : (
              members.map((member, index) => {
                const accountType = accountTypeLabel(member.role);
                const fullName = member.name?.trim() || "-";
                const isBand = index % 2 === 0;

                return (
                  <TableRow
                    key={member.id}
                    className={cn(
                      "border-[#ece8ec] dark:border-[#35373B]",
                      isBand
                        ? "bg-white dark:bg-[#1A1D21]"
                        : "bg-[#fafafa] dark:bg-[#1D2125]",
                    )}
                  >
                    <TableCell
                      className={cn(
                        "sticky left-0 z-10 min-w-100 max-w-100 border-r border-[#ece8ec] px-4 py-3 shadow-[10px_0_12px_-12px_rgba(0,0,0,0.35)] dark:border-[#35373B] md:px-6 truncate",
                        isBand
                          ? "bg-white dark:bg-[#1A1D21]"
                          : "bg-[#fafafa] dark:bg-[#1D2125]",
                      )}
                    >
                      <div className="flex items-center justify-between gap-3 truncate">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative h-9 w-9 shrink-0">
                            <Avatar className="h-9 w-9 rounded-md">
                              <AvatarImage
                                src={member.avatar ?? ""}
                                alt={fullName}
                              />
                              <AvatarFallback className="rounded-md bg-[#f2f2f2] text-[12px] font-semibold text-[#1d1c1d] dark:bg-[#2d3136] dark:text-[#f2f2f2]">
                                {fullName.slice(0, 1).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="absolute -bottom-1 -right-1">
                              <UserPresenceIndicator
                                workspaceId={workspaceId}
                                userId={member.id}
                                isAway={member.isAway}
                                size="sm"
                              />
                            </div>
                          </div>
                          <div className="min-w-0">
                            <Typography
                              text={fullName}
                              className="truncate text-[14px] font-semibold text-[#1d1c1d] dark:text-[#f2f2f2]"
                            />
                          </div>
                        </div>
                        <Popover>
                          <PopoverTrigger asChild>
                            <div aria-label={`More actions for ${fullName}`}>
                              <MoreHorizontal className="h-4 w-4 text-[#616061] dark:text-[#b4b8be]" />
                            </div>
                          </PopoverTrigger>

                          <PopoverContent align="end" withOverlay>
                            <div className="flex flex-col gap-2 py-2">
                              {member.membershipStatus === "active" ? (
                                <>
                                  <Button
                                    variant='submenu'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedMember(member);
                                      setRoleDialogOpen(true);
                                    }}
                                  >
                                    {t("membersSection.changeAccountType")}
                                  </Button>
                                  <Separator />
                                  <div
                                    className={cn(
                                      MENU_ITEM_STYLE,
                                      " text-red-500 hover:bg-red-700 hover:text-white",
                                    )}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedMember(member);
                                      setDeactivateDialogOpen(true);
                                    }}
                                  >
                                    {t("membersSection.deactivateAccount")}
                                  </div>
                                </>
                              ) : (
                                <>
                                  <Button
                                    variant='submenu'
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedMember(member);
                                      setActivateDialogOpen(true);
                                    }}
                                  >
                                    {t("membersSection.reactivateAccount")}
                                  </Button>
                                  <Separator />
                                  <div
                                    className={cn(
                                      MENU_ITEM_STYLE,
                                      " text-red-500 hover:bg-red-700 hover:text-white",
                                    )}
                                    onClick={(event) => {
                                      event.stopPropagation();
                                      setSelectedMember(member);
                                      setDeleteDialogOpen(true);
                                    }}
                                  >
                                    {t("membersSection.deleteDeactivatedAccount")}
                                  </div>
                                </>
                              )}
                            </div>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {member.displayName?.trim() || "-"}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {member.email}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {member.id}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {accountType}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {formatJoinedAt(member.joinedAt)}
                    </TableCell>

                    <TableCell className="px-4 py-3 text-[13px] text-[#1d1c1d] dark:text-[#f2f2f2] md:px-6">
                      {member.membershipStatus === "deactivated"
                        ? t("membersSection.deactivated")
                        : t("membersSection.active")}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex flex-col gap-3 rounded-[4px] px-4 py-4 md:flex-row md:items-center md:justify-between md:px-5">
        <div className="text-[13px] text-[#616061]">
          {t("membersSection.pageOf", { current: currentPage, total: totalPages, pageSize: currentPageSize })}
        </div>

        <Pagination className="mx-0 w-auto justify-end">
          <PaginationContent className="flex-nowrap gap-1">
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (currentPage > 1) setPage(currentPage - 1);
                }}
                className={cn(
                  "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                  currentPage <= 1 && "pointer-events-none opacity-50",
                )}
              />
            </PaginationItem>

            {paginationPages.map((item, index) => {
              if (item === "...") {
                return (
                  <PaginationItem
                    key={`ellipsis-${index}`}
                    className="shrink-0"
                  >
                    <PaginationEllipsis />
                  </PaginationItem>
                );
              }

              return (
                <PaginationItem key={item} className="shrink-0">
                  <PaginationLink
                    href="#"
                    isActive={item === currentPage}
                    className={cn(
                      "h-8 min-w-8 rounded-md px-2 text-[13px]  hover:bg-selection-hover hover:text-white",
                      item === currentPage && ACTIVE_ITEM_STYLE
                    )}
                    onClick={(event) => {
                      event.preventDefault();
                      setPage(item);
                    }}
                  >
                    {item}
                  </PaginationLink>
                </PaginationItem>
              );
            })}

            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={(event) => {
                  event.preventDefault();
                  if (currentPage < totalPages) setPage(currentPage + 1);
                }}
                className={cn(
                  "h-8 rounded-md px-2 text-[13px]  hover:bg-selection-hover hover:text-white",
                  currentPage >= totalPages && "pointer-events-none opacity-50",
                )}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>

      {selectedMember && workspace ? (
        <ChangeAccountTypeDialog
          key={selectedMember.id}
          open={roleDialogOpen}
          onOpenChange={(open) => {
            setRoleDialogOpen(open);
            if (!open) {
              setSelectedMember(null);
            }
          }}
          member={selectedMember}
          workspace={workspace}
          saving={savingRole}
          onSave={async (role) => {
            setSavingRole(true);
            try {
              const updated = await updateWorkspaceMemberRoleApi(
                workspaceId,
                selectedMember.id,
                role,
              );
              await queryClient.invalidateQueries({
                queryKey: ["workspaces", workspaceId, "members-page"],
              });
              await queryClient.invalidateQueries({
                queryKey: ["workspaces", workspaceId, "members"],
              });
              await queryClient.invalidateQueries({
                queryKey: workspaceKeys.detail(workspaceId),
              });
              await queryClient.invalidateQueries({
                queryKey: authKeys.workspaceProfile(workspaceId),
              });
              queryClient.setQueryData<MembersPage | undefined>(
                workspaceKeys.membersPage(workspaceId, {
                  page,
                  pageSize: PAGE_SIZE,
                  sortKey,
                  sortDirection,
                  search: normalizedSearch,
                }),
                (current) =>
                  current
                    ? {
                        ...current,
                        items: current.items.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      }
                    : current,
              );
              setRoleDialogOpen(false);
              setSelectedMember(null);
            } finally {
              setSavingRole(false);
            }
          }}
        />
      ) : null}

      {selectedMember && workspace ? (
        <DeactivateUserDialog
          open={deactivateDialogOpen}
          onOpenChange={(open) => {
            setDeactivateDialogOpen(open);
            if (!open) setSelectedMember(null);
          }}
          member={selectedMember}
          saving={savingDeactivate}
          onDeactivate={async () => {
            setSavingDeactivate(true);
            try {
              const updated = await deactivateWorkspaceMemberApi(
                workspaceId,
                selectedMember.id,
              );
              queryClient.setQueryData<MembersPage | undefined>(
                workspaceKeys.membersPage(workspaceId, {
                  page,
                  pageSize: PAGE_SIZE,
                  sortKey,
                  sortDirection,
                  search: normalizedSearch,
                }),
                (current) =>
                  current
                    ? {
                        ...current,
                        items: current.items.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      }
                    : current,
              );
              await invalidateMemberDependentCaches();
              setDeactivateDialogOpen(false);
              setSelectedMember(null);
            } finally {
              setSavingDeactivate(false);
            }
          }}
        />
      ) : null}

      {selectedMember && workspace ? (
        <ActivateUserDialog
          open={activateDialogOpen}
          onOpenChange={(open) => {
            setActivateDialogOpen(open);
            if (!open) setSelectedMember(null);
          }}
          member={selectedMember}
          saving={savingActivate}
          onActivate={async () => {
            setSavingActivate(true);
            try {
              const updated = await activateWorkspaceMemberApi(
                workspaceId,
                selectedMember.id,
              );
              queryClient.setQueryData<MembersPage | undefined>(
                workspaceKeys.membersPage(workspaceId, {
                  page,
                  pageSize: PAGE_SIZE,
                  sortKey,
                  sortDirection,
                  search: normalizedSearch,
                }),
                (current) =>
                  current
                    ? {
                        ...current,
                        items: current.items.map((item) =>
                          item.id === updated.id ? updated : item,
                        ),
                      }
                    : current,
              );
              await invalidateMemberDependentCaches();
              setActivateDialogOpen(false);
              setSelectedMember(null);
            } finally {
              setSavingActivate(false);
            }
          }}
        />
      ) : null}

      {selectedMember && workspace ? (
        <DeleteDeactivatedUserDialog
          open={deleteDialogOpen}
          onOpenChange={(open) => {
            setDeleteDialogOpen(open);
            if (!open) setSelectedMember(null);
          }}
          member={selectedMember}
          saving={savingDelete}
          onDelete={async () => {
            setSavingDelete(true);
            try {
              const removed = await removeDeactivatedWorkspaceMemberApi(
                workspaceId,
                selectedMember.id,
              );
              queryClient.setQueryData<MembersPage | undefined>(
                workspaceKeys.membersPage(workspaceId, {
                  page,
                  pageSize: PAGE_SIZE,
                  sortKey,
                  sortDirection,
                  search: normalizedSearch,
                }),
                (current) =>
                  current
                    ? {
                        ...current,
                        total: Math.max(0, current.total - 1),
                        items: current.items.filter(
                          (item) => item.id !== removed.id,
                        ),
                      }
                    : current,
              );
              await invalidateMemberDependentCaches();
              await queryClient.invalidateQueries({
                queryKey: ["workspaces"],
              });
              setDeleteDialogOpen(false);
              setSelectedMember(null);
            } finally {
              setSavingDelete(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
