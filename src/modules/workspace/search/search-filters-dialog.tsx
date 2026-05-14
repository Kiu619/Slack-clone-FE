"use client";

import { useQuery } from "@tanstack/react-query";
import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useChannels } from "@/hooks/use-channel";
import { messageKeys, workspaceKeys } from "@/lib/query-keys";
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
import { FiInfo } from "react-icons/fi";
import type { MessagesSearchFilters } from "./messages-search-state";
import { createDefaultMessagesSearchFilters } from "./messages-search-state";

const DATE_OPTIONS: { value: MessagesSearchFilters["datePreset"]; label: string }[] =
  [
    { value: "any", label: "Any time" },
    { value: "today", label: "Today" },
    { value: "7d", label: "Last 7 days" },
    { value: "30d", label: "Last 30 days" },
  ];

const FILE_TYPE_OPTIONS: {
  value: MessagesSearchFilters["fileType"];
  label: string;
}[] = [
  { value: "any", label: "Any type" },
  { value: "pdf", label: "PDFs" },
  { value: "image", label: "Images" },
  { value: "video", label: "Videos" },
  { value: "audio", label: "Audio" },
  { value: "code", label: "Snippets" },
];

type SearchFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  filters: MessagesSearchFilters;
  onFiltersChange: (next: MessagesSearchFilters) => void;
  onApply: () => void;
};

const defaultFilters = createDefaultMessagesSearchFilters();

export const SearchFiltersDialog = ({
  open,
  onOpenChange,
  workspaceId,
  filters,
  onFiltersChange,
  onApply,
}: SearchFiltersDialogProps) => {
  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useQuery({
    queryKey: messageKeys.conversations(workspaceId),
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId && open,
  });
  const { data: members = [] } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId && open,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  const patch = (partial: Partial<MessagesSearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const activeInDialog = (() => {
    let n = 0;
    const keys = Object.keys(defaultFilters) as (keyof MessagesSearchFilters)[];
    for (const k of keys) {
      if (filters[k] !== defaultFilters[k]) n += 1;
    }
    return n;
  })();

  const clearAll = () => {
    onFiltersChange(createDefaultMessagesSearchFilters());
  };

  const convLabel = (c: DirectMessageConversation) => {
    const names = c.members.map((u) => u.displayName || u.name || u.email).join(", ");
    return names || "Direct message";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-y-auto border-[#797c814d] bg-[#1A1D21] p-0 sm:max-w-lg"
        showCloseButton
      >
        <DialogHeader className="border-b border-[#797c814d] px-5 py-4 text-left">
          <DialogTitle className="text-lg font-semibold text-white">
            Filter by
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-5 px-5 py-4">
          <div className="space-y-2">
            <Label className="text-xs font-normal text-neutral-400">From</Label>
            <Select
              value={filters.fromUserId ?? "__none__"}
              onValueChange={(v) =>
                patch({ fromUserId: v === "__none__" ? null : v })
              }
            >
              <SelectTrigger className="h-10 w-full border-[#797c814d] bg-[#25272B] text-sm text-neutral-200">
                <SelectValue placeholder="ex. Zoe Maxwell" />
              </SelectTrigger>
              <SelectContent className="max-h-60 border-[#797c814d] bg-[#25272B]">
                <SelectItem value="__none__" className="text-neutral-200">
                  Anyone
                </SelectItem>
                {members.map((m) => {
                  const d = displayMember(m);
                  const label = d.displayName || d.name || d.email || m.id;
                  return (
                    <SelectItem key={m.id} value={m.id} className="text-neutral-200">
                      {label}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-normal text-neutral-400">In</Label>
            <div className="grid gap-2 sm:grid-cols-2">
              <Select
                value={filters.inChannelId ?? "__none__"}
                onValueChange={(v) =>
                  patch({
                    inChannelId: v === "__none__" ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-10 w-full border-[#797c814d] bg-[#25272B] text-sm text-neutral-200">
                  <SelectValue placeholder="Channel" />
                </SelectTrigger>
                <SelectContent className="max-h-52 border-[#797c814d] bg-[#25272B]">
                  <SelectItem value="__none__" className="text-neutral-200">
                    Any channel
                  </SelectItem>
                  {channels.map((ch: Channel) => (
                    <SelectItem key={ch.id} value={ch.id} className="text-neutral-200">
                      #{ch.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filters.inConversationId ?? "__none__"}
                onValueChange={(v) =>
                  patch({
                    inConversationId: v === "__none__" ? null : v,
                  })
                }
              >
                <SelectTrigger className="h-10 w-full border-[#797c814d] bg-[#25272B] text-sm text-neutral-200">
                  <SelectValue placeholder="Direct message" />
                </SelectTrigger>
                <SelectContent className="max-h-52 border-[#797c814d] bg-[#25272B]">
                  <SelectItem value="__none__" className="text-neutral-200">
                    Any DM
                  </SelectItem>
                  {conversations.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-neutral-200">
                      {convLabel(c)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-normal text-neutral-400">Date</Label>
            <Select
              value={filters.datePreset}
              onValueChange={(v) =>
                patch({ datePreset: v as MessagesSearchFilters["datePreset"] })
              }
            >
              <SelectTrigger className="h-10 w-full border-[#797c814d] bg-[#25272B] text-sm text-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#797c814d] bg-[#25272B]">
                {DATE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-neutral-200">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-normal text-neutral-400">File types</Label>
            <Select
              value={filters.fileType}
              onValueChange={(v) =>
                patch({ fileType: v as MessagesSearchFilters["fileType"] })
              }
            >
              <SelectTrigger className="h-10 w-full border-[#797c814d] bg-[#25272B] text-sm text-neutral-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-[#797c814d] bg-[#25272B]">
                {FILE_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-neutral-200">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-normal text-neutral-400">Reactions</Label>
            <Input
              value={filters.reactionsQuery}
              onChange={(e) => patch({ reactionsQuery: e.target.value })}
              placeholder="ex. :heart:"
              className="h-10 border-[#797c814d] bg-[#25272B] text-neutral-200 placeholder:text-neutral-500"
            />
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-300">Message has…</p>
            <div className="grid grid-cols-3 gap-3">
              {(
                [
                  ["hasFile", "File"],
                  ["hasLink", "Link"],
                  ["hasAction", "Action"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-2 text-sm text-neutral-200"
                >
                  <Checkbox
                    checked={filters[key]}
                    onCheckedChange={(v) => patch({ [key]: v === true })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-neutral-300">Message is…</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {(
                [
                  ["isDm", "A direct message"],
                  ["inThread", "In a thread"],
                  ["saved", "Saved"],
                  ["pinned", "Pinned"],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 text-sm text-neutral-200",
                    key === "pinned" && "sm:col-span-1",
                  )}
                >
                  <Checkbox
                    checked={filters[key]}
                    onCheckedChange={(v) => patch({ [key]: v === true })}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col gap-3 border-t border-[#797c814d] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <a
            href="https://slack.com/help/articles/202528808-search-in-slack"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
          >
            <FiInfo className="size-3.5 shrink-0" />
            Learn more about search
          </a>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              className="border-[#797c814d] bg-transparent text-neutral-200 hover:bg-white/10"
              onClick={clearAll}
              disabled={activeInDialog === 0}
            >
              Clear filters{activeInDialog > 0 ? ` (${activeInDialog})` : ""}
            </Button>
            <Button
              type="button"
              className="bg-[#611f69] text-white hover:bg-[#4a154b]"
              onClick={() => {
                onApply();
                onOpenChange(false);
              }}
            >
              Search
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
