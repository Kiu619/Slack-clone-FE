"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchWorkspaceMembersApi } from "@/apis";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useChannels } from "@/hooks/use-channel";
import { useConversations } from "@/hooks/use-conversations";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useWorkspace } from "@/hooks/use-workspace";
import { workspaceKeys } from "@/lib/query-keys";
import type {
  Channel,
  DirectMessageConversation,
  User,
  WorkspaceMember,
} from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import { FiHash, FiLock, FiSearch, FiX } from "react-icons/fi";
import { IoFilter } from "react-icons/io5";
import { MdOutlineChatBubbleOutline } from "react-icons/md";
import {
  countActiveMessagesFilters,
  createDefaultMessagesSearchFilters,
  type MessagesSearchFilters,
  type MessagesSearchSort,
} from "./messages-search-state";
import { SearchFiltersDialog } from "./search-filters-dialog";

type SearchKind = "messages" | "dms" | "files" | "people" | "channels";

const SORT_LABELS: Record<MessagesSearchSort, string> = {
  most_relevant: "Most relevant",
  newest: "Newest",
  oldest: "Oldest",
};

const convLabel = (c: DirectMessageConversation) => {
  const names = c.members.map((u) => u.displayName || u.name || u.email).join(", ");
  return names || "Direct message";
};

export const WorkspaceMessagesSearch = ({
  workspaceId,
}: {
  workspaceId: string;
}) => {
  const { data: workspace } = useWorkspace(workspaceId);
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useConversations(workspaceId);
  const { data: members = [] } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  const [searchKind, setSearchKind] = useState<SearchKind>("messages");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<MessagesSearchFilters>(() =>
    createDefaultMessagesSearchFilters(),
  );
  const [sort, setSort] = useState<MessagesSearchSort>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [fromOpen, setFromOpen] = useState(false);
  const [inOpen, setInOpen] = useState(false);
  const [fromQ, setFromQ] = useState("");
  const [inQ, setInQ] = useState("");
  const debouncedFromQ = useDebouncedValue(fromQ, 200);
  const debouncedInQ = useDebouncedValue(inQ, 200);

  const activeCount = countActiveMessagesFilters(filters, sort);

  const fromLabel = (() => {
    if (!filters.fromUserId) return null;
    const m = members.find((x) => x.id === filters.fromUserId);
    if (!m) return filters.fromUserId;
    const d = displayMember(m);
    return d.displayName || d.name || d.email || m.id;
  })();

  const inChannelLabel = (() => {
    if (!filters.inChannelId) return null;
    const ch = channels.find((c) => c.id === filters.inChannelId);
    return ch ? `#${ch.name}` : null;
  })();

  const inDmLabel = (() => {
    if (!filters.inConversationId) return null;
    const c = conversations.find((x) => x.id === filters.inConversationId);
    return c ? convLabel(c) : null;
  })();

  const filteredMembers = (() => {
    const q = debouncedFromQ.trim().toLowerCase();
    return members.filter((m) => {
      const d = displayMember(m);
      const hay = `${d.displayName ?? ""} ${d.name ?? ""} ${d.email ?? ""}`.toLowerCase();
      return !q || hay.includes(q);
    });
  })();

  const filteredInTargets = (() => {
    const q = debouncedInQ.trim().toLowerCase();
    const chs = channels.filter((c) => {
      if (!q) return true;
      return c.name.toLowerCase().includes(q);
    });
    const dms = conversations.filter((c) => {
      if (!q) return true;
      return convLabel(c).toLowerCase().includes(q);
    });
    return { channels: chs, conversations: dms };
  })();

  const pickFrom = (userId: string | null) => {
    setFilters((f) => ({ ...f, fromUserId: userId }));
    setFromOpen(false);
    setFromQ("");
  };

  const pickChannel = (id: string | null) => {
    setFilters((f) => ({ ...f, inChannelId: id }));
    setInOpen(false);
    setInQ("");
  };

  const pickDm = (id: string | null) => {
    setFilters((f) => ({ ...f, inConversationId: id }));
    setInOpen(false);
    setInQ("");
  };

  const showInButton = !(inChannelLabel && inDmLabel);

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#1A1D21] text-neutral-200">
      <header className="flex shrink-0 items-center justify-between border-b border-[#797c814d] px-6 py-3">
        <h1 className="text-lg font-semibold text-white">Search</h1>
        <button
          type="button"
          className="text-sm text-sky-400 hover:underline"
          onClick={() => {
            window.open(
              "https://slack.com/help/articles/202528808-search-in-slack",
              "_blank",
              "noopener,noreferrer",
            );
          }}
        >
          Give feedback
        </button>
      </header>

      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[#797c814d] px-4 py-2.5 md:px-6">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 border-[#797c814d] bg-[#25272B] px-2.5 text-neutral-200 hover:bg-white/10"
            >
              <MdOutlineChatBubbleOutline className="size-4 shrink-0" />
              <span className="max-w-[120px] truncate capitalize">
                {searchKind === "messages" ? "Messages" : searchKind}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-52 border-[#797c814d] bg-[#25272B] text-neutral-200"
          >
            <DropdownMenuItem
              className="focus:bg-white/10"
              onClick={() => setSearchKind("messages")}
            >
              Messages
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#797c814d]" />
            {(
              [
                ["dms", "DMs"],
                ["files", "Files"],
                ["people", "People"],
                ["channels", "Channels"],
              ] as const
            ).map(([id, label]) => (
              <Tooltip key={id}>
                <TooltipTrigger asChild>
                  <div>
                    <DropdownMenuItem
                      disabled
                      className="cursor-not-allowed opacity-50 focus:bg-transparent"
                    >
                      {label}
                    </DropdownMenuItem>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="text-xs">
                  Coming soon
                </TooltipContent>
              </Tooltip>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {fromLabel ? (
          <div className="flex h-8 items-center gap-1 rounded-md border border-[#611f69] bg-[#611f69]/20 px-2 text-sm text-white">
            <span className="max-w-[140px] truncate">From {fromLabel}</span>
            <button
              type="button"
              aria-label="Clear from"
              className="rounded p-0.5 hover:bg-white/10"
              onClick={() => setFilters((f) => ({ ...f, fromUserId: null }))}
            >
              <FiX className="size-3.5" />
            </button>
          </div>
        ) : (
          <Popover open={fromOpen} onOpenChange={setFromOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-[#797c814d] bg-[#25272B] text-neutral-200 hover:bg-white/10"
              >
                From
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-72 border-[#797c814d] bg-[#25272B] p-2"
            >
              <Input
                value={fromQ}
                onChange={(e) => setFromQ(e.target.value)}
                placeholder="Search people…"
                className="mb-2 h-8 border-[#797c814d] bg-[#1A1D21] text-sm"
              />
              <div className="max-h-56 overflow-y-auto">
                {filteredMembers.slice(0, 40).map((m) => {
                  const d = displayMember(m);
                  const label = d.displayName || d.name || d.email || m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-white/10"
                      onClick={() => pickFrom(m.id)}
                    >
                      <Avatar className="size-6">
                        <AvatarImage src={d.avatar || ""} />
                        <AvatarFallback className="text-[10px]">
                          {(label || "U").slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>
        )}

        {inChannelLabel ? (
          <div className="flex h-8 items-center gap-1 rounded-md border border-[#611f69] bg-[#611f69]/20 px-2 text-sm text-white">
            <span className="max-w-[120px] truncate">In {inChannelLabel}</span>
            <button
              type="button"
              aria-label="Clear channel"
              className="rounded p-0.5 hover:bg-white/10"
              onClick={() => setFilters((f) => ({ ...f, inChannelId: null }))}
            >
              <FiX className="size-3.5" />
            </button>
          </div>
        ) : null}
        {inDmLabel ? (
          <div className="flex h-8 items-center gap-1 rounded-md border border-[#611f69] bg-[#611f69]/20 px-2 text-sm text-white">
            <span className="max-w-[160px] truncate">In {inDmLabel}</span>
            <button
              type="button"
              aria-label="Clear DM"
              className="rounded p-0.5 hover:bg-white/10"
              onClick={() => setFilters((f) => ({ ...f, inConversationId: null }))}
            >
              <FiX className="size-3.5" />
            </button>
          </div>
        ) : null}
        {showInButton ? (
          <Popover open={inOpen} onOpenChange={setInOpen}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 border-[#797c814d] bg-[#25272B] text-neutral-200 hover:bg-white/10"
              >
                In
              </Button>
            </PopoverTrigger>
            <PopoverContent
              align="start"
              side="bottom"
              className="w-80 border-[#797c814d] bg-[#25272B] p-2"
            >
              <Input
                value={inQ}
                onChange={(e) => setInQ(e.target.value)}
                placeholder="Search channels and DMs…"
                className="mb-2 h-8 border-[#797c814d] bg-[#1A1D21] text-sm"
              />
              <div className="max-h-64 space-y-2 overflow-y-auto">
                <p className="px-1 text-[11px] font-medium uppercase text-neutral-500">
                  Channels
                </p>
                {filteredInTargets.channels.slice(0, 25).map((ch: Channel) => (
                  <button
                    key={ch.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-white/10"
                    onClick={() => pickChannel(ch.id)}
                  >
                    {ch.isPrivate ? (
                      <FiLock className="size-3.5 shrink-0 text-neutral-400" />
                    ) : (
                      <FiHash className="size-3.5 shrink-0 text-neutral-400" />
                    )}
                    <span className="truncate">{ch.name}</span>
                  </button>
                ))}
                <p className="px-1 pt-2 text-[11px] font-medium uppercase text-neutral-500">
                  Direct messages
                </p>
                {filteredInTargets.conversations.slice(0, 25).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded px-2 py-1 text-left text-sm hover:bg-white/10"
                    onClick={() => pickDm(c.id)}
                  >
                    <span className="truncate">{convLabel(c)}</span>
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          className={cn(
            "h-8 gap-1.5 border-[#797c814d] bg-[#25272B] text-neutral-200 hover:bg-white/10",
          )}
          onClick={() => setFiltersOpen(true)}
        >
          <IoFilter className="size-4" />
          Filters
          {activeCount > 0 ? (
            <span className="rounded bg-[#611f69] px-1.5 py-0 text-[11px] text-white">
              {activeCount}
            </span>
          ) : null}
        </Button>

        <div className="ml-auto flex items-center gap-2">
          <span className="hidden text-xs text-neutral-500 sm:inline">Sort</span>
          <Select
            value={sort}
            onValueChange={(v) => setSort(v as MessagesSearchSort)}
          >
            <SelectTrigger
              size="sm"
              className="h-8 w-[150px] border-[#797c814d] bg-[#25272B] text-neutral-200"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-[#797c814d] bg-[#25272B]">
              <SelectItem
                value="most_relevant"
                disabled
                className="text-neutral-400"
              >
                {SORT_LABELS.most_relevant}
              </SelectItem>
              <SelectItem value="newest" className="text-neutral-200">
                {SORT_LABELS.newest}
              </SelectItem>
              <SelectItem value="oldest" className="text-neutral-200">
                {SORT_LABELS.oldest}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="shrink-0 space-y-2 px-4 pt-4 md:px-6">
        <div className="relative">
          <FiSearch className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-500" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              workspace
                ? `Search ${workspace.name}`
                : "Search messages…"
            }
            className="h-10 border-[#797c814d] bg-[#25272B] pl-10 text-neutral-100 placeholder:text-neutral-500"
          />
        </div>
        <p className="text-sm text-neutral-400">0 results</p>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 pb-12 text-center text-sm text-neutral-500">
        <p>Message search is not connected yet.</p>
        <p className="max-w-md text-xs text-neutral-600">
          Filters and sorting are saved in this session only. Phase 2 will add
          workspace-wide search API and URL state.
        </p>
      </div>

      <SearchFiltersDialog
        open={filtersOpen}
        onOpenChange={setFiltersOpen}
        workspaceId={workspaceId}
        filters={filters}
        onFiltersChange={setFilters}
        onApply={() => {}}
      />
    </div>
  );
};
