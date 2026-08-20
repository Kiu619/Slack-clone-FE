"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import Typography from "@/components/ui/typography";
import { cn } from "@/lib/utils";
import { LuMic, LuRefreshCw, LuSpeaker } from "react-icons/lu";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ACTIVE_ITEM_STYLE } from "@/constants/styles";
import { FiCheck } from "react-icons/fi";
import { Separator } from "@/components/ui/separator";
import { useHuddle } from "@/hooks/use-translation";

type MicDeviceSelectorPopoverProps = {
  children: React.ReactNode;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  selectedMicId: string;
  selectedSpeakerId: string;
  onSelectMic: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onRefresh: () => void;
};

function DeviceListItem({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      variant="checkedMenu"
      onClick={onClick}
      className={cn(isSelected && ACTIVE_ITEM_STYLE)}
    >
      <span className="text-sm font-medium">{label}</span>
      {isSelected ? <FiCheck size={14} className="text-white" /> : null}
    </Button>
  );
}

export function MicDeviceSelectorPopover({
  children,
  audioInputs,
  audioOutputs,
  selectedMicId,
  selectedSpeakerId,
  onSelectMic,
  onSelectSpeaker,
  onRefresh,
}: MicDeviceSelectorPopoverProps) {
  const t = useHuddle()
  const [open, setOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="center" sideOffset={8} withOverlay>
        <div className="flex flex-col py-2 w-fit">
          {/* Microphone Section */}
          <div className="flex flex-col gap-1">
            <div className="mb-1 flex items-center gap-2 px-5">
              <LuMic
                size={14}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Typography
                text={t("microphone")}
                variant="p"
                className="text-[11px]! font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
              />
            </div>
            <div className="flex flex-col ">
              {audioInputs.length === 0 ? (
                <p className="px-3 py-2 text-sm text-neutral-500">
                  {t("noMicrophoneFound")}
                </p>
              ) : (
                audioInputs.map((device) => (
                  <DeviceListItem
                    key={device.deviceId}
                    label={
                      device.label ||
                      `Microphone ${device.deviceId.slice(0, 8)}`
                    }
                    isSelected={selectedMicId === device.deviceId}
                    onClick={() => {
                      onSelectMic(device.deviceId);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          <Separator className="my-2" />

          {/* Speaker Section */}
          <div className="flex flex-col gap-1">
            <div className="mb-1 flex items-center gap-2 px-1  px-5">
              <LuSpeaker
                size={14}
                className="text-neutral-500 dark:text-neutral-400"
              />
              <Typography
                text={t("speaker")}
                variant="p"
                className="text-[11px]! font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400"
              />
            </div>
            <div className="flex flex-col">
              {audioOutputs.length === 0 ? (
                <p className="px-3 py-2 text-sm text-neutral-500">
                  {t("noSpeakerFound")}
                </p>
              ) : (
                audioOutputs.map((device) => (
                  <DeviceListItem
                    key={device.deviceId}
                    label={
                      device.label || `Speaker ${device.deviceId.slice(0, 8)}`
                    }
                    isSelected={selectedSpeakerId === device.deviceId}
                    onClick={() => {
                      onSelectSpeaker(device.deviceId);
                      setOpen(false);
                    }}
                  />
                ))
              )}
            </div>
          </div>

          {/* Refresh Button */}
          <div className="flex justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="h-7 gap-1.5 text-xs text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200"
            >
              <LuRefreshCw
                size={13}
                className={cn(refreshing && "animate-spin")}
              />
              {t("refresh")}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
