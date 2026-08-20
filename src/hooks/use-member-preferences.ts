"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  getMemberPreferencesApi,
  updateMemberPreferencesApi,
  type MemberPreferencesResponse,
  type UpdateMemberPreferencesPayload,
} from "@/apis";
import { memberPreferencesKeys } from "@/lib/query-keys";

export function useMemberPreferences(workspaceId: string | undefined) {
  return useQuery<MemberPreferencesResponse | null>({
    queryKey: memberPreferencesKeys.detail(workspaceId ?? ""),
    queryFn: () => getMemberPreferencesApi(workspaceId!),
    enabled: Boolean(workspaceId),
    staleTime: 5 * 60 * 1000,
  });
}

export function useUpdateMemberPreferences(workspaceId: string | undefined) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: UpdateMemberPreferencesPayload) =>
      updateMemberPreferencesApi(workspaceId!, payload),

    onMutate: async (payload) => {
      await queryClient.cancelQueries({
        queryKey: memberPreferencesKeys.detail(workspaceId ?? ""),
      });

      const previous = queryClient.getQueryData<MemberPreferencesResponse | null>(
        memberPreferencesKeys.detail(workspaceId ?? ""),
      );

      queryClient.setQueryData<MemberPreferencesResponse | null>(
        memberPreferencesKeys.detail(workspaceId ?? ""),
        (old) => {
          if (!old) return old;
          return { ...old, ...payload };
        },
      );

      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous !== undefined) {
        queryClient.setQueryData(
          memberPreferencesKeys.detail(workspaceId ?? ""),
          ctx.previous,
        );
      }
      toast.error("Failed to sync language settings");
    },

    onSuccess: (data) => {
      queryClient.setQueryData(
        memberPreferencesKeys.detail(workspaceId ?? ""),
        data,
      );
      queryClient.invalidateQueries({
        queryKey: memberPreferencesKeys.detail(workspaceId ?? ""),
      });
    },
  });
}
