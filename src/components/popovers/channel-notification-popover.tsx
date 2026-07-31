"use client";

import {
  getNotificationSettingApi,
  updateNotificationSettingApi,
} from "@/apis";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { notificationKeys } from "@/lib/query-keys";
import Typography from "@/components/ui/typography";
import type { NotificationOverrideMode } from "@/lib/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
import { TbBell, TbBellOff, TbBellRinging } from "react-icons/tb";
import { toast } from "sonner";

type Props = {
  workspaceId: string;
  channelId: string;
};

const OPTIONS: Array<{
  mode: NotificationOverrideMode;
  title: string;
  description: string;
  icon: typeof TbBell;
}> = [
  {
    mode: "all_messages",
    title: "All new posts",
    description: "Messages and threads you follow",
    icon: TbBellRinging,
  },
  {
    mode: "mentions_only",
    title: "Just mentions",
    description: "@you, @channel, @here",
    icon: TbBell,
  },
  {
    mode: "muted",
    title: "Mute and hide",
    description: "Only badge the channel",
    icon: TbBellOff,
  },
];

export default function ChannelNotificationPopover({
  workspaceId,
  channelId,
}: Props) {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();
  const queryKey = notificationKeys.setting(workspaceId, "channel", channelId);

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotificationSettingApi({ workspaceId, channelId }),
    enabled: !!workspaceId && !!channelId,
    staleTime: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (mode: NotificationOverrideMode) => {
      if (mode === "all_messages") {
        return updateNotificationSettingApi(
          { workspaceId, channelId },
          { notifyFor: "all_messages", muteChannel: false },
        );
      }

      if (mode === "mentions_only") {
        return updateNotificationSettingApi(
          { workspaceId, channelId },
          { notifyFor: "mentions_and_dm", muteChannel: false },
        );
      }

      return updateNotificationSettingApi(
        { workspaceId, channelId },
        { notifyFor: "nothing", muteChannel: true },
      );
    },
    onSuccess: async (updated) => {
      queryClient.setQueryData(queryKey, updated);
      await queryClient.invalidateQueries({ queryKey });
      toast.success("Channel notification setting updated");
      setOpen(false);
    },
    onError: () => {
      toast.error("Failed to update channel notification setting");
    },
  });

  const activeMode = data?.mode ?? "mentions_only";
  const TriggerIcon =
    activeMode === "all_messages"
      ? TbBellRinging
      : activeMode === "muted"
        ? TbBellOff
        : TbBell;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="custom"
          className="cursor-pointer hover:bg-[rgba(255,255,255,0.5)] dark:hover:bg-[#222529] p-1 rounded-r-md border border-[#797c814d]"
        >
          <TriggerIcon size={18} />
        </Button>
      </PopoverTrigger>
      <PopoverContent withOverlay className="z-999!">
        <div className="flex flex-col py-2">
          <span className="mx-4 text-[13px] text-[#8e9297]">
            Notify you about...
          </span>

          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span>Loading notification setting...</span>
            </div>
          ) : (
            OPTIONS.map((option) => {
              const Icon = option.icon;
              const isActive = activeMode === option.mode;
              return (
                <Button
                  key={option.mode}
                  variant="submenu"
                  disabled={mutation.isPending}
                  onClick={() => mutation.mutate(option.mode)}
                  className="justify-between!"
                >
                  <div className="flex items-center gap-2">
                    <Icon size={20} />
                    <div className="flex flex-col gap-1">
                      <Typography
                        text={option.title}
                        variant="p"
                        className="text-left"
                      />
                      <Typography
                        text={option.description}
                        variant="p"
                        className="text-xs"
                      />
                    </div>
                  </div>
                  {mutation.isPending && isActive ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : isActive ? (
                    <Check size={16} />
                  ) : null}
                </Button>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
