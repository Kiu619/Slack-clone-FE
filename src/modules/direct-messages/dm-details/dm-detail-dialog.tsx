"use client";

import { DirectMessageConversation } from "@/lib/types";
import { useStarConversation } from "@/hooks/use-conversation";
import { cn } from "@/lib/utils";
import { useThemeStore } from "@/stores/useThemeStore";
import { useState } from "react";
import { RiHeadphoneLine } from "react-icons/ri";
import { SlStar } from "react-icons/sl";
import { FaStar } from "react-icons/fa6";
import {
  CustomDialog,
  CustomDialogBody,
  CustomDialogHeader,
  CustomDialogTitle,
} from "@/components/custom-dialog";
import { Button } from "@/components/ui/button";
import Typography from "@/components/ui/typography";
import AboutTab from "./about-tab";
import MembersTab from "./members-tab";
import DMsNotificationPopover from "@/components/popovers/dm-notification-popover";

interface Props {
  dmName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentDmData: DirectMessageConversation;
}

export default function DMDetailDialog({
  dmName,
  open,
  onOpenChange,
  currentDmData,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("about");
  const { theme: storeTheme } = useThemeStore();
  const starMutation = useStarConversation(
    currentDmData.workspaceId,
    currentDmData.id,
  );
  const isStarred = Boolean(currentDmData.starredAt);

  const isGroup = currentDmData.isGroup;
  const membersCount = currentDmData.members.length;

  const safeTab =
    activeTab === "members" && !isGroup ? "about" : activeTab;

  const membersTabLabel =
    !open || !isGroup ? "Members" : `Members ${membersCount}`;

  return (
    <CustomDialog
      key={open ? currentDmData.id : "dm-detail-shut"}
      open={open}
      onOpenChange={onOpenChange}
      maxWidth="600px"
    >
      <div className="flex flex-col px-6 py-4">
        <CustomDialogHeader
          onOpenChange={onOpenChange}
          className="border-none p-0"
        >
          <CustomDialogTitle>
            <div className="flex items-center gap-1">
              <Typography text={dmName} variant="h4" className="" />
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>
        <div className="flex items-center gap-2">
          <Button
            size="custom"
            className="p-1 border"
            disabled={starMutation.isPending}
            onClick={() => starMutation.mutate(!isStarred)}
          >
            {isStarred ? (
              <FaStar size={18} className="text-amber-400" />
            ) : (
              <SlStar size={18} />
            )}
          </Button>
          <DMsNotificationPopover />
          <Button size="custom" className="p-1 border">
            <RiHeadphoneLine size={20} />
          </Button>
        </div>
        <div className="flex items-center gap-x-4 border-b border-transparent">
          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={cn(
              "flex items-center gap-1.5 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
              activeTab === "about"
                ? ``
                : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
            )}
            style={
              activeTab === "about"
                ? {
                    borderColor: storeTheme.selectedItems,
                    borderBottomWidth: 3,
                    color: storeTheme.selectedItems,
                  }
                : {}
            }
          >
            <Typography text="About" variant="p" className="text-[13px]!" />
          </button>

          {isGroup ? (
            <button
              type="button"
              onClick={() => setActiveTab("members")}
              className={cn(
                "flex items-center gap-1.5 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
                activeTab === "members"
                  ? ``
                  : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
              )}
              style={
                activeTab === "members"
                  ? {
                      borderColor: storeTheme.selectedItems,
                      borderBottomWidth: 3,
                      color: storeTheme.selectedItems,
                    }
                  : {}
              }
            >
              <Typography
                text={membersTabLabel}
                variant="p"
                className="text-[13px]!"
              />
            </button>
          ) : null}
        </div>
      </div>

      <CustomDialogBody className="bg-[#F8F8F8] dark:bg-[#1A1D21]">
        {safeTab === "about" && (
          <AboutTab currentDmData={currentDmData} />
        )}
        {safeTab === "members" && isGroup && (
          <MembersTab
            currentDmData={currentDmData}
            onOpenChange={onOpenChange}
          />
        )}
      </CustomDialogBody>
    </CustomDialog>
  );
}
