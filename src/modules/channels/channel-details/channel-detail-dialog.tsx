import { fetchChannelMembersApi } from "@/apis";
import { Channel } from "@/lib/types";
import { channelKeys } from "@/lib/query-keys";
import {
  CustomDialog,
  CustomDialogHeader,
  CustomDialogTitle,
  CustomDialogBody,
} from "../../../components/custom-dialog";
import Typography from "../../../components/ui/typography";
import { FiHash } from "react-icons/fi";
import { Button } from "../../../components/ui/button";
import { SlStar } from "react-icons/sl";
import NotificationPopover from "../../../components/popovers/notification-popover";
import { RiHeadphoneLine } from "react-icons/ri";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useThemeStore } from "@/stores/useThemeStore";
import { useQuery } from "@tanstack/react-query";
import AboutTab from "./about-tab";
import MembersTab from "./members-tab";
import SettingsTab from "./settings-tab";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentChannelData: Channel;
}

export default function ChannelDetailDialog({
  open,
  onOpenChange,
  currentChannelData,
}: Props) {
  const [activeTab, setActiveTab] = useState<string>("about");
  const { theme: storeTheme } = useThemeStore();

  const workspaceId = currentChannelData.workspaceId;
  const channelId = currentChannelData.id;

  const { data: membersForCount, isPending: membersCountPending } = useQuery({
    queryKey: channelKeys.members(workspaceId, channelId, ""),
    queryFn: () => fetchChannelMembersApi(workspaceId, channelId),
    enabled: open && !!workspaceId && !!channelId,
    staleTime: 30_000,
  });

  const membersTabLabel = !open
    ? "Members"
    : membersCountPending
      ? "Members"
      : `Members ${membersForCount?.inChannel?.length ?? 0}`;

  return (
    <CustomDialog open={open} onOpenChange={onOpenChange} maxWidth="600px">
      <div className="flex flex-col px-6 py-4">
        <CustomDialogHeader
          onOpenChange={onOpenChange}
          className="border-none p-0"
        >
          <CustomDialogTitle>
            <div className="flex items-center gap-1">
              <FiHash size={18} />
              <Typography
                text={currentChannelData.name}
                variant="h4"
                className=""
              />
            </div>
          </CustomDialogTitle>
        </CustomDialogHeader>
        <div className="flex items-center gap-2">
          <Button size="custom" className="p-1 border">
            <SlStar size={18} />
          </Button>
          <NotificationPopover />
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

          <button
            type="button"
            onClick={() => setActiveTab("tabs")}
            className={cn(
              "flex items-center gap-1.5 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
              activeTab === "tabs"
                ? ``
                : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
            )}
            style={
              activeTab === "tabs"
                ? {
                    borderColor: storeTheme.selectedItems,
                    borderBottomWidth: 3,
                    color: storeTheme.selectedItems,
                  }
                : {}
            }
          >
            <Typography text="Tabs" variant="p" className="text-[13px]!" />
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("about")}
            className={cn(
              "flex items-center gap-1.5 py-2 -mb-px border-b-2 transition-colors rounded-t-md font-bold",
              activeTab === "settings"
                ? ``
                : "border-transparent text-[#616061] dark:text-[#ababad] hover:text-[#1d1c1d] dark:hover:text-[#f9f8f9] font-normal",
            )}
            style={
              activeTab === "settings"
                ? {
                    borderColor: storeTheme.selectedItems,
                    borderBottomWidth: 3,
                    color: storeTheme.selectedItems,
                  }
                : {}
            }
          >
            <Typography text="Settings" variant="p" className="text-[13px]!" />
          </button>
        </div>
      </div>

      <CustomDialogBody
        className="bg-[#F8F8F8] dark:bg-[#1A1D21]"
      >
        {activeTab === "about" && (
          <AboutTab currentChannelData={currentChannelData} />
        )}
        {activeTab === "members" && (
          <MembersTab currentChannelData={currentChannelData} onOpenChange={onOpenChange} />
        )}
        {activeTab === "settings" && (
          <SettingsTab currentChannelData={currentChannelData} onOpenChange={onOpenChange} />
        )}
      </CustomDialogBody>
    </CustomDialog>
  );
}
