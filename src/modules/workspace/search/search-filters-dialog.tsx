"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useAppTranslation } from "@/hooks/use-translation";
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
import { Search, X } from "lucide-react";
import { FiHash, FiInfo, FiLock } from "react-icons/fi";
import { useShallow } from "zustand/react/shallow";
import type { MessagesSearchFilters } from "./messages-search-state";
import { createDefaultMessagesSearchFilters } from "./messages-search-state";
import { MdOutlineLock } from "react-icons/md";

const DATE_OPTION_VALUES: MessagesSearchFilters["datePreset"][] = [
  "any",
  "today",
  "7d",
  "30d",
];

const FILE_TYPE_VALUES: MessagesSearchFilters["fileType"][] = [
  "any",
  "pdf",
  "image",
  "video",
  "audio",
  "code",
];

function getDateOptionLabel(value: MessagesSearchFilters["datePreset"], t: ReturnType<typeof useAppTranslation>): string {
  switch (value) {
    case "any": return t("anyTime")
    case "today": return t("today")
    case "7d": return t("last7Days")
    case "30d": return t("last30Days")
    default: return value
  }
}

function getFileTypeLabel(value: MessagesSearchFilters["fileType"], t: ReturnType<typeof useAppTranslation>): string {
  switch (value) {
    case "any": return t("anyType")
    case "pdf": return t("pdfs")
    case "image": return t("images")
    case "video": return t("videos")
    case "audio": return t("audio")
    case "code": return t("snippets")
    default: return value
  }
}

type SearchFiltersDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  filters: MessagesSearchFilters;
  onFiltersChange: (next: MessagesSearchFilters) => void;
  onApply: () => void;
};

const defaultFilters = createDefaultMessagesSearchFilters();

const getMemberOverlay = (
  overlayMap: Record<string, Partial<User>>,
  memberId: string,
) => overlayMap[memberId] as User | undefined;

const convLabel = (
  conversation: DirectMessageConversation,
  currentUserId?: string,
  memberOverlayMap?: Record<string, Partial<User>>,
  t?: ReturnType<typeof useAppTranslation>,
) => {
  if (conversation.isGroup) {
    const labels = conversation.members
      .filter((member) => member.id !== currentUserId)
      .map((member) => {
        const merged = mergeUserForDisplay(
          member as User,
          memberOverlayMap ? getMemberOverlay(memberOverlayMap, member.id) : undefined,
        );
        return merged.displayName || merged.name || merged.email;
      })
      .filter(Boolean);

    return labels.join(", ") || (t ? t("groupDM") : "Group DM");
  }

  const otherMember =
    conversation.members.find((member) => member.id !== currentUserId) ??
    conversation.members[0];
  if (!otherMember) return t ? t("directMessage") : "Direct message";

  const merged = mergeUserForDisplay(
    otherMember as User,
    memberOverlayMap
      ? getMemberOverlay(memberOverlayMap, otherMember.id)
      : undefined,
  );

  return merged.displayName || merged.name || merged.email || (t ? t("directMessage") : "Direct message");
};

const ResultEmpty = ({ text }: { text: string }) => (
  <div className="px-3 py-5 text-center text-sm text-neutral-500">{text}</div>
);

const TokenButton = ({
  children,
  onRemove,
}: {
  children: React.ReactNode;
  onRemove: () => void;
}) => (
  <div className="inline-flex max-w-full items-center gap-1 rounded-md bg-[#1264a3] px-2 py-1 text-sm font-medium text-white">
    <span className="truncate">{children}</span>
    <button
      type="button"
      onClick={onRemove}
      className="rounded-sm p-0.5 text-white/80 transition hover:bg-white/15 hover:text-white"
      aria-label="Remove selection"
    >
      <X className="size-3.5" />
    </button>
  </div>
);

export const SearchFiltersDialog = ({
  open,
  onOpenChange,
  workspaceId,
  filters,
  onFiltersChange,
  onApply,
}: SearchFiltersDialogProps) => {
  const t = useAppTranslation("search")

  const { user: currentUser } = useAuth();
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
    useShallow((state) => state.byWorkspace[workspaceId] ?? {}),
  );

  const fromRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const [fromQuery, setFromQuery] = useState("");
  const [inQuery, setInQuery] = useState("");
  const [showFromResults, setShowFromResults] = useState(false);
  const [showInResults, setShowInResults] = useState(false);

  const debouncedFromQuery = useDebouncedValue(fromQuery, 150);
  const debouncedInQuery = useDebouncedValue(inQuery, 150);

  useEffect(() => {
    if (!open) {
      setFromQuery("");
      setInQuery("");
      setShowFromResults(false);
      setShowInResults(false);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (fromRef.current && !fromRef.current.contains(target)) {
        setShowFromResults(false);
      }
      if (inRef.current && !inRef.current.contains(target)) {
        setShowInResults(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [open]);

  const displayMember = (member: WorkspaceMember) =>
    mergeUserForDisplay(member as User, getMemberOverlay(memberOverlayMap, member.id));

  const selectedMember = useMemo(
    () => members.find((member) => member.id === filters.fromUserId) ?? null,
    [filters.fromUserId, members],
  );

  const selectedChannel = useMemo(
    () => channels.find((channel) => channel.id === filters.inChannelId) ?? null,
    [channels, filters.inChannelId],
  );

  const selectedConversation = useMemo(
    () =>
      conversations.find(
        (conversation) => conversation.id === filters.inConversationId,
      ) ?? null,
    [conversations, filters.inConversationId],
  );

  const filteredMembers = useMemo(() => {
    const query = debouncedFromQuery.trim().toLowerCase();

    return members
      .filter((member) => member.id !== filters.fromUserId)
      .filter((member) => {
        if (!query) return true;
        const display = displayMember(member);
        const haystack =
          `${display.displayName ?? ""} ${display.name ?? ""} ${display.email ?? ""}`.toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [debouncedFromQuery, filters.fromUserId, members]);

  const filteredTargets = useMemo(() => {
    const query = debouncedInQuery.trim().toLowerCase();

    const filteredChannels = channels
      .filter((channel) => channel.id !== filters.inChannelId)
      .filter((channel) => {
        if (!query) return true;
        return channel.name.toLowerCase().includes(query);
      })
      .slice(0, 6);

    const filteredConversations = conversations
      .filter((conversation) => conversation.id !== filters.inConversationId)
      .filter((conversation) => {
        if (!query) return true;
        return convLabel(conversation, currentUser?.id, memberOverlayMap, t)
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 6);

    return {
      channels: filteredChannels,
      conversations: filteredConversations,
    };
  }, [
    channels,
    conversations,
    currentUser?.id,
    debouncedInQuery,
    filters.inChannelId,
    filters.inConversationId,
    memberOverlayMap,
  ]);

  const activeInDialog = useMemo(() => {
    let count = 0;
    const keys = Object.keys(defaultFilters) as (keyof MessagesSearchFilters)[];

    for (const key of keys) {
      if (filters[key] !== defaultFilters[key]) count += 1;
    }

    return count;
  }, [filters]);

  const patch = (partial: Partial<MessagesSearchFilters>) => {
    onFiltersChange({ ...filters, ...partial });
  };

  const selectMember = (memberId: string) => {
    patch({ fromUserId: memberId });
    setFromQuery("");
    setShowFromResults(false);
  };

  const clearMember = () => {
    patch({ fromUserId: null });
    setFromQuery("");
  };

  const selectChannel = (channelId: string) => {
    patch({ inChannelId: channelId, inConversationId: null });
    setInQuery("");
    setShowInResults(false);
  };

  const selectConversation = (conversationId: string) => {
    patch({ inConversationId: conversationId, inChannelId: null });
    setInQuery("");
    setShowInResults(false);
  };

  const clearInSelection = (type: "channel" | "conversation") => {
    if (type === "channel") {
      patch({ inChannelId: null });
      return;
    }

    patch({ inConversationId: null });
  };

  const clearAll = () => {
    onFiltersChange(createDefaultMessagesSearchFilters());
    setFromQuery("");
    setInQuery("");
    setShowFromResults(false);
    setShowInResults(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[92vh] overflow-hidden border-[#3b3d42] bg-[#1d1f23] p-0 text-neutral-200 shadow-[0_18px_64px_rgba(0,0,0,0.55)] sm:max-w-[680px]"
        showCloseButton
      >
        <DialogHeader className="border-b border-[#34363b] px-6 py-4 text-left">
          <DialogTitle className="text-xl font-semibold text-white">
            {t("filterBy")}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[calc(92vh-142px)] space-y-6 overflow-y-auto px-6 py-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="relative space-y-2" ref={fromRef}>
              <Label className="text-[13px] font-semibold text-neutral-200">
                {t("from")}
              </Label>
              <div
                className={cn(
                  "min-h-11 rounded-md border border-[#565856] bg-[#222529] px-3 py-2 transition",

                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {selectedMember ? (
                    <TokenButton onRemove={clearMember}>
                      {(() => {
                        const display = displayMember(selectedMember);
                        return display.displayName || display.name || display.email;
                      })()}
                    </TokenButton>
                  ) : null}
                  <Input
                    value={fromQuery}
                    onChange={(event) => {
                      setFromQuery(event.target.value);
                      setShowFromResults(true);
                    }}
                    onFocus={() => setShowFromResults(true)}
                    placeholder={selectedMember ? "" : "Ex. Zoe Maxwell"}
                    className="min-w-[140px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {showFromResults ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-[#3b3d42] bg-[#222529] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <div className="border-b border-[#34363b] px-3 py-2 text-xs font-medium text-neutral-400">
                    {t("suggestions")}
                  </div>
                  <div className="max-h-72 overflow-y-auto py-1">
                    {filteredMembers.length > 0 ? (
                      filteredMembers.map((member) => {
                        const display = displayMember(member);
                        const label =
                          display.displayName || display.name || display.email || member.id;

                        return (
                          <button
                            key={member.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#1264a3] focus:bg-[#1264a3] focus:outline-none"
                            onClick={() => selectMember(member.id)}
                          >
                            <Avatar className="size-8 rounded-md">
                              <AvatarImage src={display.avatar || ""} />
                              <AvatarFallback className="rounded-md bg-[#1164a3] text-[11px] text-white">
                                {label.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {label}
                              </p>
                              <p className="truncate text-xs text-neutral-400">
                                {display.email || t("workspaceMember")}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <ResultEmpty text={t("noPeopleFound")} />
                    )}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="relative space-y-2" ref={inRef}>
              <Label className="text-[13px] font-semibold text-neutral-200">
                {t("in")}
              </Label>
              <div
                className={cn(
                  "min-h-11 rounded-md border border-[#565856] bg-[#222529] px-3 py-2 transition",
                  "focus-within:border-[#1d9bd1] focus-within:ring-2 focus-within:ring-[#1d9bd1]/35",
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  {selectedChannel ? (
                    <TokenButton onRemove={() => clearInSelection("channel")}>
                      #{selectedChannel.name}
                    </TokenButton>
                  ) : null}
                  {selectedConversation ? (
                    <TokenButton onRemove={() => clearInSelection("conversation")}>
                      {convLabel(selectedConversation, currentUser?.id, memberOverlayMap, t)}
                    </TokenButton>
                  ) : null}
                  <input
                    value={inQuery}
                    onChange={(event) => {
                      setInQuery(event.target.value);
                      setShowInResults(true);
                    }}
                    onFocus={() => setShowInResults(true)}
                    placeholder={
                      selectedChannel || selectedConversation
                        ? ""
                        : "Ex. #project-unicorn"
                    }
                    className="min-w-[140px] flex-1 bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
                  />
                </div>
              </div>

              {showInResults ? (
                <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-lg border border-[#3b3d42] bg-[#222529] shadow-[0_10px_30px_rgba(0,0,0,0.45)]">
                  <div className="border-b border-[#34363b] px-3 py-2">
                    <div className="flex items-center gap-2 rounded-md border border-[#565856] bg-[#1d1f23] px-3 py-2">
                      <Search className="size-4 text-neutral-500" />
                      <Input
                        value={inQuery}
                        onChange={(event) => setInQuery(event.target.value)}
                        placeholder={t("searchChannelsOrDMs")}
                        className="h-auto border-0 bg-transparent p-0 text-sm text-white shadow-none focus-visible:ring-0"
                      />
                    </div>
                  </div>

                  <div className="max-h-80 overflow-y-auto py-1">
                    <div className="px-3 py-2 text-xs font-medium text-neutral-400">
                      {t("channels")}
                    </div>
                    {filteredTargets.channels.length > 0 ? (
                      filteredTargets.channels.map((channel) => (
                        <button
                          key={channel.id}
                          type="button"
                          className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#1264a3] focus:bg-[#1264a3] focus:outline-none"
                          onClick={() => selectChannel(channel.id)}
                        >
                          <div className="flex size-8 items-center justify-center rounded-md bg-[#30343a] text-neutral-200">
                            {channel.isPrivate ? (
                              <MdOutlineLock className="size-3.5" />
                            ) : (
                              <FiHash className="size-3.5" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">
                              {channel.name}
                            </p>
                            <p className="text-xs text-neutral-400">
                              {channel.isPrivate ? t("privateChannel") : t("channel")}
                            </p>
                          </div>
                        </button>
                      ))
                    ) : (
                      <ResultEmpty text={t("noChannelsFound")} />
                    )}

                    <div className="px-3 pt-3 pb-2 text-xs font-medium text-neutral-400">
                      {t("directMessages")}
                    </div>
                    {filteredTargets.conversations.length > 0 ? (
                      filteredTargets.conversations.map((conversation) => {
                        const label = convLabel(
                          conversation,
                          currentUser?.id,
                          memberOverlayMap,
                        );
                        const otherMember = conversation.isGroup
                          ? null
                          : conversation.members.find(
                              (member) => member.id !== currentUser?.id,
                            ) ?? conversation.members[0];
                        const display = otherMember
                          ? mergeUserForDisplay(
                              otherMember as User,
                              getMemberOverlay(memberOverlayMap, otherMember.id),
                            )
                          : null;

                        return (
                          <button
                            key={conversation.id}
                            type="button"
                            className="flex w-full items-center gap-3 px-3 py-2 text-left transition hover:bg-[#1264a3] focus:bg-[#1264a3] focus:outline-none"
                            onClick={() => selectConversation(conversation.id)}
                          >
                            {conversation.isGroup ? (
                              <div className="flex size-8 items-center justify-center rounded-md bg-[#2f6f44] text-xs font-semibold text-white">
                                {conversation.members.length}
                              </div>
                            ) : (
                              <Avatar className="size-8 rounded-md">
                                <AvatarImage src={display?.avatar || ""} />
                                <AvatarFallback className="rounded-md bg-[#1164a3] text-[11px] text-white">
                                  {(label || "U").slice(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">
                                {label}
                              </p>
                              <p className="text-xs text-neutral-400">
                                {conversation.isGroup ? t("groupDM") : t("directMessage")}
                              </p>
                            </div>
                          </button>
                        );
                      })
                    ) : (
                      <ResultEmpty text={t("noConversationsFound")} />
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-neutral-200">
                {t("date")}
              </Label>
              <Select
                value={filters.datePreset}
                onValueChange={(value) =>
                  patch({ datePreset: value as MessagesSearchFilters["datePreset"] })
                }
              >
                <SelectTrigger className="h-11 border-[#565856] bg-[#222529] text-sm text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#3b3d42] bg-[#222529] text-neutral-200">
                  {DATE_OPTION_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {getDateOptionLabel(value, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-[13px] font-semibold text-neutral-200">
                {t("fileType")}
              </Label>
              <Select
                value={filters.fileType}
                onValueChange={(value) =>
                  patch({ fileType: value as MessagesSearchFilters["fileType"] })
                }
              >
                <SelectTrigger className="h-11 border-[#565856] bg-[#222529] text-sm text-neutral-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-[#3b3d42] bg-[#222529] text-neutral-200">
                  {FILE_TYPE_VALUES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {getFileTypeLabel(value, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-lg border border-[#34363b] bg-[#222529] p-4">
            <p className="mb-3 text-sm font-semibold text-white">{t("messageHas")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["hasFile", t("aFileAttached")],
                  ["hasLink", t("aLinkShared")],
                  ["hasAction", t("aSlackAppAction")],
                  ["isDm", t("sentInDM")],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 text-sm text-neutral-200"
                >
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                    className="size-3 cursor-pointer accent-selection-hover"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-[#34363b] bg-[#222529] p-4">
            <p className="mb-3 text-sm font-semibold text-white">{t("messageIs")}</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {(
                [
                  ["inThread", t("inAThread")],
                  ["saved", t("saved")],
                  ["pinned", t("pinned")],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 text-sm text-neutral-200"
                >
                  <input
                    type="checkbox"
                    checked={filters[key]}
                    onChange={(e) => patch({ [key]: e.target.checked })}
                    className="size-3 cursor-pointer accent-selection-hover"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </div>

          <a
            href="https://slack.com/help/articles/202528808-search-in-slack"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 text-sm text-[#36c5f0] transition hover:underline"
          >
            <FiInfo className="size-4 shrink-0" />
            {t("learnMoreAboutSearch")}
          </a>
        </div>

        <DialogFooter className="border-t border-[#34363b] px-6 py-4 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={clearAll}
            disabled={activeInDialog === 0}
          >
            {t("clearFilters")}{activeInDialog > 0 ? ` (${activeInDialog})` : ""}
          </Button>
          <Button
            type="button"
            variant="success"
            onClick={() => {
              onApply();
              onOpenChange(false);
            }}
          >
            {t("searchAction")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
