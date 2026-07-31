"use client";

import type { User } from "@/lib/types";
import { AddEditHuddleTopicDialog } from "@/modules/huddle-preview/components/add-edit-huddle-topic-dialog";
import HuddleFullscreenPortal from "@/modules/huddle-preview/components/huddle-fullscreen-portal";
import { HuddleLiveStage } from "@/modules/huddle-preview/components/huddle-live-stage";
import { HuddlePreviewStage } from "@/modules/huddle-preview/components/huddle-preview-stage";
import { useHuddlePreviewWindow } from "@/modules/huddle-preview/hooks/use-huddle-preview-window";
import { useProfilePanelStore } from "@/stores/useProfilePanelStore";
import { ConnectionState } from "livekit-client";
import { LucideAlertCircle } from "lucide-react";
import dynamic from "next/dynamic";
import { Component, useEffect, type ReactNode } from "react";

const ThreadPanel = dynamic(() => import("@/modules/threads/thread-panel"), {
  ssr: false,
});
const ProfilePanel = dynamic(() => import("@/modules/profile/profile-panel"), {
  ssr: false,
});

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

function HuddleErrorFallback({ error, onRetry }: { error: Error | null; onRetry: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/20">
        <LucideAlertCircle size={28} className="text-red-400" />
      </div>
      <div className="space-y-1">
        <h3 className="text-[15px] font-semibold text-white">Something went wrong</h3>
        <p className="text-[13px] text-white/60">
          {error?.message || "An unexpected error occurred in the huddle."}
        </p>
      </div>
      <button
        onClick={onRetry}
        className="rounded-lg bg-white/10 px-4 py-2 text-[14px] font-medium text-white hover:bg-white/20"
      >
        Try again
      </button>
    </div>
  );
}

class HuddleErrorBoundary extends Component<{ children: ReactNode; onError?: (error: Error) => void }, ErrorBoundaryState> {
  constructor(props: { children: ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <HuddleErrorFallback
          error={this.state.error}
          onRetry={() => this.setState({ hasError: false, error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function ConnectingOverlay() {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center rounded-[20px] bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        <span className="text-[14px] font-medium text-white">Joining huddle...</span>
      </div>
    </div>
  );
}

function ProfilePanelSync({ onClose }: { onClose: () => void }) {
  const isOpen = useProfilePanelStore((s) => s.isOpen);

  useEffect(() => {
    if (!isOpen) {
      onClose();
    }
  }, [isOpen, onClose]);

  return null;
}

function HuddleProfilePanel({
  user,
  onClose,
}: {
  user: User | null;
  workspaceId: string;
  onClose: () => void;
}) {
  if (!user) return null;

  return (
    <>
      <ProfilePanel />
      <ProfilePanelSync onClose={onClose} />
    </>
  );
}

type HuddlePreviewWindowProps = Parameters<typeof useHuddlePreviewWindow>[0];

export function HuddlePreviewWindow(props: HuddlePreviewWindowProps) {
  const huddle = useHuddlePreviewWindow(props);

  return (
    <HuddleErrorBoundary>
      <>
        <div
          className="min-h-screen overflow-y-auto text-[#1d1c1d] dark:text-white relative"
          style={{ background: huddle.workspaceBackground }}
        >
          {huddle.phase === "connecting" && <ConnectingOverlay />}
          <div className="mx-auto flex items-center h-screen w-full flex-col px-3 py-4">
          {huddle.phase === "live" ? (
            <div
              className={
                huddle.isProfilePanelOpen ||
                (huddle.isThreadOpen && huddle.feedMessageId)
                  ? "grid h-full w-full min-h-0 grid-cols-[minmax(0,1fr)_380px]"
                  : "grid h-full w-full min-h-0 grid-cols-[minmax(0,1fr)]"
              }
            >
              <div className="min-w-0">
                <HuddleLiveStage
                  workspaceId={props.workspaceId}
                  liveTitle={huddle.liveTitle}
                  phaseLabel={
                    huddle.liveRoomState === ConnectionState.Connected
                      ? "Live"
                      : "Reconnecting"
                  }
                  participantCount={huddle.liveParticipantCount}
                  liveError={huddle.liveError}
                  participants={huddle.participants}
                  liveSessionParticipants={huddle.liveSessionParticipants}
                  activeSpeakerIds={huddle.activeSpeakerIds}
                  currentUserAvatar={huddle.currentUserAvatar}
                  isMicEnabled={huddle.isMicEnabled}
                  isCameraEnabled={huddle.isCameraEnabled}
                  isScreenSharing={huddle.isScreenSharing}
                  screenShareCount={huddle.screenShareCount}
                  isCurrentUserRaisedHand={huddle.isCurrentUserRaisedHand}
                  isThreadOpen={huddle.isThreadOpen}
                  isThreadAvailable={!!huddle.feedMessageId}
                  hasThreadUnread={huddle.hasThreadUnread}
                  onToggleThread={huddle.toggleThread}
                  onToggleMic={huddle.handleToggleMic}
                  onToggleCamera={huddle.handleToggleCamera}
                  onToggleScreenShare={huddle.handleToggleScreenShare}
                  onToggleRaiseHand={huddle.handleToggleRaiseHand}
                  activeReactionsByParticipant={
                    huddle.activeReactionsByParticipant
                  }
                  recentReactionToasts={huddle.recentReactionToasts}
                  currentUserId={huddle.currentUserId}
                  onSendReaction={huddle.sendReaction}
                  onLeave={huddle.handleLeaveClick}
                  onViewProfile={huddle.openProfilePanel}
                  pinnedParticipantIdentity={huddle.pinnedParticipantIdentity}
                  onPinParticipant={huddle.pinParticipant}
                  onUnpinParticipant={huddle.unpinParticipant}
                  isSelfViewHidden={huddle.isSelfViewHidden}
                  onHideSelfView={huddle.hideSelfView}
                  onShowSelfView={huddle.showSelfView}
                  onMuteParticipant={huddle.muteParticipant}
                  isSoloParticipant={huddle.participants.length <= 1}
                  audioInputs={huddle.deviceState.audioInputs}
                  audioOutputs={huddle.deviceState.audioOutputs}
                  selectedMicId={huddle.selectedMicId}
                  selectedSpeakerId={huddle.selectedSpeakerId}
                  onSelectMic={huddle.handleSelectMic}
                  onSelectSpeaker={huddle.handleSelectSpeaker}
                  onRefreshDevices={huddle.refreshDeviceLists}
                  previewStream={huddle.previewStream}
                  videoInputs={huddle.deviceState.videoInputs}
                  selectedCameraId={huddle.selectedCameraId}
                  onSelectCamera={huddle.handleSelectCamera}
                  topic={huddle.topic}
                  onAddOrEditTopic={() => huddle.setIsTopicDialogOpen(true)}
                />
              </div>
              {huddle.isProfilePanelOpen ? (
                <div className="h-full min-w-0 overflow-hidden ml-2 border-white/10 bg-white dark:bg-[#1A1D21] rounded-lg">
                  <HuddleProfilePanel
                    user={huddle.profilePanelUser}
                    workspaceId={props.workspaceId}
                    onClose={huddle.closeProfilePanel}
                  />
                </div>
              ) : huddle.isThreadOpen && huddle.feedMessageId ? (
                <div className="h-full min-w-0 overflow-hidden ml-2 border-white/10 bg-white dark:bg-[#1A1D21] rounded-lg">
                  <ThreadPanel
                    workspaceId={props.workspaceId}
                    parentMessageId={huddle.feedMessageId}
                    onClose={huddle.closeThread}
                  />
                </div>
              ) : null}
            </div>
          ) : (
            <HuddlePreviewStage
              phase={huddle.phase}
              headline={huddle.headline}
              currentUserAvatar={huddle.currentUserAvatar}
              currentUserLabel={huddle.currentUserLabel}
              previewStream={huddle.previewStream}
              previewStatus={huddle.previewStatus}
              previewError={huddle.previewError}
              liveError={huddle.liveError}
              isMicEnabled={huddle.isMicEnabled}
              isCameraEnabled={huddle.isCameraEnabled}
              selectedMicId={huddle.selectedMicId}
              selectedSpeakerId={huddle.selectedSpeakerId}
              selectedCameraId={huddle.selectedCameraId}
              micOptions={huddle.micOptions}
              speakerOptions={huddle.speakerOptions}
              cameraOptions={huddle.cameraOptions}
              onSelectMic={huddle.setSelectedMicId}
              onSelectSpeaker={huddle.setSelectedSpeakerId}
              onSelectCamera={huddle.setSelectedCameraId}
              onToggleMic={huddle.handleToggleMic}
              onToggleCamera={huddle.handleToggleCamera}
              onCancel={huddle.closeWindow}
              onStart={huddle.handleStartClick}
              startButtonLabel={huddle.startButtonLabel}
            />
          )}
        </div>
      </div>
      <HuddleFullscreenPortal />
      <AddEditHuddleTopicDialog
        open={huddle.isTopicDialogOpen}
        setOpen={huddle.setIsTopicDialogOpen}
        initialTopic={huddle.topic}
        onSave={huddle.handleUpdateTopic}
        isLoading={huddle.isTopicSaving}
      />
      </>
    </HuddleErrorBoundary>
  );
}
