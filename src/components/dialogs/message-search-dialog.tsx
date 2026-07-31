"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogFooter,
  CustomDialogHeader,
  CustomDialogTitle,
} from "../custom-dialog";
import { CustomSelect } from "../custom-select";
import { Button } from "../ui/button";
import { useQuery } from "@tanstack/react-query";
import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { useChannels } from "@/hooks/use-channel";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useShallow } from "zustand/react/shallow";
import type { Channel, DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import {
  MessageTargetChip,
  MessageTargetConversationChip,
  MessageTargetConversationRow,
  MessageTargetSearchRow,
} from "@/components/message-target-picker";
import { TargetPickerField } from "@/components/target-picker-field";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";
import { FILE_TYPES } from "@/lib/file-filter-options";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import Typography from "../ui/typography";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore";
import { toLocalDate } from "@/modules/global-search/utils";
import type { HasFilterType, IsFilterType, TypeFilterType } from "@/modules/global-search/types";
import { Input } from "../ui/input";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";

const dateOptions = [
  { label: "Any time", value: "all-time" },
  { label: "Today", value: "today" },
  { label: "Yesterday", value: "yesterday" },
  { label: "Last 7 days", value: "last-7-days" },
  { label: "Last 30 days", value: "last-30-days" },
  { label: "Last 90 days", value: "last-90-days" },
  { label: "Last 180 days", value: "last-180-days" },
  { label: "Last 365 days", value: "last-365-days" },
];

const FILE_TYPE_TO_GLOBAL_TYPE: Record<string, TypeFilterType> = {
  document: "documents",
  spreadsheet: "spreadsheets",
  presentation: "presentations",
  pdf: "pdfs",
  audio: "audio",
  image: "images",
  video: "videos",
  code: "snippets",
};

const GLOBAL_TYPE_TO_FILE_TYPE: Record<TypeFilterType, string> = {
  documents: "document",
  spreadsheets: "spreadsheet",
  presentations: "presentation",
  pdfs: "pdf",
  audio: "audio",
  images: "image",
  videos: "video",
  snippets: "code",
};

function getHasFiltersFromState(
  messageHasFile: boolean,
  messageHasLink: boolean,
  messageHasMyReaction: boolean,
) {
  const result: HasFilterType[] = [];
  if (messageHasLink) result.push("link");
  if (messageHasFile) result.push("file");
  if (messageHasMyReaction) result.push("reaction");
  return result;
}

function getIsFiltersFromState(
  messageIsDirectMessage: boolean,
  messageIsInThread: boolean,
  messageIsSaved: boolean,
  messageIsPinned: boolean,
) {
  const result: IsFilterType[] = [];
  if (messageIsSaved) result.push("saved");
  if (messageIsInThread) result.push("thread");
  if (messageIsDirectMessage) result.push("dm");
  if (messageIsPinned) result.push("pinned");
  return result;
}

function getFileTypesFromGlobalTypes(typeFilterTypes: TypeFilterType[]) {
  return typeFilterTypes
    .map((type) => GLOBAL_TYPE_TO_FILE_TYPE[type])
    .filter(Boolean);
}

function getGlobalTypesFromFileTypes(selectedTypes: string[]) {
  return selectedTypes
    .map((type) => FILE_TYPE_TO_GLOBAL_TYPE[type])
    .filter(Boolean);
}

function getDateRangeForValue(value: string) {
  if (value === "all-time") {
    return { afterDate: null, beforeDate: null };
  }

  const today = new Date();
  const end = new Date(today);
  end.setDate(today.getDate() + 1);

  const daysBackMap: Record<string, number> = {
    today: 1,
    yesterday: 2,
    "last-7-days": 7,
    "last-30-days": 30,
    "last-90-days": 90,
    "last-180-days": 180,
    "last-365-days": 365,
  };

  const daysBack = daysBackMap[value];
  if (!daysBack) {
    return { afterDate: null, beforeDate: null };
  }

  const after = new Date(today);
  after.setDate(today.getDate() - daysBack);
  return {
    afterDate: toLocalDate(after),
    beforeDate: toLocalDate(end),
  };
}

function getDateRangeValueFromDates(afterDate: string | null, beforeDate: string | null) {
  if (!afterDate && !beforeDate) return "all-time";
  if (afterDate && !beforeDate) return `after:${afterDate}`;
  if (!afterDate && beforeDate) return `before:${beforeDate}`;

  const matched = dateOptions.find((option) => {
    const range = getDateRangeForValue(option.value);
    return range.afterDate === afterDate && range.beforeDate === beforeDate;
  });

  if (matched) return matched.value;

  return `after:${afterDate} before:${beforeDate}`;
}

export interface FilterValues {
  userIds: string[];
  channelIds: string[];
  conversationIds: string[];
  dateRange: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialFilters: FilterValues;
  onApply: (filters: FilterValues) => void;
  mode?: "messages" | "files";
}

export default function MessageSearchDialog({
  open,
  onOpenChange,
  workspaceId,
  initialFilters,
  onApply,
  mode = "messages",
}: Props) {
  const { user: currentUser } = useAuth();
  const [fromSearch, setFromSearch] = useState("");
  const [inSearch, setInSearch] = useState("");
  const [withSearch, setWithSearch] = useState("");
  const debouncedFrom = useDebouncedValue(fromSearch, 300);
  const debouncedIn = useDebouncedValue(inSearch, 300);
  const debouncedWith = useDebouncedValue(withSearch, 300);

  const [selectedMembers, setSelectedMembers] = useState<WorkspaceMember[]>([]);
  const [selectedWithMembers, setSelectedWithMembers] = useState<WorkspaceMember[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<DirectMessageConversation[]>([]);

  const [showFromResults, setShowFromResults] = useState(false);
  const [showInResults, setShowInResults] = useState(false);
  const [showWithResults, setShowWithResults] = useState(false);
  const [openTypeFilters, setOpenTypeFilters] = useState(false);
  const [messageHasFile, setMessageHasFile] = useState(false);
  const [messageHasLink, setMessageHasLink] = useState(false);
  const [messageHasMyReaction, setMessageHasMyReaction] = useState(false);
  const [messageIsDirectMessage, setMessageIsDirectMessage] = useState(false);
  const [messageIsInThread, setMessageIsInThread] = useState(false);
  const [messageIsSaved, setMessageIsSaved] = useState(false);
  const [messageIsPinned, setMessageIsPinned] = useState(false);
  const [stagedDateRange, setStagedDateRange] = useState("all-time");

  const fromRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);
  const withRef = useRef<HTMLDivElement>(null);

  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const withUserIds = useGlobalSearchStore((state) => state.withUserIds);
  const setWithUserIds = useGlobalSearchStore((state) => state.setWithUserIds);
  const afterDate = useGlobalSearchStore((state) => state.afterDate);
  const beforeDate = useGlobalSearchStore((state) => state.beforeDate);
  const setAfterDate = useGlobalSearchStore((state) => state.setAfterDate);
  const setBeforeDate = useGlobalSearchStore((state) => state.setBeforeDate);
  const clearDateRange = useGlobalSearchStore((state) => state.clearDateRange);
  const hasFilterTypes = useGlobalSearchStore((state) => state.hasFilterTypes);
  const isFilterTypes = useGlobalSearchStore((state) => state.isFilterTypes);
  const typeFilterTypes = useGlobalSearchStore((state) => state.typeFilterTypes);
  const setHasFilterTypes = useGlobalSearchStore((state) => state.setHasFilterTypes);
  const setIsFilterTypes = useGlobalSearchStore((state) => state.setIsFilterTypes);
  const setTypeFilterTypes = useGlobalSearchStore((state) => state.setTypeFilterTypes);
  const dateRange = stagedDateRange;

  const messageHasOptions = [
    { id: "link", label: "Link", checked: messageHasLink },
    { id: "file", label: "File", checked: messageHasFile },
    { id: "reaction", label: "My reaction", checked: messageHasMyReaction },
  ] as const;

  const messageIsOptions = [
    { id: "dm", label: "A direct message", checked: messageIsDirectMessage },
    { id: "thread", label: "In a thread", checked: messageIsInThread },
    { id: "saved", label: "Saved", checked: messageIsSaved },
    { id: "pinned", label: "Pinned", checked: messageIsPinned },
  ] as const;

  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useQuery({
    queryKey: ["dm-conversations", workspaceId],
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: allMembers = [] } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!open) return;

    setSelectedMembers(allMembers.filter((m) => initialFilters.userIds.includes(m.id)));
    setSelectedWithMembers(allMembers.filter((m) => withUserIds.includes(m.id)));
    setSelectedChannels(channels.filter((c) => initialFilters.channelIds.includes(c.id)));
    setSelectedConversations(conversations.filter((c) => initialFilters.conversationIds.includes(c.id)));
    setMessageHasFile(hasFilterTypes.includes("file"));
    setMessageHasLink(hasFilterTypes.includes("link"));
    setMessageHasMyReaction(hasFilterTypes.includes("reaction"));
    setMessageIsDirectMessage(isFilterTypes.includes("dm"));
    setMessageIsInThread(isFilterTypes.includes("thread"));
    setMessageIsSaved(isFilterTypes.includes("saved"));
    setMessageIsPinned(isFilterTypes.includes("pinned"));
    setSelectedTypes(getFileTypesFromGlobalTypes(typeFilterTypes));
    setStagedDateRange(getDateRangeValueFromDates(afterDate, beforeDate));
    setFromSearch("");
    setInSearch("");
    setWithSearch("");
    setShowFromResults(false);
    setShowInResults(false);
    setShowWithResults(false);
    setOpenTypeFilters(false);
  }, [open, initialFilters, allMembers, channels, conversations, withUserIds, hasFilterTypes, isFilterTypes, typeFilterTypes, afterDate, beforeDate]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const memberResults = useMemo(() => {
    const q = debouncedFrom.trim().toLowerCase();
    if (!q) return [];

    return allMembers
      .filter((m) => {
        const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
        return (
          (d.name?.toLowerCase().includes(q) ||
            d.displayName?.toLowerCase().includes(q) ||
            d.email?.toLowerCase().includes(q)) &&
          !selectedMembers.some((sm) => sm.id === m.id)
        );
      })
      .slice(0, 5);
  }, [debouncedFrom, allMembers, selectedMembers, memberOverlayMap]);

  const withMemberResults = useMemo(() => {
    const q = debouncedWith.trim().toLowerCase();
    if (!q) return [];

    return allMembers
      .filter((m) => {
        const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
        return (
          (d.name?.toLowerCase().includes(q) ||
            d.displayName?.toLowerCase().includes(q) ||
            d.email?.toLowerCase().includes(q)) &&
          !selectedWithMembers.some((sm) => sm.id === m.id)
        );
      })
      .slice(0, 5);
  }, [debouncedWith, allMembers, selectedWithMembers, memberOverlayMap]);

  const inResults = useMemo(() => {
    const q = debouncedIn.trim().toLowerCase();
    if (!q) return { channels: [], conversations: [] };

    const chs =
      channels
        .filter((c) => c.name.toLowerCase().includes(q) && !selectedChannels.some((sc) => sc.id === c.id))
        .slice(0, 5) || [];

    const convs =
      conversations
        .filter((c) => {
          if (selectedConversations.some((sc) => sc.id === c.id)) return false;

          if (!c.isGroup) {
            const otherMember = c.members.find((m) => m.id !== currentUser?.id);
            const d = otherMember
              ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
              : null;
            return d?.name?.toLowerCase().includes(q) || d?.displayName?.toLowerCase().includes(q);
          }

          return c.members.some((m) => {
            if (m.id === currentUser?.id) return false;
            const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
            return d.name?.toLowerCase().includes(q) || d.displayName?.toLowerCase().includes(q);
          });
        })
        .slice(0, 5) || [];

    return { channels: chs, conversations: convs };
  }, [debouncedIn, channels, conversations, selectedChannels, selectedConversations, currentUser?.id, memberOverlayMap]);

  const handleApply = () => {
    setWithUserIds(selectedWithMembers.map((m) => m.id));
    setHasFilterTypes(getHasFiltersFromState(messageHasFile, messageHasLink, messageHasMyReaction));
    setIsFilterTypes(
      getIsFiltersFromState(
        messageIsDirectMessage,
        messageIsInThread,
        messageIsSaved,
        messageIsPinned,
      ),
    );
    setTypeFilterTypes(getGlobalTypesFromFileTypes(selectedTypes));
    if (stagedDateRange === "all-time") {
      clearDateRange();
    } else {
      const range = getDateRangeForValue(stagedDateRange);
      setAfterDate(range.afterDate);
      setBeforeDate(range.beforeDate);
    }
    onApply({
      userIds: selectedMembers.map((m) => m.id),
      channelIds: selectedChannels.map((c) => c.id),
      conversationIds: selectedConversations.map((c) => c.id),
      dateRange,
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedMembers([]);
    setSelectedWithMembers([]);
    setSelectedChannels([]);
    setSelectedConversations([]);
    setFromSearch("");
    setInSearch("");
    setWithSearch("");
    setShowFromResults(false);
    setShowInResults(false);
    setShowWithResults(false);
    setSelectedTypes([]);
    setOpenTypeFilters(false);
    setMessageHasFile(false);
    setMessageHasLink(false);
    setMessageHasMyReaction(false);
    setMessageIsDirectMessage(false);
    setMessageIsInThread(false);
    setMessageIsSaved(false);
    setMessageIsPinned(false);
    setStagedDateRange("all-time");
  };

  const toggleType = (id: string) => {
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((typeId) => typeId !== id) : [...prev, id],
    );
  };

  const clearAllTypes = () => {
    setSelectedTypes([]);
  };

  const toggleMessageHas = (key: "file" | "link" | "reaction", checked: boolean) => {
    if (key === "file") setMessageHasFile(checked);
    if (key === "link") setMessageHasLink(checked);
    if (key === "reaction") setMessageHasMyReaction(checked);
  };

  const toggleMessageIs = (key: "dm" | "thread" | "saved" | "pinned", checked: boolean) => {
    if (key === "dm") setMessageIsDirectMessage(checked);
    if (key === "thread") setMessageIsInThread(checked);
    if (key === "saved") setMessageIsSaved(checked);
    if (key === "pinned") setMessageIsPinned(checked);
  };

  const fileTypesLabel = useMemo(() => {
    if (selectedTypes.length === 0) return "Select type";
    if (selectedTypes.length === 1) {
      return FILE_TYPES.find((type) => type.id === selectedTypes[0])?.label ?? "Select type";
    }

    return `${selectedTypes.length} file types`;
  }, [selectedTypes]);

  const isFromSettled = debouncedFrom.trim() === fromSearch.trim();
  const isInSettled = debouncedIn.trim() === inSearch.trim();
  const isWithSettled = debouncedWith.trim() === withSearch.trim();
  const isFromQueryActive = fromSearch.trim().length > 0;
  const isInQueryActive = inSearch.trim().length > 0;
  const isWithQueryActive = withSearch.trim().length > 0;
  const showFromDropdown = showFromResults && isFromQueryActive;
  const showInDropdown = showInResults && isInQueryActive;
  const showWithDropdown = showWithResults && isWithQueryActive;
  const showFromLoading = isFromQueryActive && !isFromSettled;
  const showInLoading = isInQueryActive && !isInSettled;
  const showWithLoading = isWithQueryActive && !isWithSettled;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Filter by</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <div className="flex flex-col gap-4 py-2">
          <TargetPickerField
            label="From"
            fieldRef={fromRef}
            chips={
              <>
                {selectedMembers.map((member) => {
                  const d = displayMember(member);

                  return (
                    <MessageTargetChip
                      key={member.id}
                      kind="member"
                      member={{
                        id: member.id,
                        displayName: d.displayName || d.name || member.email,
                        name: d.name || member.email.split("@")[0] || member.email,
                        email: member.email,
                        avatar: d.avatar || member.avatar || null,
                      }}
                      onRemove={() =>
                        setSelectedMembers((prev) => prev.filter((m) => m.id !== member.id))
                      }
                    />
                  );
                })}
              </>
            }
            input={
              <Input
                id="from-message-search-dialog"
                placeholder="ex. Zoe Maxwell"
                value={fromSearch}
                onChange={(e) => {
                  setFromSearch(e.target.value);
                  setShowFromResults(true);
                }}
                onFocus={() => setShowFromResults(true)}
                onBlur={() => setShowFromResults(false)}
              />
            }
            rightAdornment={showFromLoading ? <Spinner className="size-4 text-selection-hover" /> : null}
            dropdown={
              showFromDropdown && isFromSettled ? (
                <>
                  {memberResults.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
                  ) : (
                    memberResults.map((member) => {
                      const d = displayMember(member);

                      return (
                        <MessageTargetSearchRow
                          key={member.id}
                          workspaceId={workspaceId}
                          kind="member"
                          member={{
                            id: member.id,
                            displayName: d.displayName || d.name || member.email,
                            name: d.name || member.email.split("@")[0] || member.email,
                            email: member.email,
                            avatar: d.avatar || member.avatar || null,
                            isAway: member.isAway,
                          }}
                          onClick={() => {
                            setSelectedMembers((prev) => [...prev, member]);
                            setFromSearch("");
                            setShowFromResults(false);
                          }}
                        />
                      );
                    })
                  )}
                </>
              ) : null
            }
          />

          <TargetPickerField
            label="In"
            fieldRef={inRef}
            chips={
              <>
                {selectedChannels.map((ch) => (
                  <MessageTargetChip
                    key={ch.id}
                    kind="channel"
                    channel={{
                      id: ch.id,
                      name: ch.name,
                      isPrivate: ch.isPrivate,
                    }}
                    onRemove={() =>
                      setSelectedChannels((prev) => prev.filter((c) => c.id !== ch.id))
                    }
                  />
                ))}
                {selectedConversations.map((conv) => {
                  const otherMember = !conv.isGroup
                    ? conv.members.find((m) => m.id !== currentUser?.id)
                    : null;
                  const otherDisplay = otherMember
                    ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
                    : null;

                  return (
                    <MessageTargetConversationChip
                      key={conv.id}
                      conversation={{
                        id: conv.id,
                        memberCount: conv.members.length,
                        memberNames: conv.isGroup
                          ? conv.members
                            .filter((m) => m.id !== currentUser?.id)
                            .map((m) => {
                              const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
                              return d.displayName || d.name || m.email || "";
                            })
                            .join(", ")
                          : otherDisplay?.displayName || otherDisplay?.name || "Direct Message",
                        memberAvatars: conv.members
                          .filter((m) => m.id !== currentUser?.id)
                          .map((m) => ({
                            id: m.id,
                            avatar: m.avatar,
                            displayName: m.displayName,
                            name: m.name,
                          })),
                        isGroup: conv.isGroup,
                      }}
                      onRemove={() =>
                        setSelectedConversations((prev) => prev.filter((c) => c.id !== conv.id))
                      }
                    />
                  );
                })}
              </>
            }
            input={
              <Input
                id="in-message-search-dialog"
                placeholder="ex. #project-unicorn"
                value={inSearch}
                onChange={(e) => {
                  setInSearch(e.target.value);
                  setShowInResults(true);
                }}
                onFocus={() => setShowInResults(true)}
                onBlur={() => setShowInResults(false)}
              />
            }
            rightAdornment={showInLoading ? <Spinner className="size-4 text-selection-hover" /> : null}
            dropdown={
              showInDropdown && isInSettled ? (
                <>
                  {inResults.channels.length === 0 && inResults.conversations.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
                  ) : (
                    <>
                      {inResults.channels.map((ch) => (
                        <MessageTargetSearchRow
                          key={ch.id}
                          workspaceId={workspaceId}
                          kind="channel"
                          channel={ch}
                          onClick={() => {
                            setSelectedChannels((prev) => [...prev, ch]);
                            setInSearch("");
                            setShowInResults(false);
                          }}
                        />
                      ))}
                      {inResults.conversations.map((conv) => {
                        const otherMember = !conv.isGroup
                          ? conv.members.find((m) => m.id !== currentUser?.id)
                          : null;
                        const otherDisplay = otherMember
                          ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
                          : null;

                        return (
                          <MessageTargetConversationRow
                            key={conv.id}
                            conversation={{
                              id: conv.id,
                              memberCount: conv.members.length,
                              memberNames: conv.isGroup
                                ? conv.members
                                  .filter((m) => m.id !== currentUser?.id)
                                  .map((m) => {
                                    const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
                                    return d.displayName || d.name || m.email || "";
                                  })
                                  .join(", ")
                                : otherDisplay?.displayName || otherDisplay?.name || "Direct Message",
                              memberAvatars: conv.members
                                .filter((m) => m.id !== currentUser?.id)
                                .map((m) => ({
                                  id: m.id,
                                  avatar: m.avatar,
                                  displayName: m.displayName,
                                  name: m.name,
                                })),
                              isGroup: conv.isGroup,
                            }}
                            onClick={() => {
                              setSelectedConversations((prev) => [...prev, conv]);
                              setInSearch("");
                              setShowInResults(false);
                            }}
                          />
                        );
                      })}
                    </>
                  )}
                </>
              ) : null
            }
          />

          <TargetPickerField
            label="With"
            fieldRef={withRef}
            chips={
              <>
                {selectedWithMembers.map((member) => {
                  const d = displayMember(member);

                  return (
                    <MessageTargetChip
                      key={member.id}
                      kind="member"
                      member={{
                        id: member.id,
                        displayName: d.displayName || d.name || member.email,
                        name: d.name || member.email.split("@")[0] || member.email,
                        email: member.email,
                        avatar: d.avatar || member.avatar || null,
                      }}
                      onRemove={() =>
                        setSelectedWithMembers((prev) => prev.filter((m) => m.id !== member.id))
                      }
                    />
                  );
                })}
              </>
            }
            input={
              <Input
                id="with-message-search-dialog"
                placeholder="ex. Zoe Maxwell"
                value={withSearch}
                onChange={(e) => {
                  setWithSearch(e.target.value);
                  setShowWithResults(true);
                }}
                onFocus={() => setShowWithResults(true)}
                onBlur={() => setShowWithResults(false)}
              />
            }
            rightAdornment={showWithLoading ? <Spinner className="size-4 text-selection-hover" /> : null}
            dropdown={
              showWithDropdown && isWithSettled ? (
                <>
                  {withMemberResults.length === 0 ? (
                    <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
                  ) : (
                    withMemberResults.map((member) => {
                      const d = displayMember(member);

                      return (
                        <MessageTargetSearchRow
                          key={member.id}
                          workspaceId={workspaceId}
                          kind="member"
                          member={{
                            id: member.id,
                            displayName: d.displayName || d.name || member.email,
                            name: d.name || member.email.split("@")[0] || member.email,
                            email: member.email,
                            avatar: d.avatar || member.avatar || null,
                            isAway: member.isAway,
                          }}
                          onClick={() => {
                            setSelectedWithMembers((prev) => [...prev, member]);
                            setWithSearch("");
                            setShowWithResults(false);
                          }}
                        />
                      );
                    })
                  )}
                </>
              ) : null
            }
          />

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-bold">Date</Label>
            <CustomSelect
              options={dateOptions}
              value={dateRange}
              onChange={(val) => {
                if (val === "all-time") {
                  clearDateRange();
                  return;
                }

                const range = getDateRangeForValue(val);
                setAfterDate(range.afterDate);
                setBeforeDate(range.beforeDate);
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-bold">File types</Label>
            <Popover open={openTypeFilters} onOpenChange={setOpenTypeFilters}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "flex h-10 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm transition-all focus:outline-none dark:bg-input/30",
                    selectedTypes.length > 0 ? "text-foreground" : "text-muted-foreground",
                    "hover:border-selection-hover hover:bg-white! dark:hover:bg-input/30!",
                    openTypeFilters && "border-selection-hover ring-[3px] ring-offset-0 ring-focus-ring",
                  )}
                >
                  <span className="truncate">{fileTypesLabel}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 transition-transform duration-200",
                      openTypeFilters ? "rotate-180" : "rotate-0",
                    )}
                  />
                </button>
              </PopoverTrigger>
              <PopoverContent
                withOverlay={true}
                side="bottom"
                align="end"
                sideOffset={8}
                className="z-9999 w-(--radix-popover-trigger-width) min-w-(--radix-popover-trigger-width) overflow-hidden rounded-md border border-input bg-white dark:bg-[#1A1D21] py-2 shadow-2xl ring-1 ring-black/5"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                {FILE_TYPES.map((type) => (
                  <label
                    className={cn(
                      "group flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-[14px] transition-colors hover:bg-selection-hover hover:text-white",
                      selectedTypes.includes(type.id) && ACTIVE_ITEM_STYLE,
                    )}
                    key={type.id}
                  >
                    <input
                      id={`file-type-${type.id}`}
                      name={type.id}
                      type="checkbox"
                      checked={selectedTypes.includes(type.id)}
                      onChange={() => toggleType(type.id)}
                      className="size-3 cursor-pointer accent-selection-hover"
                    />
                    <Typography variant="p" text={type.label} />
                  </label>
                ))}
                <div className="mt-2 flex items-center justify-between gap-2 px-2">
                  <span
                    className="px-3 py-2 hover:underline cursor-pointer text-muted-foreground text-xs"
                    onClick={clearAllTypes}
                  >
                    Clear all
                  </span>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {mode === "messages" ? (
            <>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-bold">Message has...</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {messageHasOptions.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          toggleMessageHas(item.id as "file" | "reaction", e.target.checked)
                        }
                        className="size-3 cursor-pointer accent-selection-hover"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-[13px] font-bold">Message is...</Label>
                <div className="grid gap-3 sm:grid-cols-2">
                  {messageIsOptions.map((item) => (
                    <label
                      key={item.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md px-1 py-1 text-sm"
                    >
                      <input
                        type="checkbox"
                        checked={item.checked}
                        onChange={(e) =>
                          toggleMessageIs(item.id as "dm" | "thread" | "saved" | "pinned", e.target.checked)
                        }
                        className="size-3 cursor-pointer accent-selection-hover"
                      />
                      <span>{item.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="gap-2">
        <Button variant="outline" onClick={handleClear}>
          Clear filters
        </Button>
        <Button variant="success" onClick={handleApply}>
          Done
        </Button>
      </CustomDialogFooter>
    </CustomDialog>
  );
}
