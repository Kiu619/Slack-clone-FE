"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FiSearch, FiX } from "react-icons/fi";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  fetchDirectMessagesApi,
  fetchWorkspaceMembersApi,
  getOrCreateDirectMessageApi,
} from "@/apis";
import { useChannels } from "@/hooks/use-channel";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounce";
import MessageTab from "@/components/header-tabs/message-tab";
import type { Channel, DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import {
  NEW_MSG_RESTORE_CHANNEL_KEY,
  NEW_MSG_RESTORE_DM_KEY,
} from "@/lib/message-drafts";
import { useNewMessageStore } from "@/stores/useNewMessageStore";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";

type TargetType = "channel" | "member";

interface SelectedTarget {
  id: string;
  type: TargetType;
  name: string;
  data: Channel | WorkspaceMember;
}

interface NewMessageComposerProps {
  workspaceId: string;
}

export default function NewMessageComposer({ workspaceId }: NewMessageComposerProps) {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const closeNewMessage = useNewMessageStore(s => s.closeNewMessage);

  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebouncedValue(searchQuery, 300);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedTargets, setSelectedTargets] = useState<SelectedTarget[]>([]);
  const [conversation, setConversation] = useState<DirectMessageConversation | null>(null);
  const [isEnsuringDm, setIsEnsuringDm] = useState(false);
  const [ensureError, setEnsureError] = useState<string | null>(null);
  const [ensureRetryNonce, setEnsureRetryNonce] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const restorePrefillRef = useRef(false);

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

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  const filteredResults = useMemo(() => {
    const query = debouncedSearch.trim();
    if (!query) return { channels: [], members: [], conversations: [] };

    let searchLower = query.toLowerCase();
    let filterType: "all" | "channel" | "member" = "all";

    if (searchLower.startsWith("#")) {
      filterType = "channel";
      searchLower = searchLower.substring(1).trim();
    } else if (searchLower.startsWith("@")) {
      filterType = "member";
      searchLower = searchLower.substring(1).trim();
    }

    const channelResults = filterType !== "member" 
      ? channels?.filter(ch => 
          ch.name.toLowerCase().includes(searchLower) && 
          !selectedTargets.some(t => t.id === ch.id && t.type === "channel")
        ) || []
      : [];

    // Nếu đã chọn channel, không gợi ý thêm member hoặc conversation khác
    const hasSelectedChannel = selectedTargets.some(t => t.type === "channel");

    const memberResults = (filterType !== "channel" && !hasSelectedChannel)
      ? allMembers?.filter(member => {
          if (member.id === currentUser?.id) return false;
          if (selectedTargets.some(t => t.id === member.id && t.type === "member")) return false;
          const d = mergeUserForDisplay(member as User, memberOverlayMap[member.id]);
          return (
            (d.name?.toLowerCase().includes(searchLower)) ||
            (d.displayName?.toLowerCase().includes(searchLower)) ||
            (d.email?.toLowerCase().includes(searchLower))
          );
        }) || []
      : [];

    // Search trong Group DMs
    const conversationResults = (filterType === "all" && !hasSelectedChannel)
      ? conversations?.filter(conv => {
          if (!conv.isGroup) return false;
          // Search theo tên các thành viên trong group
          return conv.members.some(m => {
            if (m.id === currentUser?.id) return false;
            const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
            return (
              d.name?.toLowerCase().includes(searchLower) ||
              d.displayName?.toLowerCase().includes(searchLower)
            );
          });
        }) || []
      : [];

    return {
      channels: channelResults,
      members: memberResults,
      conversations: conversationResults
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

  const memberOnlySelection = useMemo(
    () => selectedTargets.length > 0 && selectedTargets.every(t => t.type === "member"),
    [selectedTargets],
  );

  const sortedOtherMemberIdsKey = useMemo(() => {
    if (!memberOnlySelection) return "";
    return [...selectedTargets.map(t => t.id)].sort().join(",");
  }, [memberOnlySelection, selectedTargets]);

  const existingConvByMembers = useMemo(() => {
    if (!memberOnlySelection || !currentUser?.id || conversations == null) return null;
    const targetUserIds = selectedTargets.map(t => t.id);
    const allTargetIds = [currentUser.id, ...targetUserIds];
    return (
      conversations.find(conv => {
        if (conv.members.length !== allTargetIds.length) return false;
        const convMemberIds = conv.members.map(m => m.id);
        return allTargetIds.every(id => convMemberIds.includes(id));
      }) ?? null
    );
  }, [memberOnlySelection, selectedTargets, currentUser?.id, conversations]);

  useEffect(() => {
    if (!memberOnlySelection || !sortedOtherMemberIdsKey || !currentUser?.id) return;
    setConversation(prev => {
      if (!prev?.id) return prev;
      const expected = sortedOtherMemberIdsKey.split(",").filter(Boolean).sort().join(",");
      const got = prev.members
        .filter(m => m.id !== currentUser.id)
        .map(m => m.id)
        .sort()
        .join(",");
      return expected !== got ? null : prev;
    });
  }, [memberOnlySelection, sortedOtherMemberIdsKey, currentUser?.id]);

  useEffect(() => {
    setEnsureError(null);

    if (selectedTargets.length === 0 || selectedTargets.some(t => t.type === "channel")) {
      setConversation(null);
      setIsEnsuringDm(false);
      return;
    }

    if (existingConvByMembers) {
      setConversation(existingConvByMembers);
      setIsEnsuringDm(false);
      return;
    }

    const otherIds = sortedOtherMemberIdsKey.split(",").filter(Boolean);
    if (otherIds.length === 0 || !currentUser?.id) {
      setConversation(null);
      setIsEnsuringDm(false);
      return;
    }

    let cancelled = false;
    setIsEnsuringDm(true);

    void (async () => {
      try {
        const conv = await getOrCreateDirectMessageApi(workspaceId, otherIds);
        if (cancelled) return;
        setConversation(conv);
        await queryClient.invalidateQueries({ queryKey: ["dm-conversations", workspaceId] });
      } catch (err: unknown) {
        if (cancelled) return;
        setConversation(null);
        const msg =
          err &&
          typeof err === "object" &&
          "response" in err &&
          (err as { response?: { data?: { message?: string } } }).response?.data?.message
            ? String((err as { response: { data?: { message?: string } } }).response.data?.message)
            : "";
        toast.error(msg || "Không thể tạo cuộc trò chuyện");
        setEnsureError(msg || "ensure_failed");
      } finally {
        if (!cancelled) setIsEnsuringDm(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sortedOtherMemberIdsKey + existingConvByMembers?.id thay selectedTargets/conversations
  }, [
    workspaceId,
    currentUser?.id,
    sortedOtherMemberIdsKey,
    existingConvByMembers?.id,
    ensureRetryNonce,
    queryClient,
  ]);

  const handleSelectConversation = (conv: DirectMessageConversation) => {
    // Khi chọn một Group DM có sẵn, ta lưu nó vào state để MessageTab có thể dùng ngay
    setConversation(conv);
    
    // Tạo danh sách các tag member từ group đó
    const otherMembers = conv.members.filter(m => m.id !== currentUser?.id);
    const newTargets: SelectedTarget[] = otherMembers.map(m => {
      const d = displayMember(m as WorkspaceMember);
      return {
        id: m.id,
        type: "member" as const,
        name: d.displayName || d.name || m.email,
        data: m as WorkspaceMember,
      };
    });

    setSelectedTargets(newTargets);
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const handleSelect = (type: TargetType, data: Channel | WorkspaceMember) => {
    if (type === "channel") {
      // Nếu chọn channel, thay thế toàn bộ danh sách hiện tại bằng duy nhất channel này
      const channel = data as Channel;
      const newTarget: SelectedTarget = {
        id: channel.id,
        type: "channel",
        name: channel.name,
        data: channel
      };
      setSelectedTargets([newTarget]);
    } else {
      // Nếu chọn member:
      // 1. Nếu trước đó đang chọn channel -> xóa channel đi để bắt đầu chọn member
      // 2. Nếu đang chọn member -> thêm vào danh sách (tối đa 3 người khác)
      const member = data as WorkspaceMember;
      const d = displayMember(member);
      const newTarget: SelectedTarget = {
        id: member.id,
        type: "member",
        name: d.displayName || d.name || member.email,
        data: member,
      };

      setSelectedTargets(prev => {
        const isPrevChannel = prev.length === 1 && prev[0].type === "channel";
        if (isPrevChannel) {
          return [newTarget];
        }
        
        // Giới hạn tối đa 3 người khác
        if (prev.length >= 3) {
          return prev;
        }

        return [...prev, newTarget];
      });
    }
    
    setSearchQuery("");
    setIsSearchFocused(false);
  };

  const removeTarget = (id: string, type: TargetType) => {
    setSelectedTargets(prev => prev.filter(t => !(t.id === id && t.type === type)));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  /** Mở draft "Soạn mới" từ trang Drafts — chọn sẵn channel hoặc DM */
  useEffect(() => {
    if (restorePrefillRef.current) return;
    if (typeof window === "undefined") return;

    const rid = sessionStorage.getItem(NEW_MSG_RESTORE_DM_KEY);
    if (rid && (conversations?.length ?? 0) > 0) {
      const conv = conversations!.find((c) => c.id === rid);
      if (conv) {
        sessionStorage.removeItem(NEW_MSG_RESTORE_DM_KEY);
        restorePrefillRef.current = true;
        const otherMembers = conv.members.filter((m) => m.id !== currentUser?.id);
        const newTargets: SelectedTarget[] = otherMembers.map((m) => {
          const d = displayMember(m as WorkspaceMember);
          return {
            id: m.id,
            type: "member" as const,
            name: d.displayName || d.name || m.email,
            data: m as WorkspaceMember,
          };
        });
        setConversation(conv);
        setSelectedTargets(newTargets);
        return;
      }
    }

    const cid = sessionStorage.getItem(NEW_MSG_RESTORE_CHANNEL_KEY);
    if (cid && (channels?.length ?? 0) > 0) {
      const ch = channels!.find((c) => c.id === cid);
      if (ch) {
        sessionStorage.removeItem(NEW_MSG_RESTORE_CHANNEL_KEY);
        restorePrefillRef.current = true;
        setSelectedTargets([
          {
            id: ch.id,
            type: "channel",
            name: ch.name,
            data: ch,
          },
        ]);
      }
    }
  }, [channels, conversations, currentUser?.id]);

  // Xác định dữ liệu truyền vào MessageTab
  const firstTarget = selectedTargets[0];
  const displayChannel = firstTarget?.type === "channel" ? (firstTarget.data as Channel) : undefined;

  const displayConversation = useMemo(() => {
    if (displayChannel) return undefined;
    if (conversation?.id) return conversation;
    return undefined;
  }, [displayChannel, conversation]);

  const showDmEnsureLoading =
    memberOnlySelection && !displayChannel && isEnsuringDm && !conversation?.id;
  const showDmEnsureError =
    memberOnlySelection && !displayChannel && ensureError && !conversation?.id && !isEnsuringDm;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A1D21]">
      {/* Header / Search Area */}
      <div className="px-4 py-3 border-b border-[#797c814d] flex flex-col gap-y-2">
        <div className="flex items-center justify-between">
          <span className="text-lg font-bold">New message</span>
          <button 
            onClick={closeNewMessage}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            <FiX size={20} className="text-gray-500" />
          </button>
        </div>
        
        <div className="flex items-center gap-x-2 relative" ref={searchRef}>
          <span className="text-sm text-gray-400 shrink-0">To:</span>
          
          <div className="flex-1 flex flex-wrap gap-1 items-center min-h-[36px] p-1 rounded-md border border-[#797c814d] bg-white/5 focus-within:ring-1 focus-within:ring-sky-500">
            {selectedTargets.map(target => {
              const chipLabel =
                target.type === "member"
                  ? (() => {
                      const m = target.data as WorkspaceMember;
                      const d = displayMember(m);
                      return d.displayName || d.name || m.email;
                    })()
                  : target.name;
              return (
              <div key={`${target.type}-${target.id}`} className="flex items-center gap-x-1 bg-sky-500/20 text-sky-500 px-2 py-0.5 rounded text-sm font-medium">
                <span>{target.type === "channel" ? "#" : "@"} {chipLabel}</span>
                <button onClick={() => removeTarget(target.id, target.type)} className="hover:text-sky-400">
                  <FiX size={14} />
                </button>
              </div>
            );
            })}
            
            <input
              className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-2 py-1 placeholder:text-gray-500"
              placeholder="#a-channel, @somebody, or somebody@example.com"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              autoFocus
            />
          </div>

          {/* Search Dropdown */}
          {isSearchFocused && searchQuery.trim() && (
            <div className="absolute top-full left-8 right-0 mt-1 bg-[#1A1D21] border border-[#797c814d] rounded-md shadow-lg max-h-[300px] overflow-y-auto z-50 py-1">
              {filteredResults.channels.length === 0 && 
               filteredResults.members.length === 0 && 
               filteredResults.conversations.length === 0 && (
                <div className="px-4 py-2 text-sm text-gray-400">No results found</div>
              )}

              {filteredResults.conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => handleSelectConversation(conv)}
                  className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                >
                  <div className="size-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold relative">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarFallback className="bg-green-600 text-white rounded-lg text-xs">
                        {conv.members.length}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">
                      {conv.members
                        .filter(m => m.id !== currentUser?.id)
                        .map(m => {
                          const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
                          return d.displayName || d.name || "";
                        })
                        .join(", ")}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-sky-100 truncate">
                      Group DM
                    </span>
                  </div>
                </div>
              ))}

              {filteredResults.channels.map((ch) => (
                <div
                  key={ch.id}
                  onClick={() => handleSelect("channel", ch)}
                  className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                >
                  <div className="size-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold">
                    #
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">
                      {ch.name}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-sky-100 truncate">
                      Channel
                    </span>
                  </div>
                </div>
              ))}

              {filteredResults.members.map((member) => {
                const d = displayMember(member);
                return (
                <div
                  key={member.id}
                  onClick={() => handleSelect("member", member)}
                  className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                >
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={d.avatar || ""} />
                    <AvatarFallback className="bg-sky-500 text-white rounded-lg text-xs">
                      {(d.displayName || d.name || "U").substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">
                      {d.displayName || d.name}
                    </span>
                    <span className="text-xs text-gray-400 group-hover:text-sky-100 truncate">
                      {member.email}
                    </span>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {showDmEnsureError ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-4 text-center">
            <p className="text-sm text-[#616061] dark:text-[#ababad]">
              Không thể mở cuộc trò chuyện. Kiểm tra kết nối hoặc thử lại.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setEnsureRetryNonce(n => n + 1)}
            >
              Thử lại
            </Button>
          </div>
        ) : showDmEnsureLoading ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4">
            <div className="size-8 animate-spin rounded-full border-2 border-sky-500 border-t-transparent" />
            <p className="text-sm text-[#616061] dark:text-[#ababad]">Đang mở cuộc trò chuyện…</p>
          </div>
        ) : displayChannel || displayConversation ? (
          <MessageTab
            currentChannelData={displayChannel}
            currentConversationData={displayConversation || undefined}
            isNewMessageMode={true}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center px-4">
            <div className="size-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
              <FiSearch size={32} className="text-gray-400" />
            </div>
            <h3 className="text-xl font-bold mb-2">New message</h3>
            <p className="text-gray-500 max-w-sm">
              Search for a person or channel to start a conversation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
