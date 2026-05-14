"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { CustomDialog, CustomDialogBody, CustomDialogHeader, CustomDialogFooter, CustomDialogTitle } from "../custom-dialog"
import { CustomSelect } from "../custom-select"
import { Button } from "../ui/button"
import { Input } from "../ui/input"
import { Label } from "../ui/label"
import { useQuery } from "@tanstack/react-query";
import { fetchDirectMessagesApi, fetchWorkspaceMembersApi } from "@/apis";
import { useChannels } from "@/hooks/use-channel";
import { useAuth } from "@/hooks/use-auth";
import { useDebouncedValue } from "@/hooks/use-debounce";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { FiX } from "react-icons/fi";
import { useShallow } from "zustand/react/shallow";
import type { Channel, DirectMessageConversation, User, WorkspaceMember } from "@/lib/types";
import { mergeUserForDisplay, useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";

const dateOptions = [
  { label: 'Any time', value: 'all-time' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Last 7 days', value: 'last-7-days' },
  { label: 'Last 30 days', value: 'last-30-days' },
  { label: 'Last 90 days', value: 'last-90-days' },
  { label: 'Last 180 days', value: 'last-180-days' },
  { label: 'Last 365 days', value: 'last-365-days' },
]

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

  // Sync initial filters
  useEffect(() => {
    if (open) {
      if (allMembers) {
        setSelectedMembers(allMembers.filter(m => initialFilters.userIds.includes(m.id)));
      }
      if (channels) {
        setSelectedChannels(channels.filter(c => initialFilters.channelIds.includes(c.id)));
      }
      if (conversations) {
        setSelectedConversations(conversations.filter(c => initialFilters.conversationIds.includes(c.id)));
      }
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
      
      // Nếu là DM 1-1, kiểm tra tên của người kia
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

      // Nếu là Group DM, kiểm tra tên các thành viên trong group
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

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange}>
      <CustomDialogHeader onOpenChange={onOpenChange}>
        <CustomDialogTitle>Filter by</CustomDialogTitle>
      </CustomDialogHeader>
      <CustomDialogBody>
        <div className="flex flex-col gap-4 py-2">
          {/* FROM FILTER */}
          <div className="flex flex-col gap-1.5 relative" ref={fromRef}>
            <Label className="text-[13px] font-bold">From</Label>
            <div className="flex flex-wrap gap-1 p-1.5 rounded-md border border-[#797c814d] bg-white dark:bg-[#1A1D21] focus-within:ring-1 focus-within:ring-sky-500">
              {selectedMembers.map(member => {
                const d = displayMember(member);
                return (
                <div key={member.id} className="flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded text-sm font-medium">
                  <span>{d.displayName || d.name}</span>
                  <button onClick={() => setSelectedMembers(prev => prev.filter(m => m.id !== member.id))} className="hover:opacity-70">
                    <FiX size={14} />
                  </button>
                </div>
                );
              })}
              <input 
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-1 py-0.5"
                placeholder="ex. Zoe Maxwell"
                value={fromSearch}
                onChange={(e) => {
                  setFromSearch(e.target.value);
                  setShowFromResults(true);
                }}
                onFocus={() => setShowFromResults(true)}
              />
            </div>
            
            {showFromResults && memberResults.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1D21] border border-[#797c814d] rounded-md shadow-lg z-50 py-1 overflow-y-auto max-h-[250px]">
                {memberResults.map(member => {
                  const d = displayMember(member);
                  return (
                  <div 
                    key={member.id}
                    className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                    onClick={() => {
                      setSelectedMembers(prev => [...prev, member]);
                      setFromSearch("");
                      setShowFromResults(false);
                    }}
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

          {/* IN FILTER */}
          <div className="flex flex-col gap-1.5 relative" ref={inRef}>
            <Label className="text-[13px] font-bold">In</Label>
            <div className="flex flex-wrap gap-1 p-1.5 rounded-md border border-[#797c814d] bg-white dark:bg-[#1A1D21] focus-within:ring-1 focus-within:ring-sky-500">
              {selectedChannels.map(ch => (
                <div key={ch.id} className="flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded text-sm font-medium">
                  <span># {ch.name}</span>
                  <button onClick={() => setSelectedChannels(prev => prev.filter(c => c.id !== ch.id))} className="hover:opacity-70">
                    <FiX size={14} />
                  </button>
                </div>
              ))}
              {selectedConversations.map(conv => {
                const otherMember = !conv.isGroup 
                  ? conv.members.find(m => m.id !== currentUser?.id)
                  : null;
                const otherDisplay = otherMember
                  ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
                  : null;

                return (
                  <div key={conv.id} className="flex items-center gap-1 bg-sky-500/10 text-sky-600 dark:text-sky-400 px-2 py-0.5 rounded text-sm font-medium">
                    {!conv.isGroup && (
                      <Avatar className="size-4 rounded-sm shrink-0">
                        <AvatarImage src={otherDisplay?.avatar || ""} />
                        <AvatarFallback className="text-[8px]">
                          {(otherDisplay?.displayName || otherDisplay?.name || "U").substring(0, 1).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    )}
                    <span>
                      {conv.isGroup 
                        ? "Group DM" 
                        : (otherDisplay?.displayName || otherDisplay?.name || "Direct Message")
                      }
                    </span>
                    <button onClick={() => setSelectedConversations(prev => prev.filter(c => c.id !== conv.id))} className="hover:opacity-70">
                      <FiX size={14} />
                    </button>
                  </div>
                );
              })}
              <input 
                className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm px-1 py-0.5"
                placeholder="ex. #project-unicorn"
                value={inSearch}
                onChange={(e) => {
                  setInSearch(e.target.value);
                  setShowInResults(true);
                }}
                onFocus={() => setShowInResults(true)}
              />
            </div>

            {showInResults && (inResults.channels.length > 0 || inResults.conversations.length > 0) && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-[#1A1D21] border border-[#797c814d] rounded-md shadow-lg z-50 py-1 overflow-y-auto max-h-[250px]">
                {inResults.channels.map(ch => (
                  <div 
                    key={ch.id}
                    className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                    onClick={() => {
                      setSelectedChannels(prev => [...prev, ch]);
                      setInSearch("");
                      setShowInResults(false);
                    }}
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
                {inResults.conversations.map(conv => {
                  const otherMember = !conv.isGroup 
                    ? conv.members.find(m => m.id !== currentUser?.id)
                    : null;
                  const otherDisplay = otherMember
                    ? mergeUserForDisplay(otherMember as User, memberOverlayMap[otherMember.id])
                    : null;
                  
                  return (
                    <div 
                      key={conv.id}
                      className="flex items-center gap-x-2 px-3 py-2 hover:bg-sky-600 cursor-pointer group"
                      onClick={() => {
                        setSelectedConversations(prev => [...prev, conv]);
                        setInSearch("");
                        setShowInResults(false);
                      }}
                    >
                      {conv.isGroup ? (
                        <div className="size-8 rounded-lg bg-gray-700 flex items-center justify-center text-white font-bold relative shrink-0">
                          <Avatar className="size-8 rounded-lg">
                            <AvatarFallback className="bg-green-600 text-white rounded-lg text-xs">
                              {conv.members.length}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                      ) : (
                        <Avatar className="size-8 rounded-lg shrink-0">
                          <AvatarImage src={otherDisplay?.avatar || ""} />
                          <AvatarFallback className="bg-sky-500 text-white rounded-lg text-xs">
                            {(otherDisplay?.displayName || otherDisplay?.name || "U").substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                      )}
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate">
                          {conv.isGroup 
                            ? conv.members.filter(m => m.id !== currentUser?.id).map(m => {
                                const d = mergeUserForDisplay(m as User, memberOverlayMap[m.id]);
                                return d.displayName || d.name || "";
                              }).join(", ")
                            : (otherDisplay?.displayName || otherDisplay?.name)}
                        </span>
                        <span className="text-xs text-gray-400 group-hover:text-sky-100 truncate">
                          {conv.isGroup ? "Group DM" : "Direct Message"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* DATE FILTER */}
          <div className="flex flex-col gap-1.5">
            <Label className="text-[13px] font-bold">Date</Label>
            <CustomSelect 
              options={dateOptions} 
              value={dateRange}
              onChange={(val) => setDateRange(val)}
            />
          </div>
        </div>
      </CustomDialogBody>

      <CustomDialogFooter className="gap-2">
        <Button variant="ghost" onClick={handleClear}>Clear filters</Button>
        <Button variant="success" onClick={handleApply}>Done</Button>
      </CustomDialogFooter>
    </CustomDialog>
  )
}
