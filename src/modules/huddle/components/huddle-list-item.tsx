"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarGroup,
  AvatarImage,
} from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { HuddlePageItem, RecentHuddlesResponse } from "@/lib/huddle";
import { formatDistanceToNow } from "date-fns";
import { RiHeadphoneLine } from "react-icons/ri";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { MdMoreVert } from "react-icons/md";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import SeeParticipantsDialog from "./see-participants-dialog";
import { AddEditHuddleTopicDialog } from "@/modules/huddle-preview/components/add-edit-huddle-topic-dialog";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { updateHuddleTopicApi, removeLaterByMessageIdApi } from "@/apis";
import { toast } from "sonner";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { useShallow } from "zustand/react/shallow";
import {
  useSavedItems,
} from "@/hooks/use-saved-items";
import { useRouter, usePathname } from "next/navigation";
import { useMessageFocusStore } from "@/stores/useMessageFocusStore";
import { openDmInWorkspace } from "@/lib/open-dm-in-workspace";
import { useAppTranslation } from "@/hooks/use-translation";
import { useLanguageRegionStore } from "@/stores/useLanguageRegionStore";
import { formatMessageTime } from "@/lib/format-message-time";

type HuddleListItemProps = {
  huddle: HuddlePageItem;
  isSaved?: boolean;
  className?: string;
};

function formatDuration(seconds: number): string {
  if (seconds < 60) return "<1m";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  return `${days}d`;
}

export function HuddleListItem({
  huddle,
  isSaved = false,
  className,
}: HuddleListItemProps) {
  const t = useAppTranslation('huddle.listItem')
  const commonT = useAppTranslation('common')
  const router = useRouter();
  const pathname = usePathname();
  const language = useLanguageRegionStore((s) => s.language);
  const timeFormat = useLanguageRegionStore((s) => s.timeFormat);
  const dateFormat = useLanguageRegionStore((s) => s.dateFormat);
  const { setFocusedMessageId } = useMessageFocusStore();
  const [openSeeParticipantsDialog, setOpenSeeParticipantsDialog] =
    useState(false);
  const [openTopicDialog, setOpenTopicDialog] = useState(false);
  const [isSavingTopic, setIsSavingTopic] = useState(false);
  const queryClient = useQueryClient();
  const isActive = huddle.status === "active";
  const displayTime = huddle.endedAt
    ? formatMessageTime(huddle.endedAt, { t, commonT, language, timeFormat, dateFormat })
    : formatDistanceToNow(new Date(huddle.startedAt), { addSuffix: true });

  const { saveMessage } = useSavedItems();
  const feedMessageId = huddle.feedMessageId;

  const handleToggleSave = async () => {
    if (!feedMessageId) return;

    if (isSaved) {
      try {
        await removeLaterByMessageIdApi(huddle.workspaceId, feedMessageId);
        queryClient.invalidateQueries({ queryKey: ["later-saved-messages"] });
        toast.success(t('removedFromLater'));
      } catch {
        toast.error(t('failedToRemoveFromLater'));
      }
    } else {
      saveMessage(feedMessageId);
    }
  };

  const displayTitle = huddle.topic
    ? `${huddle.topic} ${t('in')} ${huddle.entityType === "channel" ? `#${huddle.entityLabel}` : huddle.entityLabel || t('huddle')}`
    : huddle.entityType === "channel"
      ? `${t('huddleIn')} #${huddle.entityLabel}`
      : `${t('huddleWith')} ${huddle.entityLabel || t('huddle')}`;

  const memberOverlayMap = useWorkspaceMemberStore(
    useShallow((s) => s.byWorkspace[huddle.workspaceId] || {}),
  );

  const displayDuration = huddle.endedAt
    ? formatDuration(huddle.durationSeconds)
    : t('startedAgo', { time: formatDistanceToNow(new Date(huddle.startedAt), { addSuffix: false }) });

  const handleClick = () => {
    if (!feedMessageId) return;

    if (huddle.entityType === "channel") {
      router.push(
        `/workspace/${huddle.workspaceId}/channel/${huddle.entityId}`,
      );
    } else {
      openDmInWorkspace(router, pathname, huddle.workspaceId, huddle.entityId);
    }

    setTimeout(() => {
      setFocusedMessageId(feedMessageId);
    }, 100);
  };

  const handleSaveTopic = async (topic: string) => {
    setIsSavingTopic(true);
    try {
      await updateHuddleTopicApi(huddle.workspaceId, huddle.id, topic || null);
      queryClient.setQueriesData(
        {
          predicate: (q) => {
            const k = q.queryKey;
            return (
              Array.isArray(k) &&
              k[0] === "huddles" &&
              k[2] === huddle.workspaceId &&
              k[3] === "recent"
            );
          },
        },
        (old: RecentHuddlesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            recent: old.recent.map((h) =>
              h.id === huddle.id ? { ...h, topic: topic || null } : h,
            ),
          };
        },
      );
      setOpenTopicDialog(false);
      toast.success(topic ? t('topicUpdated') : t('topicRemoved'));
    } catch {
      toast.error(t('failedToUpdateTopic'));
    } finally {
      setIsSavingTopic(false);
    }
  };

  const participantLabel = huddle.participantCount === 1 ? t('reply') : t('replies');
  const seeParticipantsLabel = t('seeParticipants', { count: huddle.participantCount });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group cursor-pointer relative flex items-center my-1 gap-3 p-3 rounded-lg border border-[#797c814d] hover:border-[#797c81] transition-colors  bg-white dark:bg-[#1A1D21]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 gap-2">
        <div className="shrink-0 w-10 h-10 flex items-center justify-center rounded dark:bg-[#2a2d31] bg-[#e8e8e8] overflow-hidden">
          <RiHeadphoneLine
            className={cn(
              "size-4 shrink-0",
              isActive ? "text-green-500" : "text-gray-400",
            )}
          />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="truncate text-sm font-semibold">{displayTitle}</span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>{displayTime}</span>
            <span>·</span>
            <span>{displayDuration}</span>
            {huddle.replyCount > 0 && (
              <>
                <span>·</span>
                <div className="flex shrink-0 items-center gap-1">
                  <span>{huddle.replyCount}</span>
                  <span>{participantLabel}</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <AvatarGroup
              className="shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                setOpenSeeParticipantsDialog(true);
              }}
            >
              {huddle.participants.slice(0, 3).map((participant) => {
                const overlay = memberOverlayMap[participant.userId];
                const label =
                  overlay?.displayName?.trim() ||
                  overlay?.name?.trim() ||
                  participant.displayName?.trim() ||
                  participant.name?.trim() ||
                  "U";
                const avatar = overlay?.avatar || participant.avatar;
                return (
                  <Avatar key={participant.id} className="size-6 rounded-md">
                    <AvatarImage src={avatar || ""} />
                    <AvatarFallback className="rounded-lg bg-sky-500 text-xs">
                      {label.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                );
              })}
              {huddle.participantCount > 3 && (
                <Avatar className="size-6 rounded-md">
                  <AvatarFallback className="rounded-lg bg-slate-500 text-xs">
                    +{huddle.participantCount - 3}
                  </AvatarFallback>
                </Avatar>
              )}
            </AvatarGroup>
          </TooltipTrigger>
          <TooltipContent>
            {seeParticipantsLabel}
          </TooltipContent>
        </Tooltip>

        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MdMoreVert className="size-6" />
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent>{t('moreActions')}</TooltipContent>
          </Tooltip>
          <PopoverContent side="bottom" align="center" withOverlay>
            <div className="flex flex-col py-2">
              <Button
                variant="submenu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenSeeParticipantsDialog(true);
                }}
              >
                {seeParticipantsLabel}
              </Button>
              {huddle.status === "ended" && feedMessageId && (
                <Button
                  variant="submenu"
                  onClick={(e) => {
                    e.stopPropagation();
                    void handleToggleSave();
                  }}
                >
                  {isSaved ? t('removeFromLater') : t('saveForLater')}
                </Button>
              )}
              <Button
                variant="submenu"
                onClick={(e) => {
                  e.stopPropagation();
                  setOpenTopicDialog(true);
                }}
              >
                {huddle.topic ? t('editTopic') : t('addTopic')}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div onClick={(e) => e.stopPropagation()} className="hidden">
        <SeeParticipantsDialog
          open={openSeeParticipantsDialog}
          onOpenChange={setOpenSeeParticipantsDialog}
          title={displayTitle}
          participants={huddle.participants}
          workspaceId={huddle.workspaceId}
        />
      </div>

      <div onClick={(e) => e.stopPropagation()} className="hidden">
        <AddEditHuddleTopicDialog
          open={openTopicDialog}
          setOpen={setOpenTopicDialog}
          initialTopic={huddle.topic}
          onSave={handleSaveTopic}
          isLoading={isSavingTopic}
        />
      </div>
    </div>
  );
}
