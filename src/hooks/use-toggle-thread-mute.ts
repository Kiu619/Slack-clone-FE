"use client";

import { useAppTranslation } from "@/hooks/use-translation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { toggleThreadMuteApi } from "@/apis";
import { messageKeys } from "@/lib/query-keys";
import { useMessageStore } from "@/stores/useMessageStore";

export function useToggleThreadMute(workspaceId: string | undefined) {
  const t = useAppTranslation("threadNotifications");
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      parentId,
      isMuted,
    }: {
      parentId: string;
      isMuted: boolean;
    }) => toggleThreadMuteApi(parentId, workspaceId!, isMuted),

    onMutate: async ({ parentId, isMuted }) => {
      if (!workspaceId) return;

      // Cancel outgoing refetches
      await queryClient.cancelQueries({
        queryKey: messageKeys.threads(workspaceId),
      });

      // Snapshot previous value
      const previous = queryClient.getQueryData(messageKeys.threads(workspaceId));

      // Optimistically update the threads cache
      queryClient.setQueryData(
        messageKeys.threads(workspaceId),
        (old: any) => {
          if (!old || !Array.isArray(old.pages)) return old;
          return {
            ...old,
            pages: old.pages.map((page: any) => ({
              ...page,
              threads: page.threads?.map((thread: any) =>
                thread.id === parentId
                  ? { ...thread, viewerIsMuted: isMuted }
                  : thread,
              ),
            })),
          };
        },
      );

      // Patch useMessageStore: parent + all replies in the same thread show the same state.
      const store = useMessageStore.getState();
      store.updateEntity(parentId, { viewerIsMuted: isMuted });
      Object.values(store.entities).forEach((m) => {
        if (m.parentId === parentId && m.id !== parentId) {
          store.updateEntity(m.id, { viewerIsMuted: isMuted });
        }
      });

      return { previous, parentId };
    },

    onError: (_err, _vars, ctx) => {
      if (!workspaceId || !ctx?.previous) return;
      // Rollback on error
      queryClient.setQueryData(
        messageKeys.threads(workspaceId),
        ctx.previous,
      );
      toast.error(t("updateFailed"));
    },

    onSettled: (_data, _err, vars) => {
      if (!workspaceId) return;
      // Invalidate to ensure consistency
      void queryClient.invalidateQueries({
        queryKey: messageKeys.threads(workspaceId),
      });
      // Invalidate replies query cache so the next time the thread panel opens,
      // server returns the latest viewerIsMuted for parent + every reply.
      void queryClient.invalidateQueries({
        queryKey: messageKeys.thread(vars.parentId),
      });
      // Invalidate all channel/conversation message lists so the next fetch
      // returns the new viewerIsMuted from the server.
      void queryClient.invalidateQueries({ queryKey: messageKeys.all });
    },
  });
}
