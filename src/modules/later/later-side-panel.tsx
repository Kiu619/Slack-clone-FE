"use client";

import ReminderDialog from "@/components/dialogs/reminder-dialog";
import { Button } from "@/components/ui/button";
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
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";
import { useLaterNavigation } from "@/hooks/use-later-navigation";
import { useSavedItems } from "@/hooks/use-saved-items";
import { getContrastTextColor } from "@/lib/color-contrast";
import { SavedItem } from "@/lib/types";
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
import { useAppTranslation } from "@/hooks/use-translation";
import { getReminderPresets, localizeReminderPresets } from "@/lib/reminder-presets";

interface Props {
  theme: Theme;
}

const LaterSidePanel = ({ theme }: Props) => {
  const t = useAppTranslation("later");
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

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleToggleComplete = (item: SavedItem) => {
    const newStatus = item.status === "completed" ? "in_progress" : "completed";
    updateMutation.mutate({ itemId: item.id, payload: { status: newStatus } });
  };

  const handleArchive = (item: SavedItem) => {
    const newStatus = item.status === "archived" ? "in_progress" : "archived";
    updateMutation.mutate({ itemId: item.id, payload: { status: newStatus } });
    toast.success(newStatus === "archived" ? t("toast.archived") : t("toast.movedBackToInProgress"));
  };

  const handleRemove = (itemId: string) => {
    removeMutation.mutate(itemId);
  };

  const handleSetReminder = useCallback(
    (item: SavedItem, remindAt: string, note?: string) => {
      setReminderOnItem(item, remindAt, note);
    },
    [setReminderOnItem],
  );

  const handleClearReminder = (item: SavedItem) => {
    clearReminderOnItem(item);
  };

  const { navigateToItem, mainActiveId, threadActiveId } = useLaterNavigation();

  const handleItemClick = (item: SavedItem) => {
    navigateToItem(item);
  }

  const reminderPresets = localizeReminderPresets(getReminderPresets(), (key) => t(key));
  const selectedTextColor = getContrastTextColor(theme.selectedItems);

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex justify-between items-center">
        <span className="text-lg font-extrabold text-[#1d1c1d] dark:text-[#d1d2d3]">
          {t("title")}
        </span>
        <div className="flex items-center gap-x-3 text-[#1d1c1d] dark:text-[#d1d2d3]">
          {filterStatus === "completed" ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="custom" className="p-1 hover:text-red-500!" onClick={() => clearCompleted()}>
                  <MdOutlineDeleteSweep size={22} className="cursor-pointer " />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{t("toolbar.clearAllCompleted")}</p>
              </TooltipContent>
            </Tooltip>
          ) : filterStatus === "in_progress" ? (
            <Popover>

              <Tooltip>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <Button 
                      size="custom"
                      className="p-1"
                    >
                      <IoFilter size={18}/>
                    </Button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <TooltipContent side="bottom">
                  <p className="text-xs">{t("toolbar.filter")}</p>
                </TooltipContent>
              </Tooltip>
              <PopoverContent
                side="bottom"
                align="end"
                sideOffset={8}
                className="w-auto"
                withOverlay={true}
                onOpenAutoFocus={(e) => e.preventDefault()}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="py-2 min-w-50">
                  <div className="flex flex-col">
                    <Button
                      variant="checkedMenu"
                      className={cn(
                        showUpcomingReminders && ACTIVE_ITEM_STYLE
                      )}
                      onClick={() => setShowUpcomingReminders(true)}
                    >
                      <Typography
                        variant="p"
                        text={t("filterOptions.showUpcomingReminders")}
                        className="text-[14px] font-medium"
                      />
                      <div className="w-4 flex shrink-0">
                        {showUpcomingReminders && <LuCheck size={16} />}
                      </div>
                    </Button>
                    <Button
                      variant="checkedMenu"
                      className={cn(
                        !showUpcomingReminders && ACTIVE_ITEM_STYLE
                      )}
                      onClick={() => setShowUpcomingReminders(false)}
                    >
                      <Typography
                        variant="p"
                        text={t("filterOptions.hideUpcomingReminders")}
                        className="text-[14px] font-medium"
                      />
                      <div className="w-4 flex shrink-0">
                        {!showUpcomingReminders && <LuCheck size={16} />}
                      </div>
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          ) : null}
          <Button size="custom" className="p-1" onClick={() => setOpenReminderDialog(true)}>
            <FiPlus size={20} className="cursor-pointer" />
          </Button>
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
            <Typography text={t(`tabs.${status === "in_progress" ? "inProgress" : status}`)} variant="p" className="text-[13px] font-semibold" />
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
              text={t("emptyState.title")}
              className="font-bold"
            />
            <Typography
              variant="p"
              text={t("emptyState.description")}
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
                  selectedTextColor={selectedTextColor}
                />
              )}
              components={{
                Footer: () => (
                  isFetchingNextPage ? (
                    <div className="p-4 text-center text-sm text-[#616061]">
                      {t("loadingMore")}
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
