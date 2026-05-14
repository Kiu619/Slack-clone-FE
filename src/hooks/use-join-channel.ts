import { addChannelMemberApi } from "@/apis";
import { channelKeys } from "@/lib/query-keys";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";

export const useJoinChannel = (workspaceId: string, channelId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
  mutationFn: (userId: string) =>
    addChannelMemberApi(workspaceId, channelId, userId),
  onSuccess: () => {
    void queryClient.invalidateQueries({
      queryKey: ['channel-member-status', workspaceId, channelId],
    });
    void queryClient.invalidateQueries({
      queryKey: channelKeys.members(workspaceId, channelId, ""),
    });
    void queryClient.invalidateQueries({
      queryKey: channelKeys.all(workspaceId),
    });
    void queryClient.invalidateQueries({
      queryKey: ["channels", workspaceId, channelId, "member-status"],
    });
  },
  onError: (e: unknown) => {
    const msg = isAxiosError(e)
      ? (e.response?.data as { message?: string })?.message ?? e.message
      : "Could not join channel";
    throw new Error(typeof msg === "string" ? msg : "Could not join channel");
  },
  });
};

