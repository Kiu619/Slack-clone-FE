"use client";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import Typography from "@/components/ui/typography";
import type { HuddleParticipantSnapshot } from "@/lib/huddle";
import type { User } from "@/lib/types";
import { cn } from "@/lib/utils";
import { HuddleReactionPicker } from "@/modules/huddle-preview/components/huddle-reaction-picker";
import { HuddleReactionToastStack } from "@/modules/huddle-preview/components/huddle-reaction-toast-stack";
import {
    ParticipantTile,
    ScreenShareTile,
} from "@/modules/huddle-preview/huddle-preview.media";
import {
    formatParticipantCount,
    parseHuddleParticipantMetadata,
} from "@/modules/huddle-preview/huddle-preview.utils";
import type { ActiveHuddleReaction } from "@/modules/huddle-preview/huddle-reactions";
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore";
import { ConnectionQuality, type LocalParticipant, type RemoteParticipant } from "livekit-client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { IoChevronUpOutline } from "react-icons/io5";
import {
    LuHand,
    LuMessageSquare,
    LuMic,
    LuMicOff,
    LuMonitor,
    LuMonitorOff,
    LuVideo,
    LuVideoOff,
} from "react-icons/lu";
import { CameraDeviceSelectorPopover } from "./camera-device-selector-popover";
import { MicDeviceSelectorPopover } from "./mic-device-selector-popover";
import { MoreActionsToolbarButton } from "./more-actions-popover";

type HuddleLiveStageProps = {
  workspaceId: string;
  liveTitle: string;
  phaseLabel: string;
  participantCount: number;
  liveError: string | null;
  participants: Array<LocalParticipant | RemoteParticipant>;
  liveSessionParticipants: HuddleParticipantSnapshot[];
  activeSpeakerIds: string[];
  currentUserAvatar: string | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  isScreenSharing: boolean;
  screenShareCount: number;
  isCurrentUserRaisedHand: boolean;
  activeReactionsByParticipant: Record<string, ActiveHuddleReaction[]>;
  recentReactionToasts: ActiveHuddleReaction[];
  currentUserId: string | null;
  selectedSpeakerId: string;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleRaiseHand: () => void;
  onSendReaction: (emoji: string) => void | Promise<void>;
  isThreadOpen: boolean;
  isThreadAvailable: boolean;
  hasThreadUnread: boolean;
  onToggleThread: () => void;
  onLeave: () => void;
  onViewProfile: (user: User) => void;
  pinnedParticipantIdentity: string | null;
  onPinParticipant: (identity: string) => void;
  onUnpinParticipant: () => void;
  isSelfViewHidden: boolean;
  onHideSelfView: () => void;
  onShowSelfView: () => void;
  onMuteParticipant: (identity: string) => void;
  isSoloParticipant: boolean;
  audioInputs: MediaDeviceInfo[];
  audioOutputs: MediaDeviceInfo[];
  selectedMicId: string;
  onSelectMic: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onRefreshDevices: () => void;
  previewStream: MediaStream | null;
  videoInputs: MediaDeviceInfo[];
  selectedCameraId: string;
  onSelectCamera: (deviceId: string) => void;
  topic: string | null;
  onAddOrEditTopic: () => void;
};

export function HuddleLiveStage({
  workspaceId,
  liveTitle,
  phaseLabel,
  participantCount,
  liveError,
  participants,
  liveSessionParticipants,
  activeSpeakerIds,
  currentUserAvatar,
  isMicEnabled,
  isCameraEnabled,
  isScreenSharing,
  screenShareCount,
  isCurrentUserRaisedHand,
  activeReactionsByParticipant,
  recentReactionToasts,
  currentUserId,
  selectedSpeakerId,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleRaiseHand,
  onSendReaction,
  isThreadOpen,
  isThreadAvailable,
  hasThreadUnread,
  onToggleThread,
  onLeave,
  onViewProfile,
  pinnedParticipantIdentity,
  onPinParticipant,
  onUnpinParticipant,
  isSelfViewHidden,
  onHideSelfView,
  onShowSelfView,
  onMuteParticipant,
  isSoloParticipant,
  audioInputs,
  audioOutputs,
  selectedMicId,
  onSelectMic,
  onSelectSpeaker,
  onRefreshDevices,
  previewStream,
  videoInputs,
  selectedCameraId,
  onSelectCamera,
  topic,
  onAddOrEditTopic,
}: HuddleLiveStageProps) {
  const workspaceMembers = useWorkspaceMemberStore(
    (state) => state.byWorkspace[workspaceId],
  );

  const participantSnapshotMap = useMemo(() => {
    const entries = liveSessionParticipants.map(
      (participant) => [participant.userId, participant] as const,
    );
    return Object.fromEntries(entries) as Record<
      string,
      HuddleParticipantSnapshot
    >;
  }, [liveSessionParticipants]);

  const isScreenShareDisabled = screenShareCount >= 2 && !isScreenSharing;
  const [selectedScreenShareParticipant, setSelectedScreenShareParticipant] =
    useState<string | null>(null);

  // ARIA live region for screen reader announcements
  const [announcement, setAnnouncement] = useState("");

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case "m":
          e.preventDefault();
          onToggleMic();
          setAnnouncement(isMicEnabled ? "Microphone muted" : "Microphone unmuted");
          break;
        case "v":
          e.preventDefault();
          onToggleCamera();
          setAnnouncement(isCameraEnabled ? "Camera off" : "Camera on");
          break;
        case "s":
          if (!isScreenShareDisabled) {
            e.preventDefault();
            onToggleScreenShare();
            setAnnouncement(isScreenSharing ? "Screen share stopped" : "Screen sharing");
          }
          break;
        case "r":
          e.preventDefault();
          onToggleRaiseHand();
          setAnnouncement(isCurrentUserRaisedHand ? "Hand lowered" : "Hand raised");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onToggleMic, onToggleCamera, onToggleScreenShare, onToggleRaiseHand, isScreenShareDisabled]);

  const resolveParticipantLabel = useCallback(
    (participantId: string, isLocal = false) => {
      if (isLocal || participantId === currentUserId) return "You";

      const member = workspaceMembers?.[participantId];
      const snapshot = participantSnapshotMap[participantId];
      const liveParticipant = participants.find(
        (participant) => participant.identity === participantId,
      );
      const participantMetadata = parseHuddleParticipantMetadata(
        liveParticipant?.metadata,
      );

      return (
        member?.displayName?.trim() ||
        member?.name?.trim() ||
        snapshot?.displayName?.trim() ||
        snapshot?.name?.trim() ||
        participantMetadata?.displayName?.trim() ||
        participantMetadata?.name?.trim() ||
        liveParticipant?.name?.trim() ||
        participantId ||
        "Participant"
      );
    },
    [currentUserId, participantSnapshotMap, participants, workspaceMembers],
  );

  const reactionToastItems = useMemo(
    () =>
      recentReactionToasts.map((reaction) => ({
        id: reaction.id,
        emoji: reaction.emoji,
        displayName: resolveParticipantLabel(
          reaction.participantId,
          reaction.participantId === currentUserId,
        ),
      })),
    [currentUserId, recentReactionToasts, resolveParticipantLabel],
  );

  const { screenShareItems, participantItems } = useMemo(() => {
    const screenShareItems: Array<{
      identity: string;
      participant: LocalParticipant | RemoteParticipant;
      displayName: string;
      avatarSrc: string | null;
      avatarLabel: string;
      isMuted: boolean;
      onSelect: () => void;
      onViewProfile: () => void;
    }> = [];
    const participantItems: Array<{
      identity: string;
      participant: LocalParticipant | RemoteParticipant;
      isLocal: boolean;
      isActiveSpeaker: boolean;
      displayName: string;
      avatarSrc: string | null;
      avatarLabel: string;
      isRaisedHand: boolean;
      isMuted: boolean;
      isCameraEnabled: boolean;
      floatingReactions: ActiveHuddleReaction[];
      connectionQuality: ConnectionQuality;
      onViewProfile: () => void;
      onPin: () => void;
      onUnpin: () => void;
      onHideSelfView?: () => void;
      onShowSelfView?: () => void;
      onMute?: () => void;
      isSoloParticipant: boolean;
    }> = [];

    participants.forEach((participant, index) => {
      const isLocal = index === 0;
      const identity = participant.identity || `participant-${index}`;
      const isActiveSpeaker = activeSpeakerIds.includes(identity);
      const member = workspaceMembers?.[identity];
      const snapshot = participantSnapshotMap[identity];
      const participantMetadata = parseHuddleParticipantMetadata(
        participant.metadata,
      );
      const resolvedDisplayName =
        member?.displayName?.trim() ||
        member?.name?.trim() ||
        snapshot?.displayName?.trim() ||
        snapshot?.name?.trim() ||
        participantMetadata?.displayName?.trim() ||
        participantMetadata?.name?.trim() ||
        participant.name?.trim() ||
        identity ||
        "Participant";
      const displayName = isLocal ? "You" : resolvedDisplayName;
      const avatarLabel =
        member?.displayName?.trim() ||
        member?.name?.trim() ||
        snapshot?.displayName?.trim() ||
        snapshot?.name?.trim() ||
        participantMetadata?.displayName?.trim() ||
        participantMetadata?.name?.trim() ||
        participant.name?.trim() ||
        identity ||
        "Participant";
      const avatarSrc =
        member?.avatar?.trim() ||
        snapshot?.avatar?.trim() ||
        participantMetadata?.avatar?.trim() ||
        (isLocal ? currentUserAvatar : null);

      const handleScreenShareSelect = () => {
        setSelectedScreenShareParticipant((prev) =>
          prev === identity ? null : identity,
        );
      };

      const handleViewProfile = () => {
        const member = workspaceMembers?.[identity];
        const userData: User = {
          id: identity,
          email: member?.email ?? `${identity}@placeholder.local`,
          name: displayName,
          displayName: displayName,
          avatar: avatarSrc ?? undefined,
        };
        onViewProfile(userData);
      };

      const isMuted =
        participant.isMicrophoneEnabled === false ||
        [...participant.audioTrackPublications.values()].some(
          (pub) => pub.isMuted,
        );

      const isCameraEnabled = participant.isCameraEnabled;

      if (participant.isScreenShareEnabled) {
        screenShareItems.push({
          identity,
          participant,
          displayName,
          avatarSrc,
          avatarLabel,
          isMuted,
          onSelect: handleScreenShareSelect,
          onViewProfile: handleViewProfile,
        });
      }

      participantItems.push({
        identity,
        participant,
        isLocal,
        isActiveSpeaker,
        displayName,
        avatarSrc,
        avatarLabel,
        isRaisedHand: participantMetadata?.isRaisedHand === true,
        isMuted,
        isCameraEnabled,
        floatingReactions: activeReactionsByParticipant[identity] ?? [],
        connectionQuality: participant.connectionQuality,
        onViewProfile: handleViewProfile,
        onPin: () => onPinParticipant(identity),
        onUnpin: onUnpinParticipant,
        onHideSelfView: isLocal ? onHideSelfView : undefined,
        onShowSelfView: isLocal ? onShowSelfView : undefined,
        onMute: !isLocal ? () => onMuteParticipant(identity) : undefined,
        isSoloParticipant,
      });
    });

    return { screenShareItems, participantItems };
  }, [
    participants,
    activeSpeakerIds,
    workspaceMembers,
    participantSnapshotMap,
    currentUserAvatar,
    activeReactionsByParticipant,
    onViewProfile,
    onPinParticipant,
    onUnpinParticipant,
    onHideSelfView,
    onShowSelfView,
    onMuteParticipant,
    isSoloParticipant,
  ]);

  const selectedScreenShare = screenShareItems.find(
    (item) => item.identity === selectedScreenShareParticipant,
  );

  const visibleParticipantItems = isSelfViewHidden
    ? participantItems.filter((item) => !item.isLocal)
    : participantItems;

  const sidebarItems = [
    ...screenShareItems
      .filter((item) => item.identity !== selectedScreenShareParticipant)
      .map((item) => ({ kind: "screenShare" as const, ...item })),
    ...visibleParticipantItems.map((item) => ({
      kind: "participant" as const,
      ...item,
    })),
  ];

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col justify-between overflow-hidden rounded-lg p-3.5 shadow-[0_28px_90px_rgba(0,0,0,0.4)]">
      <div className="flex flex-none items-center justify-between rounded-[16px] px-3.5 py-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="rounded-full bg-black/20 px-3 py-1.5">
            <Typography
              text={liveTitle}
              variant="p"
              className="text-[15px]! font-semibold text-white"
            />
          </div>
          <Typography
            text={formatParticipantCount(participantCount)}
            variant="p"
            className="text-[13px]! text-white/70"
          />
        </div>
        <div className="rounded-full bg-black/20 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white/88">
          {phaseLabel}
        </div>
      </div>

      {/* ARIA live region for screen reader announcements */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {announcement}
      </div>

      <div className="relative mt-3 flex flex-1 min-h-0 min-w-0 flex-col overflow-hidden rounded-[20px] p-3.5">
        <HuddleReactionToastStack items={reactionToastItems} />
        {!isMicEnabled && isCameraEnabled && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-amber-500 px-4 py-2 text-[13px] font-medium text-white shadow-lg animate-in fade-in slide-in-from-bottom-2">
            <LuMicOff size={16} />
            <span>You're muted</span>
            <button
              onClick={onToggleMic}
              className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[12px] hover:bg-white/30"
            >
              Unmute
            </button>
          </div>
        )}
        <div className="flex min-h-0 w-full flex-1 min-w-0 gap-2.5">
          {selectedScreenShare ? (
            <>
              <div className="flex min-h-0 min-w-0 flex-1 items-stretch justify-center">
                <ScreenShareTile
                  key={`screen-${selectedScreenShare.identity}`}
                  participant={selectedScreenShare.participant}
                  displayName={selectedScreenShare.displayName}
                  avatarSrc={selectedScreenShare.avatarSrc}
                  avatarLabel={selectedScreenShare.avatarLabel}
                  onSelect={selectedScreenShare.onSelect}
                  isSelected
                  variant="spotlight"
                />
              </div>
              <div className="flex w-[160px] md:w-[220px] flex-none flex-col gap-2.5 overflow-y-auto">
                {sidebarItems.map((item) =>
                  item.kind === "screenShare" ? (
                    <ScreenShareTile
                      key={`screen-${item.identity}`}
                      participant={item.participant}
                      displayName={item.displayName}
                      avatarSrc={item.avatarSrc}
                      avatarLabel={item.avatarLabel}
                      onSelect={item.onSelect}
                      variant="sidebar"
                    />
                  ) : (
                    <ParticipantTile
                      key={item.identity}
                      participant={item.participant}
                      isLocal={item.isLocal}
                      isActiveSpeaker={item.isActiveSpeaker}
                      displayName={item.displayName}
                      avatarSrc={item.avatarSrc}
                      avatarLabel={item.avatarLabel}
                      isRaisedHand={item.isRaisedHand}
                      isMuted={item.isMuted}
                      isCameraEnabled={item.isCameraEnabled}
                      floatingReactions={item.floatingReactions}
                      connectionQuality={item.connectionQuality}
                      speakerId={selectedSpeakerId}
                      onViewProfile={item.onViewProfile}
                      isPinned={pinnedParticipantIdentity === item.identity}
                      onPin={item.onPin}
                      onUnpin={item.onUnpin}
                      onToggleMute={
                        isSelfViewHidden
                          ? undefined
                          : item.isLocal
                            ? onToggleMic
                            : undefined
                      }
                      onHideSelfView={item.onHideSelfView}
                      onShowSelfView={item.onShowSelfView}
                      isSelfViewHidden={isSelfViewHidden}
                      onMute={item.onMute}
                      isSoloParticipant={isSoloParticipant}
                      onToggleCamera={item.isLocal ? onToggleCamera : undefined}
                      variant="sidebar"
                    />
                  ),
                )}
              </div>
            </>
          ) : screenShareItems.length > 0 ||
            visibleParticipantItems.length > 0 ? (
            <div className="flex min-h-0 w-full flex-wrap items-center justify-center gap-2.5">
              {screenShareItems.map((item) => (
                <ScreenShareTile
                  key={`screen-${item.identity}`}
                  participant={item.participant}
                  displayName={item.displayName}
                  avatarSrc={item.avatarSrc}
                  avatarLabel={item.avatarLabel}
                  onSelect={item.onSelect}
                  variant="grid"
                />
              ))}
              {visibleParticipantItems.map((item) => (
                <ParticipantTile
                  key={item.identity}
                  participant={item.participant}
                  isLocal={item.isLocal}
                  isActiveSpeaker={item.isActiveSpeaker}
                  displayName={item.displayName}
                  avatarSrc={item.avatarSrc}
                  avatarLabel={item.avatarLabel}
                  isRaisedHand={item.isRaisedHand}
                  isMuted={item.isMuted}
                  isCameraEnabled={item.isCameraEnabled}
                  floatingReactions={item.floatingReactions}
                  connectionQuality={item.connectionQuality}
                  speakerId={selectedSpeakerId}
                  onViewProfile={item.onViewProfile}
                  isPinned={pinnedParticipantIdentity === item.identity}
                  onPin={item.onPin}
                  onUnpin={item.onUnpin}
                  onToggleMute={
                    isSelfViewHidden
                      ? undefined
                      : item.isLocal
                        ? onToggleMic
                        : undefined
                  }
                  onHideSelfView={item.onHideSelfView}
                  onShowSelfView={item.onShowSelfView}
                  isSelfViewHidden={isSelfViewHidden}
                  onMute={item.onMute}
                  isSoloParticipant={isSoloParticipant}
                  onToggleCamera={item.isLocal ? onToggleCamera : undefined}
                  variant="grid"
                />
              ))}
            </div>
          ) : (
            <div className="flex h-full min-h-[280px] items-center justify-center rounded-[18px] border border-white/10 bg-black/20 text-center text-white/70">
              Waiting for participants...
            </div>
          )}
        </div>

        {liveError ? (
          <div className="mt-3 rounded-[14px] border border-red-400/25 bg-red-500/12 px-3.5 py-2 text-sm text-red-100">
            {liveError}
          </div>
        ) : null}
      </div>

      <div className="mt-3 flex flex-none items-center justify-center gap-2.5 rounded-[18px] bg-black/10 px-3 py-3 ">
        <div
          className={cn(
            "flex items-center rounded-md overflow-hidden cursor-pointer",
            isMicEnabled
              ? "bg-[#7b6847] hover:bg-[#8a764b]"
              : "bg-white/20 hover:bg-white/24",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-11 w-8 items-center justify-center  text-white cursor-pointer hover:bg-white/30",
                )}
                onClick={onToggleMic}
                aria-label={
                  isMicEnabled ? "Mute microphone" : "Unmute microphone"
                }
              >
                {isMicEnabled ? <LuMic size={20} /> : <LuMicOff size={20} />}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isMicEnabled ? "Mute microphone" : "Unmute microphone"}
              <span className="ml-2 text-muted-foreground">(M)</span>
            </TooltipContent>
          </Tooltip>

          <span className="h-8 w-px bg-white/50" />
          <Tooltip>
            <MicDeviceSelectorPopover
              audioInputs={audioInputs}
              audioOutputs={audioOutputs}
              selectedMicId={selectedMicId}
              selectedSpeakerId={selectedSpeakerId}
              onSelectMic={onSelectMic}
              onSelectSpeaker={onSelectSpeaker}
              onRefresh={onRefreshDevices}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-6 items-center justify-center  text-white hover:bg-white/30 cursor-pointer"
                  aria-label="Camera settings"
                >
                  <IoChevronUpOutline size={20} />
                </button>
              </TooltipTrigger>
            </MicDeviceSelectorPopover>
            <TooltipContent>Select microphone</TooltipContent>
          </Tooltip>
        </div>

        <div
          className={cn(
            "flex items-center rounded-md overflow-hidden cursor-pointer",
            isCameraEnabled
              ? "bg-[#7b6847] hover:bg-[#8a764b]"
              : "bg-white/20 hover:bg-white/24",
          )}
        >
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-11 w-8 items-center justify-center  text-white cursor-pointer hover:bg-white/30",
                )}
                onClick={onToggleCamera}
                aria-label={
                  isCameraEnabled ? "Turn camera off" : "Turn camera on"
                }
              >
                {isCameraEnabled ? (
                  <LuVideo size={20} />
                ) : (
                  <LuVideoOff size={20} />
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {isCameraEnabled ? "Turn camera off" : "Turn camera on"}
              <span className="ml-2 text-muted-foreground">(V)</span>
            </TooltipContent>
          </Tooltip>

          <span className="h-8 w-px bg-white/50" />
          <Tooltip>
            <CameraDeviceSelectorPopover
              isCameraEnabled={isCameraEnabled}
              videoInputs={videoInputs}
              selectedCameraId={selectedCameraId}
              onSelectCamera={onSelectCamera}
              onToggleCamera={onToggleCamera}
              onRefresh={onRefreshDevices}
            >
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="flex h-11 w-6 items-center justify-center  text-white hover:bg-white/30 cursor-pointer"
                  aria-label="Camera settings"
                >
                  <IoChevronUpOutline size={20} />
                </button>
              </TooltipTrigger>
            </CameraDeviceSelectorPopover>
            <TooltipContent>Select camera</TooltipContent>
          </Tooltip>
        </div>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="custom"
              className={cn(
                "flex h-11 w-11 items-center justify-center  text-white",
                isCurrentUserRaisedHand
                  ? "bg-[#7b6847] hover:bg-[#8a764b]"
                  : "bg-white/20 hover:bg-white/40",
              )}
              onClick={onToggleRaiseHand}
              aria-label={isCurrentUserRaisedHand ? "Lower hand" : "Raise hand"}
            >
              <LuHand size={20} />
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isCurrentUserRaisedHand ? "Lower hand" : "Raise hand"}
            <span className="ml-2 text-muted-foreground">(R)</span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              size="custom"
              className={cn(
                "flex h-11 w-11 items-center justify-center  text-white",
                isScreenShareDisabled
                  ? "bg-gray-400 cursor-not-allowed opacity-60"
                  : isScreenSharing
                    ? "bg-[#7b6847] hover:bg-[#8a764b]"
                    : "bg-white/20 hover:bg-white/40",
              )}
              onClick={isScreenShareDisabled ? undefined : onToggleScreenShare}
              aria-label={isScreenSharing ? "Stop sharing" : "Share screen"}
              aria-disabled={isScreenShareDisabled}
            >
              {isScreenSharing ? (
                <LuMonitorOff size={20} />
              ) : (
                <LuMonitor size={20} />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isScreenSharing ? "Stop sharing" : "Share screen"}
            {!isScreenSharing && !isScreenShareDisabled && (
              <span className="ml-2 text-muted-foreground">(S)</span>
            )}
            {isScreenShareDisabled &&
              "Only 2 people can share screen at the same time"}
          </TooltipContent>
        </Tooltip>

        <HuddleReactionPicker onSendReaction={onSendReaction} />

        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <Button
                type="button"
                size="custom"
                disabled={!isThreadAvailable}
                className={cn(
                  "flex h-11 w-11 items-center justify-center  text-white",
                  isThreadOpen
                    ? "bg-[#7b6847] hover:bg-[#8a764b]"
                    : "bg-white/20 hover:bg-white/40",
                  !isThreadAvailable && "cursor-not-allowed opacity-50",
                )}
                onClick={onToggleThread}
                aria-label={isThreadOpen ? "Close thread" : "Open thread"}
              >
                <LuMessageSquare size={20} />
              </Button>
              {hasThreadUnread && !isThreadOpen && (
                <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-red-500" />
              )}
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {isThreadOpen ? "Close thread" : "Open thread"}
            {!isThreadAvailable && "Thread is not available"}
          </TooltipContent>
        </Tooltip>

        <MoreActionsToolbarButton
          topic={topic}
          onAddOrEditTopic={onAddOrEditTopic}
        />
        <Button
          type="button"
          size="custom"
          className="flex h-11 min-w-[88px] items-center justify-center  bg-rose-500 px-4 text-[14px] font-semibold text-white hover:bg-rose-400"
          onClick={onLeave}
        >
          Leave
        </Button>
      </div>
    </div>
  );
}
