"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { updateProfileApi, type UpdateProfilePayload } from "@/apis";
import { authKeys } from "@/lib/query-keys";

export function useUpdateProfile(workspaceId: string | undefined) {
  const queryClient = useQueryClient();
  const workspaceIdOrEmpty = workspaceId ?? "";

  return useMutation({
    mutationFn: (payload: UpdateProfilePayload) =>
      updateProfileApi(workspaceId!, payload),

    onMutate: (payload) => {
      // Optimistic update only when timeZone is being changed
      if (payload.timeZone === undefined) return;

      void queryClient.cancelQueries({
        queryKey: authKeys.workspaceProfile(workspaceIdOrEmpty),
      });

      const previous = queryClient.getQueryData(authKeys.workspaceProfile(workspaceIdOrEmpty));

      queryClient.setQueryData(
        authKeys.workspaceProfile(workspaceIdOrEmpty),
        (old: unknown) => {
          if (!old || typeof old !== "object") return old;
          return { ...(old as object), timeZone: payload.timeZone };
        }
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(
          authKeys.workspaceProfile(workspaceIdOrEmpty),
          ctx.previous
        );
      }
      toast.error("Failed to update profile");
    },

    onSuccess: (data) => {
      queryClient.setQueryData(
        authKeys.workspaceProfile(workspaceIdOrEmpty),
        data
      );
      queryClient.invalidateQueries({
        queryKey: authKeys.workspaceProfile(workspaceIdOrEmpty),
      });
    },
  });
}
