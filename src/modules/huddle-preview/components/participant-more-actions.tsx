"use client";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  LuMic,
  LuMicOff,
  LuPin,
  LuPinOff,
  LuUser,
  LuVideo,
  LuVideoOff,
  LuEyeOff,
  LuEye,
} from "react-icons/lu";
import { useState } from "react";
import { MdMoreVert } from "react-icons/md";

interface ParticipantMoreActionsProps {
  isLocal: boolean;
  isMuted: boolean;
  isCameraEnabled: boolean;
  isPinned: boolean;
  isSelfViewHidden?: boolean;
  isSoloParticipant?: boolean;
  onViewProfile: () => void;
  onToggleMute?: () => void;
  onToggleCamera?: () => void;
  onPin?: () => void;
  onUnpin?: () => void;
  onHideSelfView?: () => void;
  onShowSelfView?: () => void;
  onMute?: () => void;
  className?: string;
}

export function ParticipantMoreActions({
  isLocal,
  isMuted,
  isCameraEnabled,
  isPinned,
  isSelfViewHidden,
  isSoloParticipant,
  onViewProfile,
  onToggleMute,
  onToggleCamera,
  onPin,
  onUnpin,
  onHideSelfView,
  onShowSelfView,
  onMute,
  className,
}: ParticipantMoreActionsProps) {
  const [open, setOpen] = useState(false);

  const handleAction = (action: () => void) => {
    action();
    setOpen(false);
  };

  if (isLocal) {
    const showHideSelfView = isSelfViewHidden ? onShowSelfView : onHideSelfView;
    const showHideSelfViewButton = showHideSelfView && !isSoloParticipant;
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            className={cn(
              "absolute right-2 top-2 z-20 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
              "bg-black/70 hover:bg-black/80 text-white",
              className,
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <MdMoreVert className="h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          side="left"
          align="start"
          sideOffset={8}
        >
          <div className="py-2">
            {onToggleMute && (
              <Button
                variant="submenu"
                onClick={() => handleAction(onToggleMute)}
              >
                {isMuted ? (
                  <>
                    <LuMic className="h-4 w-4" />
                    <span>Unmute microphone</span>
                  </>
                ) : (
                  <>
                    <LuMicOff className="h-4 w-4" />
                    <span>Mute microphone</span>
                  </>
                )}
              </Button>
            )}
            {onToggleCamera && (
              <Button
                variant="submenu"
                onClick={() => handleAction(onToggleCamera)}
              >
                {isCameraEnabled ? (
                  <>
                    <LuVideoOff className="h-4 w-4" />
                    <span>Turn off camera</span>
                  </>
                ) : (
                  <>
                    <LuVideo className="h-4 w-4" />
                    <span>Turn on camera</span>
                  </>
                )}
              </Button>
            )}
            {showHideSelfViewButton && (
              <Button
                variant="submenu"
                onClick={() => handleAction(showHideSelfView)}
              >
                {isSelfViewHidden ? (
                  <>
                    <LuEye className="h-4 w-4" />
                    <span>Show self-view</span>
                  </>
                ) : (
                  <>
                    <LuEyeOff className="h-4 w-4" />
                    <span>Hide self-view</span>
                  </>
                )}
              </Button>
            )}
          </div>
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          size="icon"
          className={cn(
            "absolute right-2 top-2 z-20 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity",
            "bg-black/70 hover:bg-black/80 text-white",
            className,
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <MdMoreVert className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        side="left"
        align="start"
        sideOffset={8}
      >
        <div className="py-2">
          <Button variant="submenu" onClick={() => handleAction(onViewProfile)}>
            <LuUser className="h-4 w-4" />
            <span>View profile</span>
          </Button>
          {onMute && (
            <Button variant="submenu" onClick={() => handleAction(onMute)}>
              {isMuted ? (
                <>
                  <LuMic className="h-4 w-4" />
                  <span>Unmute microphone</span>
                </>
              ) : (
                <>
                  <LuMicOff className="h-4 w-4" />
                  <span>Mute microphone</span>
                </>
              )}
            </Button>
          )}
          {isPinned ? (
            <Button variant="submenu" onClick={() => handleAction(onUnpin!)}>
              <LuPinOff className="h-4 w-4" />
              <span>Unpin participant</span>
            </Button>
          ) : (
            onPin && (
              <Button variant="submenu" onClick={() => handleAction(onPin)}>
                <LuPin className="h-4 w-4" />
                <span>Pin participant</span>
              </Button>
            )
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
