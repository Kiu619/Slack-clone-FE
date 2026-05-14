"use client";

import { useState } from "react";

import { Theme } from "@/stores/useThemeStore";
import Setting from "../workspace/workspace-side-panel/setting";
import { Notification, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import Typography from "@/components/ui/typography";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { IoChevronDownOutline, IoFilter } from "react-icons/io5";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { RiNotificationBadgeLine } from "react-icons/ri";
import { ChevronDown, Loader2 } from "lucide-react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getNotificationsApi, markAsReadApi, markAllAsReadApi } from "@/apis";
import NotificationItem from "@/components/notification-item";
import { Virtuoso } from "react-virtuoso";
import { useMemo, useCallback } from "react";
import { MdDoneAll, MdClearAll } from "react-icons/md";
import { useMainPanelStore } from "@/stores/useMainPanelStore";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";

export type ActivityViewTab = "all" | "dms" | "mentions" | "threads";

const SUBMENU_ITEM_STYLE =
  "group flex items-center gap-2 hover:bg-selection-hover hover:text-white cursor-pointer px-2 py-1";

const FILTER_ITEM = [
  {
    id: "mentions",
    name: "Mentions",
    checked: false,
  },
  {
    id: "threads",
    name: "Threads",
    checked: false,
  },
  {
    id: "reactions",
    name: "Reactions",
    checked: false,
  },
  {
    id: "invitations",
    name: "Invitations",
    checked: false,
  },
  // {
  //   id: "channel-set-to-all-new-post",
  //   name: `Channel set to "all new post"`,
  //   checked: false,
  // },
]

export default function ActivitySidePanel({
  theme,
  currentWorkspaceData,
}: {
  theme: Theme;
  currentWorkspaceData: Workspace;
}) {
  const [activeTab, setActiveTab] = useState<ActivityViewTab>("all");
  const [openFilters, setOpenFilters] = useState(false);
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [showUnreadsOnly, setShowUnreadsOnly] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const setFocusedMessageId = useMessageFocusStore(
      (s) => s.setFocusedMessageId,
    );

  const queryClient = useQueryClient();

  const {
    data: notificationsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["notifications", currentWorkspaceData.id],
    queryFn: ({ pageParam }) =>
      getNotificationsApi(currentWorkspaceData.id, 20, pageParam),
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    initialPageParam: undefined as string | undefined,
    enabled: !!currentWorkspaceData.id,
  });

  const markAsReadMutation = useMutation({
    mutationFn: (id: string) => markAsReadApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllAsReadMutation = useMutation({
    mutationFn: () => markAllAsReadApi(currentWorkspaceData.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const allNotifications = useMemo(() => {
    return notificationsData?.pages.flatMap((page) => page.items) ?? [];
  }, [notificationsData]);

  const filteredNotifications = useMemo(() => {
    return allNotifications.filter((notif) => {
      // 0. Filter by Unreads Only
      if (showUnreadsOnly && notif.isRead) return false;

      // 1. Filter by Tab
      let matchesTab = true;
      if (activeTab === "dms") matchesTab = notif.type === "dm";
      else if (activeTab === "mentions") matchesTab = notif.type === "mention";
      else if (activeTab === "threads") matchesTab = notif.type === "reply";

      if (!matchesTab) return false;

      // 2. Filter by Selected Filters (Popover)
      if (selectedFilters.length > 0) {
        // Map filter IDs to notification types
        const typeMap: Record<string, string> = {
          dms: "dm",
          mentions: "mention",
          threads: "reply",
          reactions: "reaction",
          invitations: "channel_invite",
        };

        // If any selected filter matches the notification type, keep it
        const matchesFilter = selectedFilters.some((fId) => {
          const targetType = typeMap[fId];
          return targetType === notif.type;
        });

        if (!matchesFilter) return false;
      }

      return true;
    });
  }, [allNotifications, activeTab, selectedFilters, showUnreadsOnly]);

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  }, [selectedIds, filteredNotifications]);

  const handleSelect = useCallback((id: string, selected: boolean) => {
    setSelectedIds((prev) =>
      selected ? [...prev, id] : prev.filter((i) => i !== id)
    );
  }, []);

  const handleMarkSelectedAsRead = async () => {
    if (selectedIds.length === 0) return;

    // Nếu chọn tất cả và đang ở tab All, dùng API mark all cho nhanh
    if (selectedIds.length === allNotifications.length && activeTab === 'all' && !showUnreadsOnly && selectedFilters.length === 0) {
      await markAllAsReadMutation.mutateAsync();
    } else {
      // Ngược lại thì loop qua từng cái (Backend hiện tại chỉ có mark 1 hoặc mark all workspace)
      // Tối ưu: Backend nên có API mark bulk
      await Promise.all(selectedIds.map(id => markAsReadApi(id)));
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    }
    setSelectedIds([]);
  };

  const handleSelectByType = (type: 'all' | 'reads' | 'unreads') => {
    let toSelect: string[] = [];
    if (type === 'all') {
      toSelect = filteredNotifications.map(n => n.id);
    } else if (type === 'reads') {
      toSelect = filteredNotifications.filter(n => n.isRead).map(n => n.id);
    } else if (type === 'unreads') {
      toSelect = filteredNotifications.filter(n => !n.isRead).map(n => n.id);
    }
    setSelectedIds(toSelect);
  };

  const { setView } = useMainPanelStore();

  const handleNotificationClick = (notif: Notification) => {
    // 1. Mark as read
    if (!notif.isRead) {
      markAsReadMutation.mutate(notif.id);
    }

    // 2. Điều hướng đến channel hoặc DM tương ứng trong main area
    if (
      (notif.type === "mention" ||
        notif.type === "reply" ||
        notif.type === "reaction") &&
      notif.channelId
    ) {
      setView({ type: "channel", channelId: notif.channelId });
      setFocusedMessageId(notif.messageId);
    } else if (notif.type === "dm" && notif.conversationId) {
      setView({ type: "dm", conversationId: notif.conversationId });
      setFocusedMessageId(notif.messageId);
    }
  };

  const toggleFilter = (filterId: string) => {
    setSelectedFilters((prev) =>
      prev.includes(filterId)
        ? prev.filter((id) => id !== filterId)
        : [...prev, filterId]
    );
  };

  return (
    <>
      <div className="flex justify-between items-center">
        <span className="text-lg font-extrabold text-workspace-side-panel-text">
          Activity
        </span>
        <Setting />
      </div>

      <div className="flex items-center gap-x-1 mx-2 border-b border-transparent">
        <button
          type="button"
          onClick={() => setActiveTab("all")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md",
            activeTab === "all"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "all"
              ? {
                borderColor: theme.selectedItems,
                borderBottomWidth: 3,
                color: theme.selectedItems,
              }
              : {}
          }
        >
          <Typography text="All" variant="p" className="text-[13px] font-semibold" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("dms")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "dms"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "dms"
              ? {
                borderColor: theme.selectedItems,
                borderBottomWidth: 3,
                color: theme.selectedItems,
              }
              : {}
          }
        >
          <Typography text="DMs" variant="p" className="text-[13px] font-semibold" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("mentions")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "mentions"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "mentions"
              ? {
                borderColor: theme.selectedItems,
                borderBottomWidth: 3,
                color: theme.selectedItems,
              }
              : {}
          }
        >
          <Typography text="Mentions" variant="p" className="text-[13px] font-semibold" />
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("threads")}
          className={cn(
            "flex items-center gap-1.5 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
            activeTab === "threads"
              ? ``
              : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
          )}
          style={
            activeTab === "threads"
              ? {
                borderColor: theme.selectedItems,
                borderBottomWidth: 3,
                color: theme.selectedItems,
              }
              : {}
          }
        >
          <Typography text="Threads" variant="p" className="text-[13px] font-semibold" />
        </button>
      </div>

      <div className="flex items-center gap-2 mt-2">
        <div className="flex items-center rounded-md border border-[#797c814d]">
          <Checkbox
            id="select-all-checkbox"
            name="select-all-checkbox"
            checked={selectedIds.length > 0 && selectedIds.length === filteredNotifications.length}
            onCheckedChange={toggleSelectAll}
            className="size-4 m-1 border-[#797c814d]"
          />

          <span className="h-4 w-px bg-[#797c814d]"></span>

          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <button className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] px-2 py-1 rounded-r-md">
                    <IoChevronDownOutline size={16} />
                  </button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" align="center">
                <Typography
                  text="More options"
                  variant="p"
                  className="text-[14px]!"
                />
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              withOverlay={true}
              side="bottom"
              align="start"
              sideOffset={8}
              className="py-2"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              <Button variant="submenu" onClick={() => handleSelectByType('all')}>
                <Typography variant="p" text="Select all" />
              </Button>
              <Button variant="submenu" onClick={() => handleSelectByType('reads')}>
                <Typography variant="p" text="Select reads" />
              </Button>
              <Button variant="submenu" onClick={() => handleSelectByType('unreads')}>
                <Typography variant="p" text="Select unreads" />
              </Button>
              <Button variant="submenu">
                <Typography variant="p" text="Custom select" />
              </Button>
            </PopoverContent>
          </Popover>
        </div>

        {selectedIds.length > 0 ? (
          <div className="flex items-center gap-x-2 animate-in fade-in slide-in-from-left-2 duration-200">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 flex items-center gap-x-1.5 border-[#797c814d]"
              onClick={handleMarkSelectedAsRead}
              disabled={markAsReadMutation.isPending || markAllAsReadMutation.isPending}
            >
              <MdDoneAll size={16} className="text-blue-500" />
              <Typography variant="p" className="text-[12px] font-medium" text="Mark selected as read" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-2 flex items-center gap-x-1.5 border-[#797c814d]"
              onClick={() => setSelectedIds([])}
            >
              <MdClearAll size={16} className="text-muted-foreground" />
              <Typography variant="p" className="text-[12px] font-medium" text="Clear selected" />
            </Button>
            <Typography variant="p" className="text-[12px] text-muted-foreground ml-1" text={`${selectedIds.length} selected`} />
          </div>
        ) : (
          <>
            <Button
              variant="outline"
              className={cn(
                "p-1 p rounded-md bg-transparent",
                showUnreadsOnly && "bg-selection-hover/10 border-blue-500"
              )}
              onClick={() => setShowUnreadsOnly(!showUnreadsOnly)}
            >
              <RiNotificationBadgeLine size={13} className={cn(showUnreadsOnly && "text-blue-500")} />
              <Typography variant="p" className={cn("text-[13px]", showUnreadsOnly && "text-blue-500")} text="Unreads" />
            </Button>

            <Popover open={openFilters} onOpenChange={setOpenFilters}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="p-1 p rounded-md bg-transparent"
                >
                  <IoFilter size={13} />
                  <Typography variant="p" className="text-[13px]" text="Filters" />
                  <ChevronDown
                    size={13}
                    className={cn(
                      "transition-transform duration-200",
                      openFilters ? "rotate-180" : "rotate-0",
                    )}
                  />
                </Button>
              </PopoverTrigger>
              <PopoverContent
                withOverlay={true}
                side="bottom"
                align="start"
                sideOffset={8}
                className="py-2"
                onOpenAutoFocus={(e) => e.preventDefault()}
              >
                <Typography
                  variant="p"
                  text="Filter by:"
                  className=" font-semibold px-2 py-1"
                />
                {FILTER_ITEM.map((item) => (
                  <div
                    className={SUBMENU_ITEM_STYLE}
                    key={item.id}
                    onClick={() => toggleFilter(item.id)}
                  >
                    <Checkbox
                      id={item.id}
                      name={item.id}
                      checked={selectedFilters.includes(item.id)}
                      onCheckedChange={() => toggleFilter(item.id)}
                      className="size-4 m-1 border-[#797c814d] group-hover:border-white"
                    />
                    <Typography variant="p" text={item.name} />
                  </div>
                ))}
              </PopoverContent>
            </Popover>
          </>
        )}
      </div>

      <div className="flex-1 mt-4 -mx-4 px-4 overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 gap-y-2">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
            <Typography
              variant="p"
              className="text-sm text-muted-foreground"
              text="Loading activity..."
            />
          </div>
        ) : filteredNotifications && filteredNotifications.length > 0 ? (
          <Virtuoso
            style={{ height: "100%" }}
            data={filteredNotifications}
            endReached={() => {
              if (hasNextPage && !isFetchingNextPage) {
                fetchNextPage();
              }
            }}
            itemContent={(index, notif) => (
              <NotificationItem
                key={notif.id}
                notification={notif}
                isSelected={selectedIds.includes(notif.id)}
                onSelect={handleSelect}
                onClick={handleNotificationClick}
              />
            )}
            components={{
              Footer: () =>
                isFetchingNextPage ? (
                  <div className="flex justify-center p-4">
                    <Loader2 className="size-4 animate-spin text-muted-foreground" />
                  </div>
                ) : null,
            }}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-40 px-6 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <RiNotificationBadgeLine className="size-6 text-muted-foreground" />
            </div>
            <Typography
              variant="p"
              className="text-sm font-semibold"
              text="No activity yet"
            />
            <Typography
              variant="p"
              className="text-xs text-muted-foreground mt-1"
              text="When you get mentioned or someone replies to you, it'll show up here."
            />
          </div>
        )}
      </div>
    </>
  );
}
