"use client";

import {
    checkLaterMessagesApi,
    clearCompletedSavedItemsApi,
    getLaterSummaryApi,
    getSavedItemsApi,
    removeSavedItemApi,
    saveItemApi,
    updateSavedItemApi,
} from "@/apis";
import { SavedItem, SaveItemPayload, UpdateSavedItemPayload } from "@/lib/types";
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    addHours,
    addMinutes,
    format,
    nextMonday,
    setHours,
    setMinutes,
} from "date-fns";
import { useParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useAppTranslation } from "./use-translation";
import { getReminderPresets } from "@/lib/reminder-presets";

interface UseSavedItemsOptions {
  filterStatus?: "in_progress" | "archived" | "completed";
  hideUpcoming?: boolean;
}

export function useSavedItems({
  filterStatus = "in_progress",
  hideUpcoming = false,
}: UseSavedItemsOptions = {}) {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId;
  const queryClient = useQueryClient();

  // ─── Query ────────────────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ["saved-items", workspaceId, filterStatus, hideUpcoming],
    queryFn: ({ pageParam }) =>
      getSavedItemsApi(workspaceId, filterStatus, pageParam as string, 20, hideUpcoming),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!workspaceId,
  });

  const savedItems = data?.pages.flatMap((page) => page.items) ?? [];
  const totalCount = data?.pages[0]?.totalCount ?? 0;

  // ─── Create (Reminder / Message / Attachment) ─────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: SaveItemPayload) =>
      saveItemApi(workspaceId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      queryClient.invalidateQueries({ queryKey: ["saved-items-summary"] });
      queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
      toast.success("Reminder created");
    },
    onError: () => {
      toast.error("Failed to create reminder");
    },
  });

  // ─── Update ───────────────────────────────────────────────────────────────
  const updateMutation = useMutation({
    mutationFn: ({
      itemId,
      payload,
    }: {
      itemId: string;
      payload: UpdateSavedItemPayload;
    }) => updateSavedItemApi(workspaceId, itemId, payload),

    // Optimistic update cho tất cả các tab
    onMutate: async ({ itemId, payload }) => {
      const statuses = ["in_progress", "archived", "completed"] as const;

      await Promise.all(
        statuses.map((s) =>
          queryClient.cancelQueries({
            queryKey: ["saved-items", workspaceId, s],
          }),
        ),
      );

      const previousData: Record<string, SavedItem[] | undefined> = {};
      statuses.forEach((s) => {
        previousData[s] = queryClient.getQueryData([
          "saved-items",
          workspaceId,
          s,
        ]);
      });

      let originalItem: SavedItem | undefined;
      for (const s of statuses) {
        const item = previousData[s]?.find((i) => i.id === itemId);
        if (item) {
          originalItem = item;
          break;
        }
      }

      statuses.forEach((status) => {
        queryClient.setQueryData<SavedItem[]>(
          ["saved-items", workspaceId, status],
          (old) => {
            if (!old) return old;
            const existsInList = old.some((i) => i.id === itemId);

            if (existsInList) {
              if (payload.status && payload.status !== status) {
                return old.filter((i) => i.id !== itemId);
              }
              return old.map((i) => (i.id === itemId ? { ...i, ...payload } : i));
            } else {
              if (payload.status === status && originalItem) {
                return [{ ...originalItem, ...payload }, ...old];
              }
            }
            return old;
          },
        );
      });

      return { previousData };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previousData) {
        Object.entries(ctx.previousData).forEach(([status, data]) => {
          queryClient.setQueryData(
            ["saved-items", workspaceId, status],
            data,
          );
        });
      }
      console.error("Failed to update item", _err);
      toast.error("Failed to update item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      queryClient.invalidateQueries({ queryKey: ["saved-items-summary"] });
      queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
    },
  });

  // ─── Remove ───────────────────────────────────────────────────────────────
  const removeMutation = useMutation({
    mutationFn: (itemId: string) => removeSavedItemApi(workspaceId, itemId),
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({
        queryKey: ["saved-items", workspaceId, filterStatus],
      });
      const previous = queryClient.getQueryData<SavedItem[]>([
        "saved-items",
        workspaceId,
        filterStatus,
      ]);
      queryClient.setQueryData<SavedItem[]>(
        ["saved-items", workspaceId, filterStatus],
        (old) => old?.filter((item) => item.id !== itemId) ?? [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["saved-items", workspaceId, filterStatus],
          ctx.previous,
        );
      }
      toast.error("Failed to remove item");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      queryClient.invalidateQueries({ queryKey: ["saved-items-summary"] });
      queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
      toast.success("Removed from Later");
    },
  });

  // ─── Clear Completed ──────────────────────────────────────────────────────
  const clearCompletedMutation = useMutation({
    mutationFn: () => clearCompletedSavedItemsApi(workspaceId),
    onMutate: async () => {
      await queryClient.cancelQueries({
        queryKey: ["saved-items", workspaceId, "completed"],
      });
      const previous = queryClient.getQueryData<SavedItem[]>([
        "saved-items",
        workspaceId,
        "completed",
      ]);
      queryClient.setQueryData<SavedItem[]>(
        ["saved-items", workspaceId, "completed"],
        [],
      );
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        queryClient.setQueryData(
          ["saved-items", workspaceId, "completed"],
          ctx.previous,
        );
      }
      toast.error("Failed to clear items");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      queryClient.invalidateQueries({ queryKey: ["saved-items-summary"] });
      queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
      toast.success("Cleared completed items");
    },
  });

  // ─── Realtime: later:* handled in useGlobalSync (workspace shell) ─────────

  // ─── Convenience helpers ──────────────────────────────────────────────────

  /** Đặt reminder cho một SavedItem đã có (dùng trong LaterSidePanel) */
  const setReminderOnItem = (
    item: SavedItem,
    remindAt: string,
    note?: string,
  ) => {
    updateMutation.mutate({
      itemId: item.id,
      payload: { remindAt, ...(note ? { note } : {}) },
    });
    toast.success(`Reminder set for ${format(new Date(remindAt), "MMM d 'at' h:mm a")}`);
  };

  /** Xóa reminder của một SavedItem đã có */
  const clearReminderOnItem = (item: SavedItem) => {
    updateMutation.mutate({ itemId: item.id, payload: { remindAt: null } });
    toast.success("Reminder cleared");
  };

  /** Tạo reminder mới (standalone – dùng trong MessageItem, DmsSidePanel) */
  const createReminder = (remindAt: string, note?: string) => {
    saveMutation.mutate({
      type: "reminder",
      remindAt,
      note: note ?? "",
    });
  };

  /** Lưu message vào Later */
  const saveMessage = (messageId: string) => {
    saveMutation.mutate({ type: "message", messageId });
  };

  /** Lưu attachment vào Later */
  const saveAttachment = (attachmentId: string) => {
    saveMutation.mutate({ type: "attachment", attachmentId });
  };

  return {
    // Data
    savedItems,
    totalCount,
    isLoading,
    // Mutations
    saveMutation,
    updateMutation,
    removeMutation,
    // Helpers
    setReminderOnItem,
    clearReminderOnItem,
    createReminder,
    saveMessage,
    saveAttachment,
    clearCompleted: () => clearCompletedMutation.mutate(),
    // Booleans
    isSaving: saveMutation.isPending,
    isUpdating: updateMutation.isPending,
    isRemoving: removeMutation.isPending,
    isClearingCompleted: clearCompletedMutation.isPending,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  };
}

export function useLaterOverdueSummary() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId;

  const query = useQuery({
    queryKey: ["saved-items-summary", workspaceId],
    queryFn: () => getLaterSummaryApi(workspaceId!),
    enabled: !!workspaceId,
    staleTime: 30_000,
  });

  useEffect(() => {
    const nextOverdueAt = query.data?.nextOverdueAt;
    if (!workspaceId || !nextOverdueAt) return;

    const targetTime = new Date(nextOverdueAt).getTime();
    if (Number.isNaN(targetTime)) return;

    const delay = targetTime - Date.now();
    if (delay <= 0) {
      void query.refetch();
      return;
    }

    const timer = window.setTimeout(() => {
      void query.refetch();
    }, Math.min(delay, 2_147_483_647));

    return () => window.clearTimeout(timer);
  }, [workspaceId, query.data?.nextOverdueAt, query.refetch]);

  return {
    overdueCount: query.data?.overdueCount ?? 0,
    nextOverdueAt: query.data?.nextOverdueAt ?? null,
    isLoading: query.isLoading,
  };
}

/**
 * Batch lookup: which message IDs are in Later with status in_progress
 * (for bookmark toolbar / DM row). Uses POST check-messages.
 */
export function useLaterSavedMessageIds(
  workspaceId: string | undefined,
  messageIds: string[],
) {
  const sortedIds = useMemo(() => {
    if (!messageIds?.length) return [];
    const uniq = [...new Set(messageIds)].filter(Boolean);
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const validUuids = uniq.filter((id) => UUID_REGEX.test(id));
    validUuids.sort();
    return validUuids;
  }, [messageIds]);

  const sortedKey = sortedIds.join(",");

  const query = useQuery({
    queryKey: ["later-saved-messages", workspaceId, sortedKey],
    queryFn: () => checkLaterMessagesApi(workspaceId!, sortedIds),
    enabled: Boolean(workspaceId && sortedIds.length > 0),
    staleTime: 45_000,
    select: (data) => ({
      savedMessageIdSet: new Set(data.savedMessageIds),
      remindAtByMessageId: new Map(
        Object.entries(data.remindAtByMessageId ?? {}),
      ) as Map<string, string>,
    }),
  });

  return {
    savedMessageIdSet: query.data?.savedMessageIdSet ?? new Set<string>(),
    remindAtByMessageId: query.data?.remindAtByMessageId ?? new Map<string, string>(),
    isLoading: sortedIds.length > 0 && query.isLoading,
  };
}

/** Hook nhẹ hơn chỉ cho chức năng "Remind me" (không cần query list) */
export function useRemindMe() {
  const params = useParams<{ workspaceId: string }>();
  const workspaceId = params?.workspaceId;
  const queryClient = useQueryClient();
  const [isRemindMeOpen, setIsRemindMeOpen] = useState(false);

  const saveMutation = useMutation({
    mutationFn: (payload: SaveItemPayload) =>
      saveItemApi(workspaceId, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["saved-items"] });
      queryClient.invalidateQueries({ queryKey: ["saved-items-summary"] });
      queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
      if (variables.remindAt) {
        toast.success(
          `Reminder set for ${format(new Date(variables.remindAt), "MMM d 'at' h:mm a")}`,
        );
      } else {
        toast.success("Saved to Later");
      }
    },
    onError: () => {
      toast.error("Failed to set reminder");
    },
  });

  const remindAt = (isoString: string, target?: Partial<SaveItemPayload>) => {
    saveMutation.mutate({
      type: target?.type ?? "reminder",
      remindAt: isoString,
      ...target
    } as SaveItemPayload);
    setIsRemindMeOpen(false);
  };

  const remindInMinutes = (minutes: number, target?: Partial<SaveItemPayload>) => {
    remindAt(addMinutes(new Date(), minutes).toISOString(), target);
  };

  const remindInHours = (hours: number, target?: Partial<SaveItemPayload>) => {
    remindAt(addHours(new Date(), hours).toISOString(), target);
  };

  const remindTomorrow = (target?: Partial<SaveItemPayload>) => {
    const tomorrow = setMinutes(setHours(addHours(new Date(), 24), 9), 0);
    remindAt(tomorrow.toISOString(), target);
  };

  const remindNextMonday = (target?: Partial<SaveItemPayload>) => {
    const monday = setMinutes(setHours(nextMonday(new Date()), 9), 0);
    remindAt(monday.toISOString(), target);
  };

  return {
    isRemindMeOpen,
    setIsRemindMeOpen,
    isPending: saveMutation.isPending,
    remindAt,
    remindInMinutes,
    remindInHours,
    remindTomorrow,
    remindNextMonday,
    presets: getReminderPresets(),
  };
}
