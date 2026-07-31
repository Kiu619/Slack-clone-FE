"use client";

import {
  getNotificationSettingApi,
  updateNotificationSettingApi,
} from "@/apis";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import { notificationKeys } from "@/lib/query-keys";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { TbBell, TbBellOff } from "react-icons/tb";
import { toast } from "sonner";

type Props = {
  workspaceId: string;
  conversationId: string;
};

export default function DMsNotificationPopover({
  workspaceId,
  conversationId,
}: Props) {
  const queryClient = useQueryClient();
  const queryKey = notificationKeys.setting(
    workspaceId,
    "conversation",
    conversationId,
  );

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotificationSettingApi({ workspaceId, conversationId }),
    enabled: !!workspaceId && !!conversationId,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (muted: boolean) =>
      updateNotificationSettingApi(
        { workspaceId, conversationId },
        muted
          ? { muteChannel: true }
          : {
              muteChannel: false,
              notifyFor: "all_messages",
            },
      ),
    onSuccess: async (updated, muted) => {
      queryClient.setQueryData(queryKey, updated);
      await queryClient.invalidateQueries({ queryKey });
      toast.success(
        muted ? "Conversation muted" : "Conversation notifications enabled",
      );
    },
    onError: () => {
      toast.error("Failed to update conversation notification setting");
    },
  });

  const isMuted = data?.mode === "muted";
  const isPending = mutation.isPending || isLoading;
  const TriggerIcon = isMuted ? TbBellOff : TbBell;
  const tooltipText = isPending
    ? "Updating notification setting..."
    : isMuted
      ? "Unmute conversation"
      : "Mute conversation";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="custom"
          disabled={isPending}
          onClick={() => mutation.mutate(!isMuted)}
          className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-r-md border border-[#797c814d]"
        >
          {isPending ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <TriggerIcon size={18} />
          )}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        <p className="text-xs">{tooltipText}</p>
      </TooltipContent>
    </Tooltip>
  );
}
