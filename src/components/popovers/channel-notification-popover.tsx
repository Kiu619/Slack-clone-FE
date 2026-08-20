"use client";

import {
    getNotificationSettingApi,
    updateNotificationSettingApi,
} from "@/apis";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { useAppTranslation } from "@/hooks/use-translation";
import { notificationKeys } from "@/lib/query-keys";
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

export default function ChannelNotificationPopover({
  workspaceId,
  channelId,
}: Props) {
  const t = useAppTranslation('notifications.channelPopover')
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
      toast.success(t('updatedSuccess'));
      setOpen(false);
    },
    onError: () => {
      toast.error(t('updateFailed'));
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
            {t('header')}
          </span>

          {isLoading ? (
            <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
              <Loader2 size={16} className="animate-spin" />
              <span>{t('loading')}</span>
            </div>
          ) : (
            <>
              <OptionButton
                icon={TbBellRinging}
                title={t('allPosts.title')}
                description={t('allPosts.description')}
                isActive={activeMode === "all_messages"}
                isPending={mutation.isPending}
                onClick={() => mutation.mutate("all_messages")}
              />
              <OptionButton
                icon={TbBell}
                title={t('justMentions.title')}
                description={t('justMentions.description')}
                isActive={activeMode === "mentions_only"}
                isPending={mutation.isPending}
                onClick={() => mutation.mutate("mentions_only")}
              />
              <OptionButton
                icon={TbBellOff}
                title={t('muteHide.title')}
                description={t('muteHide.description')}
                isActive={activeMode === "muted"}
                isPending={mutation.isPending}
                onClick={() => mutation.mutate("muted")}
              />
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function OptionButton({
  icon: Icon,
  title,
  description,
  isActive,
  isPending,
  onClick,
}: {
  icon: typeof TbBell;
  title: string;
  description: string;
  isActive: boolean;
  isPending: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      variant="submenu"
      disabled={isPending}
      onClick={onClick}
      className="justify-between!"
    >
      <div className="flex items-center gap-2">
        <Icon size={20} />
        <div className="flex flex-col gap-1">
          <Typography
            text={title}
            variant="p"
            className="text-left"
          />
          <Typography
            text={description}
            variant="p"
            className="text-xs"
          />
        </div>
      </div>
      {isPending && isActive ? (
        <Loader2 size={16} className="animate-spin" />
      ) : isActive ? (
        <Check size={16} />
      ) : null}
    </Button>
  );
}
