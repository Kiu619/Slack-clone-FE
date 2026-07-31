"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type EmojiClickData, Theme } from "emoji-picker-react";
import { ChevronDown, ChevronUp, Search, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";

import { useWorkspace } from "@/hooks/use-workspace";
import { useWorkspaceCustomEmojis } from "@/hooks/use-workspace-custom-emojis";
import { useFileUpload } from "@/hooks/use-file-upload";
import { hasWorkspacePermission, type WorkspaceRoleKey } from "@/lib/workspace-permissions";
import { workspaceKeys } from "@/lib/query-keys";
import {
  buildCustomEmojiLookup,
  extractCustomEmojiName,
  formatCustomEmojiShortcode,
} from "@/lib/custom-emojis";
import type { User, WorkspaceCustomEmoji } from "@/lib/types";
import {
  createWorkspaceCustomEmojiAliasApi,
  createWorkspaceCustomEmojiApi,
  deleteWorkspaceCustomEmojiApi,
  fetchWorkspaceCustomEmojisPageApi,
  updateWorkspaceEmojiOneClickApi,
} from "@/apis";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { mergeUserForDisplay, useWorkspaceMemberOverlay } from "@/stores/useWorkspaceMemberStore";
import { AddCustomEmojiDialog } from "@/components/dialogs/add-custom-emoji-dialog";
import { AddEmojiAliasDialog } from "@/components/dialogs/add-emoji-alias-dialog";
import { DeleteEmojiDialog } from "@/components/dialogs/delete-emoji-dialog";
import type { WorkspaceCustomEmojisPage } from "@/lib/types";

const EmojiPicker = dynamic(() => import("emoji-picker-react"), { ssr: false });

type EmojiShortcode = string | null;
type SortKey = "name" | "createdAt" | "createdBy";
type SortDirection = "asc" | "desc";
type PaginationValue = number | "...";

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
  const Icon = active && activeSortDirection === "desc" ? ChevronDown : ChevronUp;

  return (
    <button
      type="button"
      onClick={() => onSort(sortField)}
      className={cn(
        "inline-flex items-center gap-1 text-left font-semibold hover:text-[#1264a3]",
        active ? "text-selection-hover!" : "text-[#616061]",
      )}
    >
      <span>{label}</span>
      <Icon className={cn("h-3.5 w-3.5", active ? "text-[#1264a3]" : "text-[#8e8d93]")} />
    </button>
  );
}

function useEmojiCatalog(workspaceId: string) {
  return useWorkspace(workspaceId);
}

function EmojiGlyph({
  value,
  emoji,
  className,
}: {
  value: string | null;
  emoji?: WorkspaceCustomEmoji | null;
  className?: string;
}) {
  if (emoji) {
    return <img src={emoji.imageUrl} alt={`:${emoji.name}:`} className={cn("h-full w-full object-contain", className)} />;
  }
  if (!value) {
    return <span className={cn("text-[15px] leading-none text-[#797c81]", className)}>?</span>;
  }
  return <span className={cn("text-[18px] leading-none", className)}>{value}</span>;
}

function formatEmojiDate(value: string) {
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

function EmojiCreatorCell({
  workspaceId,
  emoji,
}: {
  workspaceId: string;
  emoji: WorkspaceCustomEmoji;
}) {
  const overlay = useWorkspaceMemberOverlay(workspaceId, emoji.createdById ?? undefined);
  const baseUser = (emoji.createdBy ?? { id: emoji.createdById ?? "" }) as User;
  const creator = mergeUserForDisplay(baseUser, overlay);
  const displayName =
    creator.displayName?.trim() ||
    creator.name?.trim() ||
    emoji.createdBy?.displayName?.trim() ||
    emoji.createdBy?.name?.trim() ||
    emoji.createdById ||
    "Unknown";

  return (
    <div className="flex items-center gap-2">
      <Avatar className="h-6 w-6 rounded-sm">
        <AvatarImage src={creator.avatar ?? emoji.createdBy?.avatar ?? ""} alt={displayName} />
        <AvatarFallback className="rounded-sm bg-[#f7d71e] text-[10px] font-semibold text-[#1d1c1d]">
          {displayName.slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <span className="font-medium">{displayName}</span>
    </div>
  );
}

export function CustomizeEmojiSection({ workspaceId }: { workspaceId: string }) {
  const { data: workspace } = useEmojiCatalog(workspaceId);
  const { data: customEmojis = [] } = useWorkspaceCustomEmojis(workspaceId, {
    includeAliases: true,
  });
  const queryClient = useQueryClient();
  const { uploadFileBinary } = useFileUpload();
  const { theme } = useTheme();

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [customEmojiDialogOpen, setCustomEmojiDialogOpen] = useState(false);
  const [aliasDialogOpen, setAliasDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean;
    title: string;
    description: string;
    items: Array<WorkspaceCustomEmoji & { label: string; kind: "original" | "alias" }>;
    defaultSelectedId: string | null;
  }>({ open: false, title: "", description: "", items: [], defaultSelectedId: null });
  const [activeSlotIndex, setActiveSlotIndex] = useState<number | null>(null);

  const emojiOneClickSlots = workspace?.emojiOneClickSlots ?? ([null, null, null] as const);

  const customEmojiLookup = useMemo(() => buildCustomEmojiLookup(customEmojis), [customEmojis]);
  const baseCustomEmojis = useMemo(() => customEmojis.filter((emoji) => !emoji.aliasOfId && !emoji.sourceDefaultEmoji), [customEmojis]);

  const canManageEmoji = hasWorkspacePermission(
    workspace,
    (workspace?.role as WorkspaceRoleKey | null) ?? null,
    "add_and_edit_custom_emoji",
  );
  const canDeleteEmoji = hasWorkspacePermission(
    workspace,
    (workspace?.role as WorkspaceRoleKey | null) ?? null,
    "delete_custom_emoji",
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSort = (key: SortKey) => {
    setPage(1);
    if (sortKey === key) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(key);
    setSortDirection("asc");
  };

  const emojiPageQuery = useQuery<WorkspaceCustomEmojisPage>({
    queryKey: workspaceKeys.customEmojisPage(workspaceId, {
      page,
      pageSize,
      sortKey,
      sortDirection,
      search: search.trim(),
    }),
    queryFn: () =>
      fetchWorkspaceCustomEmojisPageApi(workspaceId, {
        page,
        pageSize,
        sortBy: sortKey,
        sortDirection,
        q: search.trim() || undefined,
      }),
    enabled: !!workspaceId,
    staleTime: 30_000,
    placeholderData: (previousData) => previousData,
  });

  const sortedEmojis = emojiPageQuery.data?.items ?? [];
  const total = emojiPageQuery.data?.total ?? 0;
  const totalPages = emojiPageQuery.data?.totalPages ?? 1;
  const currentPage = emojiPageQuery.data?.page ?? page;
  const currentPageSize = emojiPageQuery.data?.pageSize ?? pageSize;
  const paginationPages = useMemo(
    () => getPaginationRange(currentPage, totalPages),
    [currentPage, totalPages],
  );

  const invalidateWorkspace = async () => {
    await queryClient.invalidateQueries({
      queryKey: ['workspaces', workspaceId, 'custom-emojis-page'],
    });
    await queryClient.invalidateQueries({
      queryKey: workspaceKeys.detail(workspaceId),
    });
  };

  const createEmojiMutation = useMutation({
    mutationFn: async (payload: { name: string; imageUrl: string }) =>
      createWorkspaceCustomEmojiApi(workspaceId, payload),
    onSuccess: () => {
      void invalidateWorkspace();
      setCustomEmojiDialogOpen(false);
    },
  });

  const createAliasMutation = useMutation({
    mutationFn: async (payload: { sourceEmojiId?: string; sourceDefaultEmoji?: string; alias: string }) =>
      createWorkspaceCustomEmojiAliasApi(workspaceId, payload),
    onSuccess: () => {
      void invalidateWorkspace();
      setAliasDialogOpen(false);
    },
  });

  const updateSlotsMutation = useMutation({
    mutationFn: async (slots: [EmojiShortcode, EmojiShortcode, EmojiShortcode]) =>
      updateWorkspaceEmojiOneClickApi(workspaceId, { slots }),
    onSuccess: () => {
      void invalidateWorkspace();
      setActiveSlotIndex(null);
    },
  });

  const deleteEmojiMutation = useMutation({
    mutationFn: async (emojiId: string) => deleteWorkspaceCustomEmojiApi(workspaceId, emojiId),
    onSuccess: () => {
      void invalidateWorkspace();
    },
  });

  const handleSlotPick = async (slotIndex: number, emojiData: EmojiClickData) => {
    const nextSlots: [EmojiShortcode, EmojiShortcode, EmojiShortcode] = [
      emojiOneClickSlots[0] ?? null,
      emojiOneClickSlots[1] ?? null,
      emojiOneClickSlots[2] ?? null,
    ];
    nextSlots[slotIndex] = emojiData.isCustom
      ? formatCustomEmojiShortcode(emojiData.names[0] ?? emojiData.emoji)
      : emojiData.emoji;
    updateSlotsMutation.mutate(nextSlots);
  };

  const openDeleteDialog = (emoji: WorkspaceCustomEmoji) => {
    if (emoji.sourceDefaultEmoji) {
      const aliases = customEmojis.filter((item) => item.sourceDefaultEmoji === emoji.sourceDefaultEmoji);
      setDeleteDialog({
        open: true,
        title: "Choose which alias to delete",
        description: `${emoji.sourceDefaultEmoji} has multiple aliases. Deleting an alias will not delete the original emoji, so choose which alias to remove.`,
        items: aliases.map((alias) => ({
          ...alias,
          label: "Alias",
          kind: "alias" as const,
        })),
        defaultSelectedId: emoji.id,
      });
      return;
    }

    const rootId = emoji.aliasOfId ?? emoji.id;
    const rootEmoji = customEmojis.find((item) => item.id === rootId) ?? emoji;
    const aliasItems = customEmojis.filter((item) => item.aliasOfId === rootId);
    setDeleteDialog({
      open: true,
      title: "Choose which emoji to delete",
      description: `:${rootEmoji.name}: has aliases. Deleting the original emoji will also delete its aliases. Choose whether to delete the original emoji or just an alias.`,
      items: [
        {
          ...rootEmoji,
          label: "Original emoji",
          kind: "original",
        },
        ...aliasItems.map((alias) => ({
          ...alias,
          label: "Alias",
          kind: "alias" as const,
        })),
      ],
      defaultSelectedId: rootEmoji.id,
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2">
        <Typography as="h1" variant="h3" className="text-[30px] font-bold tracking-[-0.03em] text-[#1d1c1d] dark:text-[#f2f2f2]">
          Customize Your Workspace
        </Typography>
        <Typography
          className="max-w-3xl text-[16px] leading-7 text-[#1d1c1d] dark:text-[#d1d2d3]"
          text="Use these settings to make Slack your own. You can manage custom emoji and configure one-click reactions here."
        />
      </div>

      <div className="rounded-xl border border-[#d9d7da] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] dark:border-[#2c2e33] dark:bg-[#1A1D21]">
        <div className="border-b border-[#ece8ec] px-5 py-4 dark:border-[#2c2e33] md:px-6">
          <div className="flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <Typography as="h2" variant="h4" className="text-[24px] font-bold tracking-[-0.03em] text-[#1d1c1d] dark:text-[#f2f2f2]">
                  One-click reactions
                </Typography>
                <Typography
                  className="text-[15px] text-[#1d1c1d] dark:text-[#d1d2d3]"
                  text="Choose the default emoji people will see when they enable one-click reactions"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {emojiOneClickSlots.map((slot, index) => {
                const emoji = slot ? customEmojiLookup.get(extractCustomEmojiName(slot) ?? "") ?? null : null;
                return (
                  <Popover
                    key={`slot-${index}`}
                    open={activeSlotIndex === index}
                    onOpenChange={(open) => setActiveSlotIndex(open ? index : null)}
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            disabled={!canManageEmoji}
                            className={cn(
                              "flex h-10 min-w-10 items-center justify-center rounded-md border border-[#d9d7da] bg-white px-2 shadow-[0_1px_2px_rgba(0,0,0,0.08)] transition-transform hover:-translate-y-0.5 dark:border-[#2c2e33] dark:bg-[#1A1D21]",
                              !canManageEmoji && "cursor-not-allowed opacity-70",
                            )}
                          >
                            <EmojiGlyph value={slot ?? null} emoji={emoji} className="h-6 w-6" />
                          </button>
                        </PopoverTrigger>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <p className="text-xs">{canManageEmoji ? `Customize slot ${index + 1}` : `Slot ${index + 1}`}</p>
                      </TooltipContent>
                    </Tooltip>
                    {canManageEmoji && (
                      <PopoverContent
                        side="bottom"
                        align="start"
                        sideOffset={8}
                        className="w-auto border-none bg-transparent p-0"
                        withOverlay
                        onOpenAutoFocus={(event) => event.preventDefault()}
                      >
                        <EmojiPicker
                          onEmojiClick={(emojiData: EmojiClickData) => void handleSlotPick(index, emojiData)}
                          theme={theme === "dark" ? Theme.DARK : Theme.LIGHT}
                          width={340}
                          height={420}
                          searchPlaceHolder="Search emoji..."
                          previewConfig={{ showPreview: false }}
                          customEmojis={baseCustomEmojis.map((emoji) => ({
                            id: emoji.name,
                            names: [emoji.name],
                            imgUrl: emoji.imageUrl,
                          }))}
                        />
                      </PopoverContent>
                    )}
                  </Popover>
                );
              })}
            </div>
          </div>
        </div>

        <div className="px-5 py-5 md:px-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <Typography as="h2" variant="h4" className="text-[24px] font-bold tracking-[-0.03em] text-[#1d1c1d] dark:text-[#f2f2f2]">
              {total} custom emoji
            </Typography>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" disabled={!canManageEmoji} onClick={() => setAliasDialogOpen(true)}>
                Add Alias
              </Button>
              <Button type="button" variant="success" disabled={!canManageEmoji} onClick={() => setCustomEmojiDialogOpen(true)}>
                Add Custom Emoji
              </Button>
            </div>
          </div>

          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#797c81]" />
              <Input value={search} onChange={(event) => handleSearchChange(event.target.value)} placeholder="Search" className="h-10 rounded-lg pl-9" />
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-lg border border-[#ece8ec] dark:border-[#2c2e33]">
            <Table className="min-w-[980px] border-separate border-spacing-0">
              <TableHeader>
                <TableRow className="sticky top-0 z-20 border-b border-[#ece8ec] bg-[#fafafa] text-[12px] font-medium text-[#616061] dark:border-[#2c2e33] dark:bg-[#141619] dark:text-[#ababad] hover:bg-[#fafafa] dark:hover:bg-[#141619]">
                  <TableHead className="px-4 py-3">Image</TableHead>
                  <TableHead className="px-4 py-3">
                    <SortButton
                      label="Name"
                      sortField="name"
                      activeSortKey={sortKey}
                      activeSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    <SortButton
                      label="Date added"
                      sortField="createdAt"
                      activeSortKey={sortKey}
                      activeSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="px-4 py-3">
                    <SortButton
                      label="Added by"
                      sortField="createdBy"
                      activeSortKey={sortKey}
                      activeSortDirection={sortDirection}
                      onSort={handleSort}
                    />
                  </TableHead>
                  <TableHead className="w-12 px-4 py-3" />
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-[#ece8ec] dark:divide-[#2c2e33]">
                {emojiPageQuery.isPending ? (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-8 text-center text-[14px] text-[#616061] dark:text-[#ababad]">
                      Loading custom emoji...
                    </TableCell>
                  </TableRow>
                ) : sortedEmojis.length > 0 ? (
                  sortedEmojis.map((emoji, index) => {
                    const isBand = index % 2 === 0;
                    return (
                      <TableRow
                        key={emoji.id}
                        className={cn(
                          "border-[#ece8ec] text-[14px] text-[#1d1c1d] dark:border-[#2c2e33] dark:text-[#f2f2f2]",
                          isBand ? "bg-white dark:bg-[#1A1D21]" : "bg-[#fafafa] dark:bg-[#1D2125]",
                        )}
                      >
                        <TableCell className="px-4 py-3">
                          <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-md border border-[#ece8ec] bg-[#fafafa] dark:border-[#2c2e33] dark:bg-[#141619]">
                            <img src={emoji.imageUrl} alt={`:${emoji.name}:`} className="h-full w-full object-contain" />
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-semibold">{formatCustomEmojiShortcode(emoji.name)}</span>
                            {emoji.aliasOfId || emoji.sourceDefaultEmoji ? (
                              <span className="text-[12px] text-[#616061] dark:text-[#ababad]">Alias</span>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell className="px-4 py-3 text-[#616061] dark:text-[#ababad]">
                          {formatEmojiDate(emoji.createdAt)}
                        </TableCell>
                        <TableCell className="px-4 py-3">
                          <EmojiCreatorCell workspaceId={workspaceId} emoji={emoji} />
                        </TableCell>
                        <TableCell className="px-4 py-3 text-right">
                          {canDeleteEmoji ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => {
                                    openDeleteDialog(emoji);
                                  }}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[#616061] transition-colors hover:bg-[#f2f0f1] hover:text-red-600 dark:text-[#ababad] dark:hover:bg-[#222529]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                <p className="text-xs">Delete emoji</p>
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="px-4 py-10 text-center text-[14px] text-[#616061] dark:text-[#ababad]">
                      No custom emoji found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
            <div className="text-[13px] text-[#616061] dark:text-[#ababad]">
              Page {currentPage} of {totalPages} · {currentPageSize} per page
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
                      <PaginationItem key={`emoji-page-ellipsis-${index}`} className="shrink-0">
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
                          "h-8 min-w-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                          item === currentPage ? "bg-selection-hover text-white" : "",
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
                      "h-8 rounded-md px-2 text-[13px] hover:bg-selection-hover hover:text-white",
                      currentPage >= totalPages && "pointer-events-none opacity-50",
                    )}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          </div>
        </div>
      </div>

      <AddCustomEmojiDialog
        open={customEmojiDialogOpen}
        onOpenChange={setCustomEmojiDialogOpen}
        canManageEmoji={canManageEmoji}
        existingNames={new Set(customEmojis.map((emoji) => emoji.name))}
        uploadFileBinary={uploadFileBinary}
        onSubmit={async (payload) => {
          await createEmojiMutation.mutateAsync(payload);
        }}
      />

      <AddEmojiAliasDialog
        open={aliasDialogOpen}
        onOpenChange={setAliasDialogOpen}
        canManageEmoji={canManageEmoji}
        emojis={baseCustomEmojis}
        existingNames={new Set(customEmojis.map((emoji) => emoji.name))}
        onSubmit={async (payload) => {
          await createAliasMutation.mutateAsync(payload);
        }}
      />

      <DeleteEmojiDialog
        open={deleteDialog.open}
        onOpenChange={(open) => setDeleteDialog((current) => ({ ...current, open }))}
        title={deleteDialog.title}
        description={deleteDialog.description}
        items={deleteDialog.items}
        defaultSelectedId={deleteDialog.defaultSelectedId}
        onDelete={async (aliasId) => {
          await deleteEmojiMutation.mutateAsync(aliasId);
        }}
      />
    </div>
  );
}
