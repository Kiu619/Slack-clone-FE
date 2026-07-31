"use client";

import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { useChannels } from "@/hooks/use-channel";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { workspaceKeys } from "@/lib/query-keys";
import type { Channel, DirectMessageConversation, WorkspaceMember } from "@/lib/types";
import { useUserStore } from "@/stores/useUserStore";
import { useWorkspaceMemberStore, type WorkspaceMemberDisplay } from "@/stores/useWorkspaceMemberStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PopoverContent } from "../../components/ui/popover";
import {
  HAS_TOKEN_PREFIX,
  IN_TOKEN_PREFIX,
  IS_TOKEN_PREFIX,
  SEARCH_TOKEN_PREFIX,
  TYPE_TOKEN_PREFIX,
  WITH_TOKEN_PREFIX,
} from "./constants";
import {
  GlobalSearchDropdownPortal,
} from "./global-search-dropdown-portal";
import { GlobalSearchFilterToolbar } from "./global-search-filter-toolbar";
import { GlobalSearchInputBar } from "./global-search-input-bar";
import { GlobalSearchSelectedSummary } from "./global-search-selected-summary";
import type { HasFilterType, IsFilterType, TypeFilterType } from "./types";
import {
  getMergedMember,
  resolveWorkspaceMember,
  toLocalDate,
} from "./utils";
import { useGlobalSearchStore } from "@/stores/useGlobalSearchStore";

const EMPTY_WORKSPACE_MEMBER_MAP: Record<string, WorkspaceMemberDisplay> = {};

type GlobalSearchPopoverContentProps = {
  workspaceId: string;
};

export function GlobalSearchPopoverContent({
  workspaceId,
}: GlobalSearchPopoverContentProps) {
  const router = useRouter();
  const isSearchOpen = useGlobalSearchStore((state) => state.open);
  const currentUser = useUserStore((state) => state.user);
  const draftQuery = useGlobalSearchStore((state) => state.draftQuery);
  const fromUserIds = useGlobalSearchStore((state) => state.fromUserIds);
  const withUserIds = useGlobalSearchStore((state) => state.withUserIds);
  const inChannelIds = useGlobalSearchStore((state) => state.inChannelIds);
  const inConversationIds = useGlobalSearchStore((state) => state.inConversationIds);
  const afterDate = useGlobalSearchStore((state) => state.afterDate);
  const beforeDate = useGlobalSearchStore((state) => state.beforeDate);
  const hasFilterTypes = useGlobalSearchStore((state) => state.hasFilterTypes);
  const isFilterTypes = useGlobalSearchStore((state) => state.isFilterTypes);
  const typeFilterTypes = useGlobalSearchStore((state) => state.typeFilterTypes);
  const setQuery = useGlobalSearchStore((state) => state.setQuery);
  const setDraftQuery = useGlobalSearchStore((state) => state.setDraftQuery);
  const addFromUserId = useGlobalSearchStore((state) => state.addFromUserId);
  const removeFromUserId = useGlobalSearchStore((state) => state.removeFromUserId);
  const addWithUserId = useGlobalSearchStore((state) => state.addWithUserId);
  const removeWithUserId = useGlobalSearchStore((state) => state.removeWithUserId);
  const addInChannelId = useGlobalSearchStore((state) => state.addInChannelId);
  const removeInChannelId = useGlobalSearchStore((state) => state.removeInChannelId);
  const addInConversationId = useGlobalSearchStore((state) => state.addInConversationId);
  const removeInConversationId = useGlobalSearchStore((state) => state.removeInConversationId);
  const setAfterDate = useGlobalSearchStore((state) => state.setAfterDate);
  const setBeforeDate = useGlobalSearchStore((state) => state.setBeforeDate);
  const clearDateRange = useGlobalSearchStore((state) => state.clearDateRange);
  const addHasFilterType = useGlobalSearchStore((state) => state.addHasFilterType);
  const removeHasFilterType = useGlobalSearchStore((state) => state.removeHasFilterType);
  const addIsFilterType = useGlobalSearchStore((state) => state.addIsFilterType);
  const removeIsFilterType = useGlobalSearchStore((state) => state.removeIsFilterType);
  const addTypeFilterType = useGlobalSearchStore((state) => state.addTypeFilterType);
  const removeTypeFilterType = useGlobalSearchStore((state) => state.removeTypeFilterType);
  const closeSearch = useGlobalSearchStore((state) => state.closeSearch);
  const [openFilters, setOpenFilters] = useState(true);
  const [fromPickerOpen, setFromPickerOpen] = useState(false);
  const [fromPickerQuery, setFromPickerQuery] = useState("");
  const [withPickerOpen, setWithPickerOpen] = useState(false);
  const [withPickerQuery, setWithPickerQuery] = useState("");
  const [inPickerOpen, setInPickerOpen] = useState(false);
  const [inPickerQuery, setInPickerQuery] = useState("");
  const [hasPickerOpen, setHasPickerOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [typePickerOpen, setTypePickerOpen] = useState(false);
  const inputWrapRef = useRef<HTMLDivElement | null>(null);
  const dropdownWrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);
  const [popoverWidth, setPopoverWidth] = useState<number | null>(null);

  const { data: channels = [] } = useChannels(workspaceId);
  const { data: conversations = [] } = useQuery({
    queryKey: ["dm-conversations", workspaceId],
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId && (isSearchOpen || inPickerOpen || inConversationIds.length > 0),
  });
  const { data: workspaceMembers = [] } = useQuery({
    queryKey: workspaceKeys.members(workspaceId),
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId && (fromPickerOpen || withPickerOpen || inPickerOpen),
  });
  const debouncedFromPickerQuery = useDebouncedValue(fromPickerQuery, 150);
  const debouncedWithPickerQuery = useDebouncedValue(withPickerQuery, 150);
  const debouncedInPickerQuery = useDebouncedValue(inPickerQuery, 150);

  const memberOverlayMap = useWorkspaceMemberStore(
    (state) => state.byWorkspace[workspaceId] ?? EMPTY_WORKSPACE_MEMBER_MAP,
  );

  const selectedFromMembers = useMemo(
    () =>
      fromUserIds
        .map((memberId) =>
          resolveWorkspaceMember(memberId, currentUser, workspaceMembers, memberOverlayMap),
        )
        .filter(Boolean) as WorkspaceMember[],
    [currentUser, fromUserIds, memberOverlayMap, workspaceMembers],
  );

  const selectedWithMembers = useMemo(
    () =>
      withUserIds
        .map((memberId) =>
          resolveWorkspaceMember(memberId, currentUser, workspaceMembers, memberOverlayMap),
        )
        .filter(Boolean) as WorkspaceMember[],
    [currentUser, memberOverlayMap, withUserIds, workspaceMembers],
  );

  const selectedInChannels = useMemo(
    () => channels.filter((channel) => inChannelIds.includes(channel.id)),
    [channels, inChannelIds],
  );

  const selectedInConversations = useMemo(
    () => conversations.filter((conversation) => inConversationIds.includes(conversation.id)),
    [conversations, inConversationIds],
  );

  const last7DaysRange = useMemo(() => {
    const today = new Date();
    const after = new Date(today);
    after.setDate(today.getDate() - 7);
    const before = new Date(today);
    before.setDate(today.getDate() + 1);
    return {
      afterDate: toLocalDate(after),
      beforeDate: toLocalDate(before),
    };
  }, []);

  const filteredMembers = useMemo(() => {
    const query = debouncedFromPickerQuery.trim().toLowerCase();
    return workspaceMembers
      .filter((member) => member.id !== currentUser?.id)
      .filter((member) => !fromUserIds.includes(member.id))
      .filter((member) => {
        if (!query) return true;
        const display = getMergedMember(member, memberOverlayMap);
        const haystack = `${display.displayName ?? display.name ?? member.name ?? ""} ${display.email ?? member.email ?? ""}`
          .trim()
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [currentUser?.id, debouncedFromPickerQuery, fromUserIds, memberOverlayMap, workspaceMembers]);

  const filteredWithMembers = useMemo(() => {
    const query = debouncedWithPickerQuery.trim().toLowerCase();
    return workspaceMembers
      .filter((member) => member.id !== currentUser?.id)
      .filter((member) => !withUserIds.includes(member.id))
      .filter((member) => {
        if (!query) return true;
        const display = getMergedMember(member, memberOverlayMap);
        const haystack = `${display.displayName ?? display.name ?? member.name ?? ""} ${display.email ?? member.email ?? ""}`
          .trim()
          .toLowerCase();
        return haystack.includes(query);
      })
      .slice(0, 8);
  }, [currentUser?.id, debouncedWithPickerQuery, memberOverlayMap, withUserIds, workspaceMembers]);

  const filteredInChannels = useMemo(() => {
    const query = debouncedInPickerQuery.trim().toLowerCase();
    return channels
      .filter((channel) => !inChannelIds.includes(channel.id))
      .filter((channel) => (query ? channel.name.toLowerCase().includes(query) : true))
      .slice(0, 5);
  }, [channels, debouncedInPickerQuery, inChannelIds]);

  const filteredInConversations = useMemo(() => {
    const query = debouncedInPickerQuery.trim().toLowerCase();
    return conversations
      .filter((conversation) => !inConversationIds.includes(conversation.id))
      .filter((conversation) => {
        if (!query) return true;
        return conversation.members.some((member) => {
          if (member.id === currentUser?.id) return false;
          const display = memberOverlayMap[member.id] as Partial<Pick<WorkspaceMember, "displayName" | "name" | "email">> | undefined;
          const resolvedName =
            display?.displayName ?? display?.name ?? member.displayName ?? member.name ?? "";
          const resolvedEmail = display?.email ?? member.email ?? "";
          return `${resolvedName} ${resolvedEmail}`.toLowerCase().includes(query);
        });
      })
      .slice(0, 5);
  }, [conversations, currentUser?.id, debouncedInPickerQuery, inConversationIds, memberOverlayMap]);

  const last7DaysActive = afterDate === last7DaysRange.afterDate && beforeDate === last7DaysRange.beforeDate;
  const fromMeActive = Boolean(currentUser?.id && fromUserIds.includes(currentUser.id));
  const includeMeActive = Boolean(currentUser?.id && withUserIds.includes(currentUser.id));
  const inActive = inChannelIds.length > 0 || inConversationIds.length > 0;
  const hasActive = hasFilterTypes.length > 0;
  const isActive = isFilterTypes.length > 0;
  useEffect(() => {
    if (
      !fromPickerOpen &&
      !withPickerOpen &&
      !inPickerOpen &&
      !hasPickerOpen &&
      !isPickerOpen &&
      !typePickerOpen
    ) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputWrapRef.current &&
        !inputWrapRef.current.contains(target) &&
        !(dropdownWrapRef.current && dropdownWrapRef.current.contains(target))
      ) {
        setFromPickerOpen(false);
        setWithPickerOpen(false);
        setInPickerOpen(false);
        setHasPickerOpen(false);
        setIsPickerOpen(false);
        setTypePickerOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [fromPickerOpen, withPickerOpen, inPickerOpen, hasPickerOpen, isPickerOpen, typePickerOpen]);

  useEffect(() => {
    if (
      !fromPickerOpen &&
      !withPickerOpen &&
      !inPickerOpen &&
      !hasPickerOpen &&
      !isPickerOpen &&
      !typePickerOpen
    ) {
      return;
    }

    const updateRect = () => {
      const node = inputWrapRef.current;
      if (!node) return;
      setDropdownRect(node.getBoundingClientRect());
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    window.addEventListener("scroll", updateRect, true);
    return () => {
      window.removeEventListener("resize", updateRect);
      window.removeEventListener("scroll", updateRect, true);
    };
  }, [fromPickerOpen, withPickerOpen, inPickerOpen, hasPickerOpen, isPickerOpen, typePickerOpen]);

  const openInPicker = () => {
    setDraftQuery(IN_TOKEN_PREFIX);
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setInPickerQuery("");
    setInPickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(Math.min(IN_TOKEN_PREFIX.length, input.value.length), Math.min(IN_TOKEN_PREFIX.length, input.value.length));
    });
  };

  const openFromPicker = () => {
    setDraftQuery(SEARCH_TOKEN_PREFIX);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setFromPickerQuery("");
    setFromPickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(
        Math.min(SEARCH_TOKEN_PREFIX.length, input.value.length),
        Math.min(SEARCH_TOKEN_PREFIX.length, input.value.length),
      );
    });
  };

  const openWithPicker = () => {
    setDraftQuery(WITH_TOKEN_PREFIX);
    setFromPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setWithPickerQuery("");
    setWithPickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(
        Math.min(WITH_TOKEN_PREFIX.length, input.value.length),
        Math.min(WITH_TOKEN_PREFIX.length, input.value.length),
      );
    });
  };

  const openHasPicker = () => {
    setDraftQuery(HAS_TOKEN_PREFIX);
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setHasPickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(Math.min(HAS_TOKEN_PREFIX.length, input.value.length), Math.min(HAS_TOKEN_PREFIX.length, input.value.length));
    });
  };

  const openIsPicker = () => {
    setDraftQuery(IS_TOKEN_PREFIX);
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setTypePickerOpen(false);
    setIsPickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(Math.min(IS_TOKEN_PREFIX.length, input.value.length), Math.min(IS_TOKEN_PREFIX.length, input.value.length));
    });
  };

  const openTypePicker = () => {
    setDraftQuery(TYPE_TOKEN_PREFIX);
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(true);
    requestAnimationFrame(() => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      input.setSelectionRange(Math.min(TYPE_TOKEN_PREFIX.length, input.value.length), Math.min(TYPE_TOKEN_PREFIX.length, input.value.length));
    });
  };

  const selectFromMember = (member: WorkspaceMember) => {
    addFromUserId(member.id);
    setFromPickerQuery("");
    setFromPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectWithMember = (member: WorkspaceMember) => {
    addWithUserId(member.id);
    setWithPickerQuery("");
    setWithPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectInChannel = (channel: Channel) => {
    addInChannelId(channel.id);
    setInPickerQuery("");
    setInPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectInConversation = (conversation: DirectMessageConversation) => {
    addInConversationId(conversation.id);
    setInPickerQuery("");
    setInPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectHasFilter = (type: HasFilterType) => {
    addHasFilterType(type);
    setHasPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectIsFilter = (type: IsFilterType) => {
    addIsFilterType(type);
    setIsPickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const selectTypeFilter = (type: TypeFilterType) => {
    addTypeFilterType(type);
    setTypePickerOpen(false);
    setDraftQuery("");
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggleFromMe = () => {
    if (!currentUser?.id) return;
    if (fromUserIds.includes(currentUser.id)) {
      removeFromUserId(currentUser.id);
    } else {
      addFromUserId(currentUser.id);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggleIncludeMe = () => {
    if (!currentUser?.id) return;
    if (withUserIds.includes(currentUser.id)) {
      removeWithUserId(currentUser.id);
    } else {
      addWithUserId(currentUser.id);
    }
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleToggleLast7Days = () => {
    if (last7DaysActive) {
      clearDateRange();
      requestAnimationFrame(() => inputRef.current?.focus());
      window.setTimeout(() => inputRef.current?.focus(), 0);
      return;
    }

    setAfterDate(last7DaysRange.afterDate);
    setBeforeDate(last7DaysRange.beforeDate);
    requestAnimationFrame(() => inputRef.current?.focus());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleInputChange = (value: string) => {
    if (value.startsWith(SEARCH_TOKEN_PREFIX)) {
      setFromPickerOpen(true);
      setWithPickerOpen(false);
      setInPickerOpen(false);
      setHasPickerOpen(false);
      setIsPickerOpen(false);
      setTypePickerOpen(false);
      setFromPickerQuery(value.slice(SEARCH_TOKEN_PREFIX.length).trimStart());
      setDraftQuery(value);
      return;
    }

    if (value.startsWith(WITH_TOKEN_PREFIX)) {
      setWithPickerOpen(true);
      setFromPickerOpen(false);
      setInPickerOpen(false);
      setHasPickerOpen(false);
      setIsPickerOpen(false);
      setTypePickerOpen(false);
      setWithPickerQuery(value.slice(WITH_TOKEN_PREFIX.length).trimStart());
      setDraftQuery(value);
      return;
    }

    if (value.startsWith(IN_TOKEN_PREFIX)) {
      setInPickerOpen(true);
      setFromPickerOpen(false);
      setWithPickerOpen(false);
      setHasPickerOpen(false);
      setIsPickerOpen(false);
      setTypePickerOpen(false);
      setInPickerQuery(value.slice(IN_TOKEN_PREFIX.length).trimStart());
      setDraftQuery(value);
      return;
    }

    if (value.startsWith(HAS_TOKEN_PREFIX)) {
      setHasPickerOpen(true);
      setIsPickerOpen(false);
      setFromPickerOpen(false);
      setWithPickerOpen(false);
      setInPickerOpen(false);
      setTypePickerOpen(false);
      setDraftQuery(HAS_TOKEN_PREFIX);
      return;
    }

    if (value.startsWith(IS_TOKEN_PREFIX)) {
      setIsPickerOpen(true);
      setHasPickerOpen(false);
      setFromPickerOpen(false);
      setWithPickerOpen(false);
      setInPickerOpen(false);
      setTypePickerOpen(false);
      setDraftQuery(IS_TOKEN_PREFIX);
      return;
    }

    if (value.startsWith(TYPE_TOKEN_PREFIX)) {
      setTypePickerOpen(true);
      setHasPickerOpen(false);
      setIsPickerOpen(false);
      setFromPickerOpen(false);
      setWithPickerOpen(false);
      setInPickerOpen(false);
      setDraftQuery(TYPE_TOKEN_PREFIX);
      return;
    }

    setDraftQuery(value);
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setFromPickerQuery("");
    setWithPickerQuery("");
    setInPickerQuery("");
  };

  const handleSubmitSearch = () => {
    setQuery(draftQuery);
    closeSearch();
    router.push(`/workspace/${workspaceId}/search`);
  };

  useEffect(() => {
    if (!isSearchOpen) return;

    const focusInput = () => {
      const input = inputRef.current;
      if (!input) return;
      input.focus();
      const cursor = input.value.length;
      input.setSelectionRange(cursor, cursor);
    };

    requestAnimationFrame(focusInput);
    const timeoutId = window.setTimeout(focusInput, 50);
    return () => window.clearTimeout(timeoutId);
  }, [isSearchOpen]);

  useEffect(() => {
    if (isSearchOpen) return;
    setFromPickerOpen(false);
    setWithPickerOpen(false);
    setInPickerOpen(false);
    setHasPickerOpen(false);
    setIsPickerOpen(false);
    setTypePickerOpen(false);
    setFromPickerQuery("");
    setWithPickerQuery("");
    setInPickerQuery("");
    setDropdownRect(null);
  }, [isSearchOpen]);

  useEffect(() => {
    if (!isSearchOpen) return;

    const trigger = document.getElementById("global-search-toolbar-trigger");
    if (!trigger) return;

    const updateWidth = () => {
      setPopoverWidth(Math.ceil(trigger.getBoundingClientRect().width) + 50);
    };

    updateWidth();
    const observer = new ResizeObserver(updateWidth);
    observer.observe(trigger);
    window.addEventListener("resize", updateWidth);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", updateWidth);
    };
  }, [isSearchOpen]);

  return (
    <PopoverContent
      side="bottom"
      align="center"
      withOverlay
      sideOffset={-28}
      style={popoverWidth ? { width: `${popoverWidth}px` } : undefined}
      className=" overflow-hidden rounded-md border border-[#2f3136] border-t-0 p-0shadow-[0_24px_70px_rgba(0,0,0,0.62)]"
    >
      <div className="flex flex-col">
        <GlobalSearchInputBar
          openFilters={openFilters}
          onToggleFilters={() => setOpenFilters((prev) => !prev)}
          onCloseSearch={closeSearch}
          inputWrapRef={inputWrapRef}
          inputRef={inputRef}
          query={draftQuery}
          onQueryChange={handleInputChange}
          onSubmitSearch={handleSubmitSearch}
          onInputFocus={() => {
            setFromPickerOpen(draftQuery.startsWith(SEARCH_TOKEN_PREFIX));
            setWithPickerOpen(draftQuery.startsWith(WITH_TOKEN_PREFIX));
            setInPickerOpen(draftQuery.startsWith(IN_TOKEN_PREFIX));
            setHasPickerOpen(draftQuery.startsWith(HAS_TOKEN_PREFIX));
            setIsPickerOpen(draftQuery.startsWith(IS_TOKEN_PREFIX));
            setTypePickerOpen(draftQuery.startsWith(TYPE_TOKEN_PREFIX));
          }}
          onInputBlur={() => {
            setFromPickerOpen(false);
            setWithPickerOpen(false);
            setInPickerOpen(false);
            setHasPickerOpen(false);
            setIsPickerOpen(false);
            setTypePickerOpen(false);
          }}
          selectedFromMembers={selectedFromMembers}
          selectedWithMembers={selectedWithMembers}
          selectedInChannels={selectedInChannels}
          selectedInConversations={selectedInConversations}
          hasFilterTypes={hasFilterTypes}
          isFilterTypes={isFilterTypes}
          typeFilterTypes={typeFilterTypes}
          afterDate={afterDate}
          beforeDate={beforeDate}
          onRemoveAfterDate={() => {
            setAfterDate(null);
          }}
          onRemoveBeforeDate={() => {
            setBeforeDate(null);
          }}
          currentUserId={currentUser?.id}
          memberOverlayMap={memberOverlayMap}
          onRemoveFromMember={(memberId) => removeFromUserId(memberId)}
          onRemoveWithMember={(memberId) => removeWithUserId(memberId)}
          onRemoveInChannel={(channelId) => removeInChannelId(channelId)}
          onRemoveInConversation={(conversationId) => removeInConversationId(conversationId)}
          onRemoveHasFilter={(type) => removeHasFilterType(type)}
          onRemoveIsFilter={(type) => removeIsFilterType(type)}
          onRemoveTypeFilter={(type) => removeTypeFilterType(type)}
        />

        {openFilters && (
          <GlobalSearchFilterToolbar
            fromMeActive={fromMeActive}
            includeMeActive={includeMeActive}
            inActive={inActive}
            hasActive={hasActive}
            isActive={isActive}
            last7DaysActive={last7DaysActive}
            onToggleFromMe={handleToggleFromMe}
            onToggleIncludeMe={handleToggleIncludeMe}
            onOpenFromPicker={openFromPicker}
            onOpenWithPicker={openWithPicker}
            onOpenInPicker={openInPicker}
            onOpenHasPicker={openHasPicker}
            onOpenIsPicker={openIsPicker}
            onToggleLast7Days={handleToggleLast7Days}
            onOpenTypePicker={openTypePicker}
          />
        )}

        <GlobalSearchDropdownPortal
          workspaceId={workspaceId}
          dropdownRect={dropdownRect}
          fromPickerOpen={fromPickerOpen}
          withPickerOpen={withPickerOpen}
          inPickerOpen={inPickerOpen}
          hasPickerOpen={hasPickerOpen}
          isPickerOpen={isPickerOpen}
          typePickerOpen={typePickerOpen}
          filteredMembers={filteredMembers}
          filteredWithMembers={filteredWithMembers}
          filteredInChannels={filteredInChannels}
          filteredInConversations={filteredInConversations}
          currentUserId={currentUser?.id}
          memberOverlayMap={memberOverlayMap}
          dropdownWrapRef={dropdownWrapRef}
          onSelectFromMember={selectFromMember}
          onSelectWithMember={selectWithMember}
          onSelectInChannel={selectInChannel}
          onSelectInConversation={selectInConversation}
          onSelectHasFilter={selectHasFilter}
          onSelectIsFilter={selectIsFilter}
          onSelectTypeFilter={selectTypeFilter}
        />

        <GlobalSearchSelectedSummary
          selectedFromMembers={selectedFromMembers}
          selectedWithMembers={selectedWithMembers}
          selectedInChannels={selectedInChannels}
          selectedInConversations={selectedInConversations}
          hasFilterTypes={hasFilterTypes}
          isFilterTypes={isFilterTypes}
          typeFilterTypes={typeFilterTypes}
          afterDate={afterDate}
          beforeDate={beforeDate}
          query={draftQuery}
          currentUserId={currentUser?.id}
          memberOverlayMap={memberOverlayMap}
        />

      </div>
    </PopoverContent>
  );
}
