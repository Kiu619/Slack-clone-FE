"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { getUserInitials } from "@/modules/huddle-preview/huddle-preview.utils";
import { useHuddle as useHuddleT } from "@/hooks/use-translation";
import {
  type LocalParticipant,
  type RemoteParticipant,
  type TrackPublication,
  Track,
  ConnectionQuality,
} from "livekit-client";
import { HuddleFloatingReactions } from "@/modules/huddle-preview/components/huddle-floating-reactions";
import type { ActiveHuddleReaction } from "@/modules/huddle-preview/huddle-reactions";
import { ParticipantMoreActions } from "@/modules/huddle-preview/components/participant-more-actions";
import { LuHand, LuMaximize2, LuMicOff, LuPin, LuX } from "react-icons/lu";
import { useEffect, useRef, useState, type ReactNode } from "react";
import Typography from "@/components/ui/typography";
import { useHuddleFullscreenStore } from "@/stores/useHuddleFullscreenStore";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { CustomSelect } from "@/components/custom-select";

export function PreviewAvatar({
  avatarSrc,
  avatarAlt,
}: {
  avatarSrc: string | null;
  avatarAlt: string;
}) {
  return (
    <Avatar className="h-full w-full rounded-[20px] border-2 border-white/16">
      <AvatarImage src={avatarSrc ?? undefined} alt={avatarAlt} />
      <AvatarFallback className="rounded-[20px] bg-black/20 text-5xl font-semibold text-white">
        {getUserInitials(avatarAlt)}
      </AvatarFallback>
    </Avatar>
  );
}

export function DeviceSelect({
  icon,
  label,
  value,
  onChange,
  options,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  disabled?: boolean;
}) {
  return (
    <div className="rounded-[14px] border border-white/10 px-3 py-2.5 shadow-sm">
      <div className="mb-1.5 flex items-center gap-2 ">
        {icon}
        <span className="text-[12px] font-medium">{label}</span>
      </div>
      <CustomSelect
        value={value}
        options={options}
        onChange={onChange}
        // disabled={disabled}
        placeholder={useHuddleT("selectDevice")}
        className="bg-white/15 rounded-lg"
      />
    </div>
  );
}

function MediaTrackPlayer({
  publication,
  speakerId,
}: {
  publication?: TrackPublication;
  speakerId: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const speakerIdRef = useRef(speakerId);
  speakerIdRef.current = speakerId;

  useEffect(() => {
    const element = audioRef.current;
    const track = publication?.audioTrack;
    if (!element || !track) return;

    track.attach(element);
    if (speakerIdRef.current && "setSinkId" in element) {
      void element.setSinkId(speakerIdRef.current).catch(() => {});
    }

    return () => {
      track.detach(element);
    };
  }, [publication?.audioTrack]);

  return <audio ref={audioRef} autoPlay playsInline className="hidden" />;
}

export function ScreenShareTile({
  participant,
  displayName,
  avatarSrc,
  avatarLabel,
  onSelect,
  isSelected,
  variant = "grid",
}: {
  participant: LocalParticipant | RemoteParticipant;
  displayName: string;
  avatarSrc: string | null;
  avatarLabel: string;
  onSelect?: () => void;
  isSelected?: boolean;
  isMuted?: boolean;
  onViewProfile?: () => void;
  variant?: "grid" | "sidebar" | "spotlight";
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const screenSharePublication = participant.getTrackPublication(
    Track.Source.ScreenShare,
  );
  const videoTrack = screenSharePublication?.videoTrack;
  const openFullscreen = useHuddleFullscreenStore((s) => s.open);

  useEffect(() => {
    const element = videoRef.current;
    const track = videoTrack;
    if (!element || !track) return;

    track.attach(element);
    return () => {
      track.detach(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screenSharePublication?.trackSid]);

  const handleFullscreenClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    openFullscreen({
      sessionKey: `${participant.identity}-${Date.now()}`,
      participant,
      displayName,
      avatarSrc,
      avatarLabel,
      onClose: onSelect,
    });
  };

  return (
    <div
      onClick={isSelected ? undefined : onSelect}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-[18px] border border-white/10 bg-black/22",
        variant === "grid" && "aspect-square max-h-113",
        variant === "sidebar" && "h-[176px] w-full min-h-[176px]",
        variant === "spotlight" && "aspect-video w-full max-w-none",
        onSelect &&
          !isSelected &&
          "cursor-pointer hover:border-white/20 transition-colors",
        isSelected && "border-cyan-400/60",
      )}
    >
      {/* Toolbar — visible when selected */}
      <div
        className={cn(
          "absolute left-0 right-0 top-0 z-10 flex h-[52px] items-center gap-2 bg-black/30 px-3 transition-opacity duration-300",
          !isSelected && "pointer-events-none opacity-0",
        )}
      >
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={avatarSrc ?? undefined} alt={avatarLabel} />
          <AvatarFallback className="rounded-full bg-black/20 text-[10px] font-semibold text-white">
            {getUserInitials(avatarLabel)}
          </AvatarFallback>
        </Avatar>
        <Typography className="text-[11px] font-medium text-white/92">
          {displayName}
        </Typography>
        <Typography className="text-[11px] text-white/50">
          {t("screenShare")}
        </Typography>
        <div className="flex-1" />
        <button
          onClick={handleFullscreenClick}
          className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
          aria-label={t("enterFullscreen")}
        >
          <LuMaximize2 size={14} />
        </button>
        {onSelect && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
            aria-label={t("closeSpotlight")}
          >
            <LuX size={14} />
          </button>
        )}
      </div>

      {/* Video — always rendered; toolbar overlays it when selected */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        className="min-h-0 w-full flex-1 object-contain bg-black"
      />

      {/* Bottom bar — only visible when NOT selected */}
      <div
        className={cn(
          "flex h-[52px] items-center gap-2 bg-black/30 px-3",
          isSelected && "hidden",
        )}
      >
        <Avatar className="h-10 w-10 rounded-md">
          <AvatarImage src={avatarSrc ?? undefined} alt={avatarLabel} />
          <AvatarFallback className="rounded-full bg-black/20 text-[10px] font-semibold text-white">
            {getUserInitials(avatarLabel)}
          </AvatarFallback>
        </Avatar>
        <Typography className="text-[11px] font-medium text-white/92">
          {displayName}
        </Typography>
        <Typography className="text-[11px] text-white/50">
          {t("shareScreen")}
        </Typography>
      </div>
    </div>
  );
}

export function ParticipantTile({
  participant,
  isLocal,
  isActiveSpeaker,
  displayName,
  avatarSrc,
  avatarLabel,
  isRaisedHand,
  isMuted,
  floatingReactions,
  speakerId,
  onViewProfile,
  isCameraEnabled,
  isPinned,
  connectionQuality,
  onPin,
  onUnpin,
  onToggleMute,
  onHideSelfView,
  onShowSelfView,
  isSelfViewHidden,
  onMute,
  isSoloParticipant,
  onToggleCamera,
  variant = "grid",
}: {
  participant: LocalParticipant | RemoteParticipant;
  isLocal: boolean;
  isActiveSpeaker: boolean;
  displayName: string;
  avatarSrc: string | null;
  avatarLabel: string;
  isRaisedHand: boolean;
  isMuted: boolean;
  floatingReactions: ActiveHuddleReaction[];
  speakerId: string;
  onViewProfile: () => void;
  isCameraEnabled?: boolean;
  isPinned?: boolean;
  connectionQuality?: ConnectionQuality;
  onPin?: () => void;
  onUnpin?: () => void;
  onToggleMute?: () => void;
  onHideSelfView?: () => void;
  onShowSelfView?: () => void;
  isSelfViewHidden?: boolean;
  onMute?: () => void;
  isSoloParticipant?: boolean;
  onToggleCamera?: () => void;
  variant?: "grid" | "sidebar";
}) {
  const t = useHuddleT()
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoKey, setVideoKey] = useState(0);
  const videoPublication = participant.getTrackPublication(Track.Source.Camera);
  const hasVideo =
    participant.isCameraEnabled &&
    Boolean(videoPublication?.videoTrack) &&
    !videoPublication?.isMuted;

  const qualityColor = connectionQuality === ConnectionQuality.Excellent
    ? "bg-green-500"
    : connectionQuality === ConnectionQuality.Good
      ? "bg-yellow-500"
      : connectionQuality === ConnectionQuality.Poor
        ? "bg-red-500"
        : null;

  useEffect(() => {
    // Force video element remount when track changes to ensure proper reattachment
    setVideoKey(k => k + 1);
  }, [videoPublication?.trackSid, videoPublication?.isMuted, participant.isCameraEnabled]);

  useEffect(() => {
    const element = videoRef.current;
    const track = videoPublication?.videoTrack;
    if (!element || !track) return;

    track.attach(element);
    return () => {
      track.detach(element);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoPublication?.trackSid, videoPublication?.isMuted, videoKey]);

  const audioPublications = Array.from(
    participant.audioTrackPublications.values() as Iterable<TrackPublication>,
  );

  return (
    <div className="group relative">
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "relative overflow-hidden rounded-[18px] border bg-black/22 cursor-pointer",
                variant === "grid" && "aspect-square max-h-113",
                variant === "sidebar" && "h-[176px] w-full min-h-[176px]",
                isActiveSpeaker
                  ? "border-cyan-300/80 shadow-[0_0_0_2px_rgba(103,232,249,0.16)]"
                  : "border-white/10",
              )}
              onClick={onViewProfile}
            >
              <div className="absolute left-3 top-3 z-10 flex items-center gap-1.5 rounded-full bg-black/30 px-2.5 py-1 backdrop-blur-sm">
                <span className="text-[11px] font-medium text-white/92">
                  {displayName}
                </span>
                {isMuted && (
                  <LuMicOff size={12} className="shrink-0 text-white/70" />
                )}
              </div>
              {isPinned ? (
                <div className="absolute right-3 top-3 z-10">
                  <LuPin size={14} className="text-white/90" />
                </div>
              ) : null}
              {isRaisedHand ? (
                <div className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-amber-400/95 px-2.5 py-1 text-[11px] font-semibold text-amber-950 shadow-[0_6px_14px_rgba(0,0,0,0.2)]">
                  <LuHand size={12} />
                  <span>{t("raised")}</span>
                </div>
              ) : null}
              <HuddleFloatingReactions reactions={floatingReactions} />

              {hasVideo ? (
                <video
                  key={videoKey}
                  ref={videoRef}
                  autoPlay
                  muted={isLocal}
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(180deg,rgba(255,225,0,0.95)_0%,rgba(255,214,0,0.98)_100%)]">
                  <PreviewAvatar
                    avatarSrc={avatarSrc}
                    avatarAlt={avatarLabel}
                  />
                </div>
              )}

              {!isLocal && audioPublications.length > 0 ? (
                <>
                  {audioPublications.map((publication) => (
                    <MediaTrackPlayer
                      key={publication.trackSid ?? publication.source}
                      publication={publication}
                      speakerId={speakerId}
                    />
                  ))}
                </>
              ) : null}
            </div>
          </TooltipTrigger>
          <TooltipContent className="text-center leading-relaxed">
            <span className="block font-medium">{displayName}</span>
            <span className="block ">{t("viewProfile")}</span>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <ParticipantMoreActions
        isLocal={isLocal}
        isMuted={isMuted}
        isCameraEnabled={isCameraEnabled ?? false}
        isPinned={isPinned ?? false}
        isSelfViewHidden={isSelfViewHidden}
        isSoloParticipant={isSoloParticipant ?? false}
        onViewProfile={onViewProfile}
        onToggleMute={onToggleMute}
        onToggleCamera={isLocal ? onToggleCamera : undefined}
        onPin={onPin}
        onUnpin={onUnpin}
        onHideSelfView={onHideSelfView}
        onShowSelfView={onShowSelfView}
        onMute={onMute}
      />
    </div>
  );
}
