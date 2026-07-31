"use client";

import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShallow } from "zustand/react/shallow";
import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { useChannels } from "@/hooks/use-channel";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounce";
import type {
  Channel,
  DirectMessageConversation,
  User,
  WorkspaceMember,
} from "@/lib/types";
import {
  mergeUserForDisplay,
  useWorkspaceMemberStore,
} from "@/stores/useWorkspaceMemberStore";
import {
  getDmMemberDisplayName,
  isActiveWorkspaceMember,
} from "@/lib/dm-members";

export type ForwardRecipientTargetType = "channel" | "member" | "conversation";

export type ForwardSelectedTarget =
  | { id: string; type: "channel"; name: string; data: Channel }
  | { id: string; type: "member"; name: string; data: WorkspaceMember }
  | {
      id: string;
      type: "conversation";
      name: string;
      data: DirectMessageConversation;
    };

export const useForwardRecipientSearch = (workspaceId: string) => {
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [selectedTargets, setSelectedTargets] = useState<
    ForwardSelectedTarget[]
  >([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { data: channels } = useChannels(workspaceId);
  const { data: conversations } = useQuery({
    queryKey: ["dm-conversations", workspaceId],
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: allMembers } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = useCallback(
    (m: WorkspaceMember) =>
      mergeUserForDisplay(m as User, memberOverlayMap[m.id]),
    [memberOverlayMap],
  );

  const filteredResults = useMemo(() => {
    const query = debouncedSearch.trim();
    if (!query) return { channels: [], members: [], conversations: [] };

    let searchLower = query.toLowerCase();
    let filterType: "all" | "channel" | "member" = "all";

    if (searchLower.startsWith("#")) {
      filterType = "channel";
      searchLower = searchLower.slice(1).trim();
    } else if (searchLower.startsWith("@")) {
      filterType = "member";
      searchLower = searchLower.slice(1).trim();
    }

    const channelResults =
      filterType !== "member"
        ? channels?.filter(
            (ch) =>
              ch.name.toLowerCase().includes(searchLower) &&
              !selectedTargets.some((t) => t.id === ch.id && t.type === "channel"),
          ) ?? []
        : [];

    const memberResults =
      filterType !== "channel"
        ? allMembers?.filter((member) => {
            if (!isActiveWorkspaceMember(member)) return false;
            if (member.id === currentUser?.id) return false;
            if (
              selectedTargets.some((t) => t.id === member.id && t.type === "member")
            )
              return false;
            const d = mergeUserForDisplay(
              member as User,
              memberOverlayMap[member.id],
            );
            return (
              (d.name?.toLowerCase().includes(searchLower) ?? false) ||
              (d.displayName?.toLowerCase().includes(searchLower) ?? false) ||
              (d.email?.toLowerCase().includes(searchLower) ?? false)
            );
          }) ?? []
        : [];

    const conversationResults =
      filterType === "all"
        ? conversations?.filter((conv) => {
            if (!conv.isGroup) return false;
            if (
              selectedTargets.some(
                (t) => t.type === "conversation" && t.id === conv.id,
              )
            )
              return false;
            return conv.members.some((m) => {
              if (m.id === currentUser?.id) return false;
              const d = mergeUserForDisplay(
                m as User,
                memberOverlayMap[m.id],
              );
              return (
                (d.name?.toLowerCase().includes(searchLower) ?? false) ||
                (d.displayName?.toLowerCase().includes(searchLower) ?? false)
              );
            });
          }) ?? []
        : [];

    return {
      channels: channelResults,
      members: memberResults,
      conversations: conversationResults,
    };
  }, [
    debouncedSearch,
    channels,
    allMembers,
    conversations,
    currentUser?.id,
    selectedTargets,
    memberOverlayMap,
  ]);

  const handleSelect = useCallback(
    (
      type: "channel" | "member",
      data: Channel | WorkspaceMember,
    ) => {
      if (type === "channel") {
        const channel = data as Channel;
        setSelectedTargets((prev) => {
          if (prev.some((t) => t.id === channel.id && t.type === "channel")) {
            return prev;
          }
          return [
            ...prev,
            {
              id: channel.id,
              type: "channel",
              name: channel.name,
              data: channel,
            },
          ];
        });
      } else {
        const member = data as WorkspaceMember;
        const d = displayMember(member);
        setSelectedTargets((prev) => {
          if (prev.some((t) => t.id === member.id && t.type === "member")) {
            return prev;
          }
          return [
            ...prev,
            {
              id: member.id,
              type: "member",
              name: d.displayName || d.name || member.email,
              data: member,
            },
          ];
        });
      }
      setSearchQuery("");
    },
    [displayMember],
  );

  const handleSelectConversation = useCallback(
    (conv: DirectMessageConversation) => {
      const otherMembers = conv.members.filter((m) => m.id !== currentUser?.id);
      const label = `${otherMembers
        .map((m) => {
          const d = displayMember(m as WorkspaceMember);
          return getDmMemberDisplayName(d);
        })
        .join(", ")} (group)`;
      setSelectedTargets((prev) => {
        if (prev.some((t) => t.type === "conversation" && t.id === conv.id)) {
          return prev;
        }
        return [
          ...prev,
          { id: conv.id, type: "conversation", name: label, data: conv },
        ];
      });
      setSearchQuery("");
    },
    [currentUser?.id, displayMember],
  );

  const removeTarget = useCallback(
    (id: string, type: ForwardRecipientTargetType) => {
      setSelectedTargets((prev) =>
        prev.filter((t) => !(t.id === id && t.type === type)),
      );
    },
    [],
  );

  const reset = useCallback(() => {
    setSearchQuery("");
    setSelectedTargets([]);
    setIsSearchFocused(false);
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    selectedTargets,
    setSelectedTargets,
    filteredResults,
    handleSelect,
    handleSelectConversation,
    removeTarget,
    displayMember,
    reset,
    currentUserId: currentUser?.id,
    isSearchFocused,
    setIsSearchFocused,
  };
};
