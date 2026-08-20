/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import {
    MessageTargetChip,
    MessageTargetConversationChip,
    MessageTargetConversationRow,
    MessageTargetSearchRow
} from "@/components/message-target-picker";
import { TargetPickerField } from "@/components/target-picker-field";
import { useAuth } from "@/hooks/use-auth";
import { useChannels } from "@/hooks/use-channel";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { useDialogs } from "@/hooks/use-translation";
import type { Channel, DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CustomDialog, CustomDialogBody, CustomDialogFooter, CustomDialogHeader, CustomDialogTitle } from "../custom-dialog";
import { CustomSelect } from "../custom-select";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { Spinner } from "../ui/spinner";

function getDateOptions(t: ReturnType<typeof useDialogs>) {
  return [
  { label: t('filterFilesSearch.anyTime'), value: 'all-time' },
  { label: t('filterFilesSearch.today'), value: 'today' },
  { label: t('filterFilesSearch.yesterday'), value: 'yesterday' },
  { label: t('filterFilesSearch.last7Days'), value: 'last-7-days' },
  { label: t('filterFilesSearch.last30Days'), value: 'last-30-days' },
  { label: t('filterFilesSearch.last90Days'), value: 'last-90-days' },
  { label: t('filterFilesSearch.last180Days'), value: 'last-180-days' },
  { label: t('filterFilesSearch.last365Days'), value: 'last-365-days' },
]}

export interface FilterValues {
  userIds: string[];
  channelIds: string[];
  conversationIds: string[];
  dateRange: string;
}

interface FilterFilesSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  initialFilters: FilterValues;
  onApply: (filters: FilterValues) => void;
}

export default function FilterFilesSearchDialog({ 
  open, 
  onOpenChange, 
  workspaceId,
  initialFilters,
  onApply 
}: FilterFilesSearchDialogProps) {
  const t = useDialogs();
  const { user: currentUser } = useAuth();
  const [fromSearch, setFromSearch] = useState("");
  const [inSearch, setInSearch] = useState("");
  const debouncedFrom = useDebouncedValue(fromSearch, 300);
  const debouncedIn = useDebouncedValue(inSearch, 300);

  const [selectedMembers, setSelectedMembers] = useState<WorkspaceMember[]>([]);
  const [selectedChannels, setSelectedChannels] = useState<Channel[]>([]);
  const [selectedConversations, setSelectedConversations] = useState<DirectMessageConversation[]>([]);
  const [dateRange, setDateRange] = useState(initialFilters.dateRange);

  const [showFromResults, setShowFromResults] = useState(false);
  const [showInResults, setShowInResults] = useState(false);

  const fromRef = useRef<HTMLDivElement>(null);
  const inRef = useRef<HTMLDivElement>(null);

  // Data fetching
  const { data: channels = [], isLoading: isChannelsLoading } = useChannels(workspaceId);
  const { data: conversations = [], isLoading: isConversationsLoading } = useQuery({
    queryKey: ["dm-conversations", workspaceId],
    queryFn: () => fetchDirectMessagesApi(workspaceId),
    enabled: !!workspaceId,
  });
  const { data: allMembers = [], isLoading: isMembersLoading } = useQuery({
    queryKey: ["workspace-members", workspaceId],
    queryFn: () => fetchWorkspaceMembersApi(workspaceId),
    enabled: !!workspaceId,
  });

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[workspaceId] ?? {}),
  );

  const displayMember = (m: WorkspaceMember) =>
    mergeUserForDisplay(m as User, memberOverlayMap[m.id]);

  useEffect(() => {
    if (open) {
      setSelectedMembers(allMembers.filter((m) => initialFilters.userIds.includes(m.id)));
      setSelectedChannels(channels.filter((c) => initialFilters.channelIds.includes(c.id)));
      setSelectedConversations(conversations.filter((c) => initialFilters.conversationIds.includes(c.id)));
      setDateRange(initialFilters.dateRange);
    }
  }, [open, initialFilters, allMembers, channels, conversations]);

  const memberResults = useMemo(() => {
    const q = debouncedFrom.trim().toLowerCase();
    if (!q) return [];
    return allMembers?.filter(m => {
      const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
      return (
        (d.name?.toLowerCase().includes(q) || d.displayName?.toLowerCase().includes(q) || d.email?.toLowerCase().includes(q)) &&
        !selectedMembers.some(sm => sm.id === m.id)
      );
    }).slice(0, 5) || [];
  }, [debouncedFrom, allMembers, selectedMembers, memberOverlayMap]);

  const inResults = useMemo(() => {
    const q = debouncedIn.trim().toLowerCase();
    if (!q) return { channels: [], conversations: [] };
    
    const chs = channels?.filter(c => 
      c.name.toLowerCase().includes(q) && 
      !selectedChannels.some(sc => sc.id === c.id)
    ).slice(0, 5) || [];

    const convs = conversations?.filter(c => {
      if (selectedConversations.some(sc => sc.id === c.id)) return false;
      
        if (!c.isGroup) {
          const otherMember = c.members.find(m => m.id !== currentUser?.id);
          const d = otherMember
          ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
          : null;
        return (
          d?.name?.toLowerCase().includes(q) ||
          d?.displayName?.toLowerCase().includes(q)
        );
      }

      return c.members.some(m => {
        if (m.id === currentUser?.id) return false;
        const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
        return (
          d.name?.toLowerCase().includes(q) ||
          d.displayName?.toLowerCase().includes(q)
        );
      });
    }).slice(0, 5) || [];

    return { channels: chs, conversations: convs };
  }, [debouncedIn, channels, conversations, selectedChannels, selectedConversations, currentUser?.id, memberOverlayMap]);
  const handleApply = () => {
    onApply({
      userIds: selectedMembers.map(m => m.id),
      channelIds: selectedChannels.map(c => c.id),
      conversationIds: selectedConversations.map(c => c.id),
      dateRange
    });
    onOpenChange(false);
  };

  const handleClear = () => {
    setSelectedMembers([]);
    setSelectedChannels([]);
    setSelectedConversations([]);
    setDateRange('all-time');
    setFromSearch("");
    setInSearch("");
  };

  const isFromSettled = debouncedFrom.trim() === fromSearch.trim();
  const isInSettled = debouncedIn.trim() === inSearch.trim();
  const isFromQueryActive = fromSearch.trim().length > 0;
  const isInQueryActive = inSearch.trim().length > 0;
  const showFromDropdown = showFromResults && isFromQueryActive;
  const showInDropdown = showInResults && isInQueryActive;
  const showFromLoading = isFromQueryActive && !isFromSettled;
  const showInLoading = isInQueryActive && !isInSettled;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>{t('filterFilesSearch.title')}</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <div className="flex flex-col gap-4 py-2">
          {/* FROM FILTER */}
          <TargetPickerField
            label={t('filterFilesSearch.from')}
            fieldRef={fromRef}
            chips={
              <>
                {selectedMembers.map(member => {
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
              <input 
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-1 py-0.5"
                placeholder={t('filterFilesSearch.fromPlaceholder')}
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
                    memberResults.map(member => {
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

          {/* IN FILTER */}
          <TargetPickerField
            label={t('filterFilesSearch.in')}
            fieldRef={inRef}
            chips={
              <>
                {selectedChannels.map(ch => (
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
              {selectedConversations.map(conv => {
                const otherMember = !conv.isGroup 
                  ? conv.members.find(m => m.id !== currentUser?.id)
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
                        : (otherDisplay?.displayName || otherDisplay?.name || "Direct Message"),
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
              <input 
                className="flex-1 min-w-30 bg-transparent border-none outline-none text-sm px-1 py-0.5"
                placeholder={t('filterFilesSearch.inPlaceholder')}
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
                      {inResults.channels.map(ch => (
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
                      {inResults.conversations.map(conv => {
                        const otherMember = !conv.isGroup 
                          ? conv.members.find(m => m.id !== currentUser?.id)
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
                                : (otherDisplay?.displayName || otherDisplay?.name || "Direct Message"),
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

          {/* DATE FILTER */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-bold">{t('filterFilesSearch.date')}</Label>
            <CustomSelect 
              options={getDateOptions(t)} 
              value={dateRange}
              onChange={(val) => setDateRange(val)}
            />
          </div>
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="gap-2">
        <Button variant="outline" onClick={handleClear}>Clear filters</Button>
        <Button variant="success" onClick={handleApply}>Done</Button>
      </CustomDialogFooter>
    </CustomDialog>
  )
}
