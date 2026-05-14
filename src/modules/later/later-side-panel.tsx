"use client";

import ReminderDialog from "@/components/dialogs/reminder-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import { useLaterNavigation } from "@/hooks/use-later-navigation";
import { getReminderPresets, useSavedItems } from "@/hooks/use-saved-items";
import { SavedItem, Workspace } from "@/lib/types";
import { cn } from "@/lib/utils";
import { type Theme } from "@/stores/useThemeStore";
import { useUserStore } from "@/stores/useUserStore";
import { format } from "date-fns";
import { useParams } from "next/navigation";
import { useCallback, useState } from "react";
import {
  FiPlus,
} from "react-icons/fi";
import { IoFilter } from "react-icons/io5";
import { LuCheck } from "react-icons/lu";
import { MdBookmark, MdOutlineDeleteSweep } from "react-icons/md";
import { Virtuoso } from "react-virtuoso";
import { toast } from "sonner";
import { SavedItemComponent, SavedItemSkeleton } from "./saved-item";

interface Props {
  theme: Theme;
  currentWorkspaceData: Workspace;
}

const MENU_ITEM_STYLE =
  "flex items-center gap-2 hover:text-white hover:bg-selection-hover px-5 py-1 cursor-pointer text-sm";

const LaterSidePanel = ({ theme, currentWorkspaceData }: Props) => {
  const { user: currentUser } = useUserStore();
  const params = useParams<{ workspaceId: string }>();
  const [filterStatus, setFilterStatus] = useState<
    "in_progress" | "archived" | "completed"
  >("in_progress");
  const [showUpcomingReminders, setShowUpcomingReminders] = useState(true);

  const {
    savedItems,
    isLoading,
    updateMutation,
    removeMutation,
    saveMutation,
    setReminderOnItem,
    clearReminderOnItem,
    clearCompleted,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSavedItems({
    filterStatus,
    hideUpcoming: !showUpcomingReminders
  });

  // Reminder dialog state
  const [reminderItem, setReminderItem] = useState<SavedItem | null>(null);
  const [openReminderDialog, setOpenReminderDialog] = useState(false);
  const [openPopoverId, setOpenPopoverId] = useState<string | null>(null);
  // Reminder quick preset popover
  const [openReminderPopoverId, setOpenReminderPopoverId] = useState<string | null>(null);

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleComplete = (item: SavedItem) => {
    const newStatus = item.status === "completed" ? "in_progress" : "completed";
    updateMutation.mutate({ itemId: item.id, payload: { status: newStatus } });
  };

  const handleArchive = (item: SavedItem) => {
    const newStatus = item.status === "archived" ? "in_progress" : "archived";
    updateMutation.mutate({ itemId: item.id, payload: { status: newStatus } });
    setOpenPopoverId(null);
    toast.success(newStatus === "archived" ? "Archived" : "Moved back to In Progress");
  };

  const handleRemove = (itemId: string) => {
    removeMutation.mutate(itemId);
    setOpenPopoverId(null);
  };

  const handleSetReminder = useCallback(
    (item: SavedItem, remindAt: string, note?: string) => {
      setReminderOnItem(item, remindAt, note);
      setOpenReminderPopoverId(null);
    },
    [setReminderOnItem],
  );

  const handleClearReminder = (item: SavedItem) => {
    clearReminderOnItem(item);
    setOpenReminderPopoverId(null);
  };

  const { navigateToItem, mainActiveId, threadActiveId } = useLaterNavigation();

  const handleItemClick = (item: SavedItem) => {
    navigateToItem(item);
  }

  const reminderPresets = getReminderPresets();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-extrabold text-[#1d1c1d] dark:text-[#d1d2d3]">
          Later
        </span>
        <div className="flex items-center gap-x-3 text-[#1d1c1d] dark:text-[#d1d2d3]">
          {filterStatus === "completed" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={() => clearCompleted()}>
                  <MdOutlineDeleteSweep size={22} className="cursor-pointer hover:text-red-500" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Clear all completed</p>
              </TooltipContent>
            </Tooltip>
          ) : filterStatus === "in_progress" ? (
            <Popover>

              <Tooltip>
                <PopoverTrigger asChild>

                  <TooltipTrigger asChild>
                    <IoFilter size={18} className="cursor-pointer" />
                  </TooltipTrigger>
                </PopoverTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">Filter</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                className="w-auto border-[#797c814d] bg-white dark:bg-[#1A1D21]"
                withOverlay={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-2 min-w-[200px]">
                  <div className="flex flex-col">
                    <div
                      className={cn(
                        MENU_ITEM_STYLE,
                        "justify-start gap-2 px-3",
                        showUpcomingReminders && "text-[#1264a3] dark:text-[#1d9bd1]"
                      )}
                      onClick={() => setShowUpcomingReminders(true)}
                    >
                      <div className="w-4 flex shrink-0">
                        {showUpcomingReminders && <LuCheck size={16} />}
                      </div>
                      <Typography
                        variant="p"
                        text="Show upcoming reminders"
                        className="text-[14px] font-medium"
                      />
                    </div>
                    <div
                      className={cn(
                        MENU_ITEM_STYLE,
                        "justify-start gap-2 px-3",
                        !showUpcomingReminders && "text-[#1264a3] dark:text-[#1d9bd1]"
                      )}
                      onClick={() => setShowUpcomingReminders(false)}
                    >
                      <div className="w-4 flex shrink-0">
                        {!showUpcomingReminders && <LuCheck size={16} />}
                      </div>
                      <Typography
                        variant="p"
                        text="Hide upcoming reminders"
                        className="text-[14px] font-medium"
                      />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          <button onClick={() => setOpenReminderDialog(true)}>
            <FiPlus size={20} className="cursor-pointer" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex mx-2 gap-x-4 text-sm font-medium mb-1">
        {(["in_progress", "archived", "completed"] as const).map((status) => (
          <button
            key={status}
            type="button"
            onClick={() => setFilterStatus(status)}
            className={cn(
              "flex items-center gap-x-1 px-2 py-2 -mb-px border-b-2 transition-colors rounded-t-md",
              filterStatus === status
                ? "border-current text-current"
                : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
            )}
            style={
              filterStatus === status
                ? {
                  borderColor: theme.selectedItems,
                  borderBottomWidth: 3,
                  color: theme.selectedItems,
                }
                : {}
            }
          >
            <Typography text={status.replace("_", " ").charAt(0).toUpperCase() + status.replace("_", " ").slice(1)} variant="p" className="text-[13px] font-semibold" />
            {/* hiển thị số lượng item theo status */}
            {savedItems &&
              savedItems?.filter((item) => item.status === status).length > 0 && (
                <span className="text-[13px] font-semibold opacity-70">
                  {savedItems?.filter((item) => item.status === status).length}
                </span>
              )}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col">
            {Array.from({ length: 5 }).map((_, i) => (
              <SavedItemSkeleton key={i} />
            ))}
          </div>
        ) : savedItems?.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-8 space-y-4">
            <div className="w-48 h-48 relative opacity-80">
              <div className="absolute inset-0 flex items-center justify-center">
                <MdBookmark
                  size={120}
                  className="text-[#e8e8e8] dark:text-[#2a2d31] rotate-12"
                />
              </div>
            </div>
            <Typography
              variant="h4"
              text="Nothing to see here"
              className="font-bold"
            />
            <Typography
              variant="p"
              text="Items you save will appear here."
              className="text-[#616061] dark:text-[#ababad]"
            />
          </div>
        ) : (
          <div className="flex-1 h-full">
            <Virtuoso
              style={{ height: "100%" }}
              data={savedItems}
              endReached={() => {
                if (hasNextPage) fetchNextPage();
              }}
              itemContent={(index, item) => (
                <SavedItemComponent
                  key={item.id}
                  item={item}
                  theme={theme}
                  currentUser={currentUser}
                  workspaceId={params.workspaceId}
                  filterStatus={filterStatus}
                  isActive={mainActiveId === item.id || threadActiveId === item.id}
                  reminderPresets={reminderPresets}
                  onItemClick={handleItemClick}
                  onToggleComplete={handleToggleComplete}
                  onArchive={handleArchive}
                  onRemove={handleRemove}
                  onSetReminder={handleSetReminder}
                  onClearReminder={handleClearReminder}
                  onEditReminder={(item) => setReminderItem(item)}
                />
              )}
              components={{
                Footer: () => (
                  isFetchingNextPage ? (
                    <div className="p-4 text-center text-sm text-[#616061]">
                      Loading more...
                    </div>
                  ) : null
                )
              }}
            />
          </div>
        )}
      </div>

      {/* Custom Reminder Dialog */}
      <ReminderDialog
        open={!!reminderItem || openReminderDialog}
        onOpenChange={(open) => {
          if (!open) {
            setReminderItem(null);
            setOpenReminderDialog(false);
          }
        }}
        hideDescription={!!reminderItem && reminderItem.type !== 'reminder'} // Hiện description nếu là tạo mới HOẶC edit chính item reminder
        defaultValues={reminderItem ? {
          date: reminderItem.remindAt ? new Date(reminderItem.remindAt) : new Date(),
          time: reminderItem.remindAt ? format(new Date(reminderItem.remindAt), "HH:mm") : undefined,
          description: reminderItem.note || "",
        } : undefined}
        onSave={(remindAt, note) => {
          if (reminderItem) {
            handleSetReminder(reminderItem, remindAt, note);
          } else {
            saveMutation.mutate({ type: "reminder", note: note || "", remindAt });
          }
        }}
      />
    </div>
  );
};

export default LaterSidePanel;
