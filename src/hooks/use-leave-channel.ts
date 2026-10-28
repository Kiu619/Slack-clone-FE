import { leaveChannelApi } from "@/apis";
import { channelKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const useLeaveChannel = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => leaveChannelApi(workspaceId, channelId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: channelKeys.all(workspaceId),
      });
      void queryClient.invalidateQueries({
        queryKey: channelKeys.detail(workspaceId, channelId),
      });
      void queryClient.invalidateQueries({
        queryKey: ["channel-member-status", workspaceId, channelId],
      });
      void queryClient.invalidateQueries({
        queryKey: channelKeys.members(workspaceId, channelId, ""),
      });
    },
    onError: (e: unknown) => {
      const msg = isAxiosError(e)
        ? (e.response?.data as { message?: string })?.message ?? e.message
        : "Could not leave channel";
      throw new Error(typeof msg === "string" ? msg : "Could not leave channel");
    },
  });
};
