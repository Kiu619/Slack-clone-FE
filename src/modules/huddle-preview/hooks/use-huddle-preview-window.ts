"use client"

import {
  getMessageByIdApi,
  getHuddleStateApi,
  getWorkspaceProfileApi,
  joinHuddleApi,
  leaveHuddleApi,
  leaveHuddleKeepaliveApi,
  startHuddleApi,
  muteParticipantApi,
  updateHuddleTopicApi,
  markThreadAsReadApi,
} from "@/apis"
import { useAuth } from "@/hooks/use-auth"
import { useGlobalSync } from "@/hooks/use-global-sync"
import { useSocket, useWorkspaceSocket, leaveHuddleSocket } from "@/hooks/use-socket"
import type {
  HuddleSessionSnapshot,
  HuddleStateSnapshot,
  HuddleTarget,
} from "@/lib/huddle"
import { authKeys } from "@/lib/query-keys"
import {
  buildHeadline,
  buildLiveTitle,
  buildWorkspaceShellBackground,
  clearRuntimeStorage,
  formatDeviceLabel,
  parseTheme,
  readRuntimeStorage,
  writeRuntimeStorage,
  buildHuddleParticipantMetadataPatch,
  readRaisedHandFromMetadata,
  resizeHuddlePreviewWindow,
  type DeviceState,
  type RuntimeStorageState,
} from "@/modules/huddle-preview/huddle-preview.utils"
import { useQuery } from "@tanstack/react-query"
import {
  ConnectionState,
  Room,
  RoomEvent,
} from "livekit-client"
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import { toast } from "sonner"
import {
  buildHuddlePreviewChannelName,
  buildHuddlePreviewTargetKey,
  type HuddlePreviewTargetType,
} from "@/lib/open-huddle-preview-window"
import { useHuddleReactions } from "@/modules/huddle-preview/hooks/use-huddle-reactions"
import { useMessageStore } from "@/stores/useMessageStore"
import { useWorkspaceMemberStore } from "@/stores/useWorkspaceMemberStore"
import { useProfilePanelStore } from "@/stores/useProfilePanelStore"
import { useHuddle } from "@/hooks/use-translation"
import type { User } from "@/lib/types"

export type HuddlePreviewWindowProps = {
  workspaceId: string
  entityType: HuddlePreviewTargetType
  entityId: string
  label: string
  mode?: 'start' | 'join'
}

export type HuddlePreviewPhase = "preview" | "connecting" | "live"

type HuddleJoinResponse = {
  livekitUrl: string
  token: string
  session: HuddleSessionSnapshot
}

export function useHuddlePreviewWindow({
  workspaceId,
  entityType,
  entityId,
  label,
  mode = 'start',
}: HuddlePreviewWindowProps) {
  const t = useHuddle()
  const target = useMemo<HuddleTarget>(
    () => ({ workspaceId, entityType, entityId }),
    [workspaceId, entityType, entityId],
  )
  const targetKey = useMemo(
    () => buildHuddlePreviewTargetKey({ workspaceId, entityType, entityId }),
    [entityId, entityType, workspaceId],
  )

  const storedRuntime = useMemo(() => readRuntimeStorage(target), [target])
  const [phase, setPhase] = useState<HuddlePreviewPhase>(
    storedRuntime?.live ? "connecting" : "preview",
  )
  const [selectedMicId, setSelectedMicId] = useState(storedRuntime?.selectedMicId ?? "")
  const [selectedSpeakerId, setSelectedSpeakerId] = useState(
    storedRuntime?.selectedSpeakerId ?? "",
  )
  const [selectedCameraId, setSelectedCameraId] = useState(
    storedRuntime?.selectedCameraId ?? "",
  )
  const [isMicEnabled, setIsMicEnabled] = useState(storedRuntime?.isMicEnabled ?? true)
  const [isCameraEnabled, setIsCameraEnabled] = useState(
    storedRuntime?.isCameraEnabled ?? false,
  )
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [deviceState, setDeviceState] = useState<DeviceState>({
    audioInputs: [],
    audioOutputs: [],
    videoInputs: [],
  })
  const [previewStatus, setPreviewStatus] = useState<
    "idle" | "loading" | "ready" | "error" | "blocked"
  >("idle")
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [liveError, setLiveError] = useState<string | null>(null)
  const [previewStream, setPreviewStream] = useState<MediaStream | null>(null)
  const [liveSession, setLiveSession] = useState<HuddleSessionSnapshot | null>(null)
  const [roomVersion, setRoomVersion] = useState(0)
  const [activeSpeakerIds, setActiveSpeakerIds] = useState<string[]>([])
  const [isCurrentUserRaisedHand, setIsCurrentUserRaisedHand] = useState(false)
  const [isThreadOpen, setIsThreadOpen] = useState(false)
  const [pinnedParticipantIdentity, setPinnedParticipantIdentity] = useState<string | null>(null)
  const [isSelfViewHidden, setIsSelfViewHidden] = useState(false)
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false)
  const [isTopicSaving, setIsTopicSaving] = useState(false)

  const { user: accountUser } = useAuth()
  const currentUserId = accountUser?.id ?? null
  const { isMainGatewayConnected, socket } = useSocket()
  useGlobalSync(workspaceId)
  const { data: workspaceProfile } = useQuery({
    queryKey: authKeys.workspaceProfile(workspaceId),
    queryFn: () => getWorkspaceProfileApi(workspaceId),
    enabled: !!workspaceId,
    staleTime: 60_000,
  })

  useWorkspaceSocket(workspaceId, isMainGatewayConnected, {
    onUserProfileUpdated: useCallback(
      (data: Record<string, unknown>) => {
        useWorkspaceMemberStore.getState().patchFromSocket(workspaceId, data)
      },
      [workspaceId],
    ),
    onHuddleState: useCallback(
      (data: {
        reason: string
        target: { workspaceId: string; entityType: string; entityId: string }
        state: HuddleStateSnapshot
        session: HuddleSessionSnapshot | null
      }) => {
        if (data.target.workspaceId !== workspaceId) return
        if (data.target.entityType !== entityType) return
        if (data.target.entityId !== entityId) return
        setLiveSession(data.state.activeSession)
      },
      [entityId, entityType, workspaceId],
    ),
  })

  const previewStreamRef = useRef<MediaStream | null>(null)
  const roomRef = useRef<Room | null>(null)
  const startInProgressRef = useRef(false)
  const leaveRequestedRef = useRef(false)
  const resumeAttemptedRef = useRef(false)
  const liveSessionRefreshSeqRef = useRef(0)

  const workspaceTheme = useMemo(
    () => parseTheme(workspaceProfile?.theme),
    [workspaceProfile?.theme],
  )
  const workspaceBackground = useMemo(
    () => buildWorkspaceShellBackground(workspaceTheme),
    [workspaceTheme],
  )

  const currentUserAvatar = workspaceProfile?.avatar ?? accountUser?.avatar ?? null
  const currentUserLabel =
    workspaceProfile?.displayName?.trim() ||
    workspaceProfile?.name?.trim() ||
    accountUser?.name?.trim() ||
    accountUser?.email?.trim() ||
    t("you")

  const launchMode = mode === 'join' ? 'join' : 'start'
  const headline = useMemo(
    () =>
      launchMode === "join"
        ? entityType === "channel"
          ? t("joinHuddleIn", { name: label })
          : t("joinHuddleWith", { name: label })
        : buildHeadline(entityType, label),
    [entityType, label, launchMode],
  )
  const liveTitle = useMemo(
    () => buildLiveTitle(entityType, label, liveSession?.topic),
    [entityType, label, liveSession?.topic],
  )
  const startButtonLabel =
    phase === 'connecting'
      ? t("connecting")
      : launchMode === 'join'
        ? t("joinHuddle")
        : t("startHuddle")

  const stopPreviewStream = useCallback((stream: MediaStream | null) => {
    stream?.getTracks().forEach((track) => track.stop())
  }, [])

  const refreshDeviceLists = useCallback(async () => {
    const devices = await navigator.mediaDevices.enumerateDevices()
    const audioInputs = devices.filter((device) => device.kind === "audioinput")
    const audioOutputs = devices.filter((device) => device.kind === "audiooutput")
    const videoInputs = devices.filter((device) => device.kind === "videoinput")

    setDeviceState({ audioInputs, audioOutputs, videoInputs })

    setSelectedMicId((current) => {
      if (current && audioInputs.some((device) => device.deviceId === current)) {
        return current
      }
      return audioInputs[0]?.deviceId ?? ""
    })

    setSelectedSpeakerId((current) => {
      if (current && audioOutputs.some((device) => device.deviceId === current)) {
        return current
      }
      return audioOutputs[0]?.deviceId ?? ""
    })

    setSelectedCameraId((current) => {
      if (current && videoInputs.some((device) => device.deviceId === current)) {
        return current
      }
      return videoInputs[0]?.deviceId ?? ""
    })
  }, [])

  const refreshPreview = useCallback(async () => {
    if (phase !== "preview") return
    if (typeof navigator === "undefined") return

    setPreviewStatus("loading")
    setPreviewError(null)

    const audioConstraints: boolean | MediaTrackConstraints = isMicEnabled
      ? selectedMicId
        ? { deviceId: { exact: selectedMicId } }
        : true
      : false
    const videoConstraints: boolean | MediaTrackConstraints = isCameraEnabled
      ? selectedCameraId
        ? { deviceId: { exact: selectedCameraId } }
        : true
      : false

    stopPreviewStream(previewStreamRef.current)
    previewStreamRef.current = null
    setPreviewStream(null)

    if (!audioConstraints && !videoConstraints) {
      setPreviewStatus("ready")
      await refreshDeviceLists()
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: videoConstraints,
      })

      previewStreamRef.current = stream
      setPreviewStream(stream)
      setPreviewStatus("ready")
      await refreshDeviceLists()
    } catch (error) {
      const domError = error as DOMException | Error
      if (domError instanceof DOMException && domError.name === "NotAllowedError") {
        setPreviewStatus("blocked")
        setPreviewError(t("cameraAndMicPermission"))
      } else {
        setPreviewStatus("error")
        setPreviewError(
          domError instanceof Error ? domError.message : t("cannotOpenCameraPreview"),
        )
      }
      toast.error(t("cannotOpenCameraPreview"))
    }
  }, [
    isCameraEnabled,
    isMicEnabled,
    phase,
    refreshDeviceLists,
    selectedCameraId,
    selectedMicId,
    stopPreviewStream,
  ])

  const updateRoomVersion = useCallback(() => {
    setRoomVersion((value) => value + 1)
  }, [])

  const refreshLiveSessionSnapshot = useCallback(async () => {
    if (phase !== "live") return

    const seq = ++liveSessionRefreshSeqRef.current
    try {
      const state = await getHuddleStateApi(target)
      if (liveSessionRefreshSeqRef.current !== seq) return
      if (state.activeSession) {
        setLiveSession(state.activeSession)
      }
    } catch {
      // Ignore snapshot refresh failures; LiveKit state still drives rendering.
    }
  }, [phase, target])

  const disconnectRoom = useCallback(async () => {
    const room = roomRef.current
    roomRef.current = null
    if (!room) return
    try {
      room.removeAllListeners()
      await room.disconnect()
    } catch {
      // Ignore disconnect errors while closing.
    }
  }, [])

  const closeWindow = useCallback(async () => {
    stopPreviewStream(previewStreamRef.current)
    previewStreamRef.current = null
    setPreviewStream(null)
    await disconnectRoom()
    clearRuntimeStorage(target)
    window.close()
  }, [disconnectRoom, stopPreviewStream, target])

  const handleWindowCloseLeave = useCallback(() => {
    if (leaveRequestedRef.current) return
    if (phase !== "live" && !storedRuntime?.live && !roomRef.current) return

    leaveRequestedRef.current = true
    void leaveHuddleKeepaliveApi(target).catch(() => {
      // Ignore unload leave failures; the popup is already closing.
    })

    setIsThreadOpen(false)
    void disconnectRoom()
    stopPreviewStream(previewStreamRef.current)
    previewStreamRef.current = null
    setPreviewStream(null)
    clearRuntimeStorage(target)
  }, [disconnectRoom, phase, stopPreviewStream, storedRuntime?.live, target])

  useEffect(() => {
    if (phase === "live") {
      writeRuntimeStorage(target, {
        live: true,
        selectedMicId,
        selectedSpeakerId,
        selectedCameraId,
        isMicEnabled,
        isCameraEnabled,
      } satisfies RuntimeStorageState)
      return
    }

    if (phase === "preview") {
      clearRuntimeStorage(target)
    }
  }, [
    isCameraEnabled,
    isMicEnabled,
    phase,
    selectedCameraId,
    selectedMicId,
    selectedSpeakerId,
    target,
  ])

  useEffect(() => {
    document.title =
      phase === "live" ? t("huddleTitle", { name: label }) : t("huddlePreviewTitle", { name: label })
  }, [label, phase])

  useEffect(() => {
    if (phase !== "preview") return
    let mounted = true

    const handleDeviceChange = () => {
      if (!mounted) return
      void refreshDeviceLists()
    }

    navigator.mediaDevices?.addEventListener?.("devicechange", handleDeviceChange)
    void refreshPreview()

    return () => {
      mounted = false
      navigator.mediaDevices?.removeEventListener?.("devicechange", handleDeviceChange)
      stopPreviewStream(previewStreamRef.current)
      previewStreamRef.current = null
      setPreviewStream(null)
    }
  }, [phase, refreshDeviceLists, refreshPreview, stopPreviewStream])

  useEffect(() => {
    const onBeforeUnload = () => {
      handleWindowCloseLeave()
    }

    const onPageHide = () => {
      handleWindowCloseLeave()
    }

    window.addEventListener("beforeunload", onBeforeUnload)
    window.addEventListener("pagehide", onPageHide)
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload)
      window.removeEventListener("pagehide", onPageHide)
    }
  }, [handleWindowCloseLeave])

  const applyRoomListeners = useCallback(
    (room: Room) => {
      room.on(RoomEvent.ParticipantConnected, () => {
        updateRoomVersion()
        void refreshLiveSessionSnapshot()
      })
      room.on(RoomEvent.ParticipantDisconnected, () => {
        updateRoomVersion()
        void refreshLiveSessionSnapshot()
      })
      room.on(RoomEvent.TrackSubscribed, updateRoomVersion)
      room.on(RoomEvent.TrackUnsubscribed, updateRoomVersion)
      room.on(RoomEvent.LocalTrackPublished, updateRoomVersion)
      room.on(RoomEvent.LocalTrackUnpublished, updateRoomVersion)
      room.on(RoomEvent.TrackMuted, updateRoomVersion)
      room.on(RoomEvent.TrackUnmuted, updateRoomVersion)
      room.on(RoomEvent.ActiveSpeakersChanged, (participants) => {
        setActiveSpeakerIds(participants.map((participant) => participant.identity))
        updateRoomVersion()
      })
      room.on(RoomEvent.ParticipantMetadataChanged, (_metadata, participant) => {
        if (participant.isLocal) {
          setIsCurrentUserRaisedHand(readRaisedHandFromMetadata(participant.metadata))
        }
        updateRoomVersion()
      })
      room.on(RoomEvent.Disconnected, () => {
        if (leaveRequestedRef.current) return
        leaveRequestedRef.current = false
        roomRef.current = null
        setLiveError(t("huddleConnectionClosed"))
        setPhase("preview")
        setLiveSession(null)
        setIsCurrentUserRaisedHand(false)
        clearRuntimeStorage(target)
      })
    },
    [refreshLiveSessionSnapshot, target, updateRoomVersion],
  )

  const finishLiveJoin = useCallback(
    async (joinResponse: HuddleJoinResponse) => {
      const room = new Room({
        adaptiveStream: true,
        dynacast: true,
      })

      roomRef.current = room
      applyRoomListeners(room)

      try {
        stopPreviewStream(previewStreamRef.current)
        previewStreamRef.current = null
        setPreviewStream(null)
        await room.connect(joinResponse.livekitUrl, joinResponse.token)

        if (isMicEnabled) {
          await room.localParticipant.setMicrophoneEnabled(
            true,
            selectedMicId ? { deviceId: { exact: selectedMicId } } : undefined,
          )
        } else {
          await room.localParticipant.setMicrophoneEnabled(false)
        }

        if (isCameraEnabled) {
          await room.localParticipant.setCameraEnabled(
            true,
            selectedCameraId ? { deviceId: { exact: selectedCameraId } } : undefined,
          )
        } else {
          await room.localParticipant.setCameraEnabled(false)
        }

        setLiveSession(joinResponse.session)
        setIsCurrentUserRaisedHand(
          readRaisedHandFromMetadata(room.localParticipant.metadata),
        )

        // Auto-open thread panel so unread indicator works
        if (joinResponse.session.feedMessageId) {
          setIsThreadOpen(true)
        }

        setPhase("live")
        setLiveError(null)
        setPreviewStatus("ready")
        updateRoomVersion()
      } catch (error) {
        roomRef.current = null
        try {
          await room.disconnect()
        } catch {
          // Ignore cleanup failures.
        }
        throw error
      }
    },
    [
      applyRoomListeners,
      isCameraEnabled,
      isMicEnabled,
      selectedCameraId,
      selectedMicId,
      stopPreviewStream,
      updateRoomVersion,
    ],
  )

  const syncHuddleFeedMessage = useCallback(
    async (
      sessionOrState: HuddleSessionSnapshot | HuddleStateSnapshot | null,
    ) => {
      const feedMessageId =
        sessionOrState && "activeSession" in sessionOrState
          ? sessionOrState.activeSession?.feedMessageId ?? null
          : sessionOrState?.feedMessageId ?? null

      if (!feedMessageId) return

      try {
        const message = await getMessageByIdApi(feedMessageId)
        const store = useMessageStore.getState()
        const targetId = message.channelId || message.conversationId

        if (!targetId) return

        store.syncEntity("CHAT", "CREATE", {
          id: message.id,
          data: message,
          workspaceId: message.workspaceId,
          channelId: message.channelId ?? undefined,
          conversationId: message.conversationId ?? undefined,
        })
      } catch (error) {
        console.warn("[HuddlePreview] Failed to sync huddle feed message", error)
      }
    },
    [],
  )

  const startLiveSession = useCallback(async () => {
    if (startInProgressRef.current) return
    startInProgressRef.current = true
    leaveRequestedRef.current = false
    setLiveError(null)
    setPreviewError(null)
    setPhase("connecting")

    try {
      let startResponse: HuddleStateSnapshot | null = null
      if (launchMode === 'start') {
        startResponse = await startHuddleApi(target)
      }
      const joinResponse = await joinHuddleApi(target)
      await finishLiveJoin(joinResponse)
      await syncHuddleFeedMessage(joinResponse.session.feedMessageId ? joinResponse.session : startResponse)
      toast.success(launchMode === 'join' ? t("joinedHuddle") : t("huddleStarted"))
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : launchMode === "join"
            ? t("couldNotJoinHuddle")
            : t("couldNotStartHuddle")
      setLiveError(message)
      setPhase("preview")
      try {
        await leaveHuddleApi(target)
      } catch {
        // Ignore cleanup failures.
      }
      toast.error(message)
    } finally {
      startInProgressRef.current = false
    }
  }, [finishLiveJoin, launchMode, syncHuddleFeedMessage, target])

  const profilePanelStore = useProfilePanelStore()
  const feedMessageId = liveSession?.feedMessageId ?? null

  // Selector for thread unread status from store - O(1) lookup
  const hasThreadUnread = useMessageStore((s) => {
    const entity = feedMessageId ? s.entities[feedMessageId] as Record<string, unknown> : null;
    return entity?.isUnread === true;
  })

  useEffect(() => {
    if (!liveSession?.feedMessageId) return
    void syncHuddleFeedMessage(liveSession)
  }, [liveSession, syncHuddleFeedMessage])

  const closeThread = useCallback(() => {
    setIsThreadOpen(false)
  }, [])

  const toggleThread = useCallback(() => {
    setIsThreadOpen((prev) => {
      const nowOpen = !prev
      // When opening thread, mark as read (deferred to avoid setState during render)
      if (nowOpen && feedMessageId) {
        queueMicrotask(() => {
          useMessageStore.getState().updateEntity(feedMessageId, { isUnread: false } as Record<string, unknown>)
          void markThreadAsReadApi(feedMessageId)
        })
      }
      return nowOpen
    })
    if (isThreadOpen) {
      useProfilePanelStore.getState().close()
    }
  }, [feedMessageId, isThreadOpen])

  const openProfilePanel = useCallback((user: User) => {
    useProfilePanelStore.getState().open({ userData: user, workspaceId })
    setIsThreadOpen(false)
  }, [workspaceId])

  const closeProfilePanel = useCallback(() => {
    useProfilePanelStore.getState().close()
  }, [])

  const pinParticipant = useCallback((identity: string) => {
    setPinnedParticipantIdentity(identity)
  }, [])

  const unpinParticipant = useCallback(() => {
    setPinnedParticipantIdentity(null)
  }, [])

  const hideSelfView = useCallback(() => {
    setIsSelfViewHidden(true)
  }, [])

  const showSelfView = useCallback(() => {
    setIsSelfViewHidden(false)
  }, [])

  const muteParticipant = useCallback(
    async (participantIdentity: string) => {
      try {
        await muteParticipantApi(workspaceId, entityId, participantIdentity)
      } catch (error) {
        console.error('[Huddle] Failed to mute participant:', error)
      }
    },
    [workspaceId, entityId],
  )

  // Auto-show self-view when user becomes the only participant
  useEffect(() => {
    if (phase !== "live") return
    const remoteCount = roomRef.current?.remoteParticipants.size ?? 0
    if (remoteCount === 0 && isSelfViewHidden) {
      setIsSelfViewHidden(false)
    }
  }, [phase, isSelfViewHidden, roomVersion])

  useEffect(() => {
    if (phase !== "connecting") return
    if (!storedRuntime?.live || resumeAttemptedRef.current) return
    resumeAttemptedRef.current = true
    void startLiveSession()
  }, [phase, startLiveSession, storedRuntime?.live])

  const handleStartClick = useCallback(() => {
    void startLiveSession()
  }, [startLiveSession])

  const handleLeaveClick = useCallback(() => {
    if (leaveRequestedRef.current) return
    leaveRequestedRef.current = true

    // 1. Cleanup UI NGAY - optimistic
    setIsThreadOpen(false)
    resizeHuddlePreviewWindow(false)
    stopPreviewStream(previewStreamRef.current)
    previewStreamRef.current = null
    setPreviewStream(null)
    clearRuntimeStorage(target)
    window.close()

    // 2. Disconnect room non-blocking
    void disconnectRoom()

    // 3. Send leave request background - fire and forget
    if (socket?.connected) {
      void leaveHuddleSocket(target, socket).catch(() => {
        // Silent fail - UI already cleaned up
      })
    } else {
      void leaveHuddleApi(target).catch(() => {
        // Silent fail
      })
    }
  }, [disconnectRoom, socket, stopPreviewStream, target])

  const handleUpdateTopic = useCallback(
    async (topic: string) => {
      if (!liveSession?.id) return;

      setIsTopicSaving(true);
      try {
        await updateHuddleTopicApi(workspaceId, liveSession.id, topic || null);
        setIsTopicDialogOpen(false);
        toast.success(topic ? t("topicUpdated") : t("topicSaved"));
      } catch (error) {
        toast.error(t("failedToUpdateTopic"));
        console.error("Failed to update topic:", error);
      } finally {
        setIsTopicSaving(false);
      }
    },
    [liveSession?.id, workspaceId],
  );

  useEffect(() => {
    if (typeof window === "undefined") return

    const handleLeaveRequest = () => {
      void handleLeaveClick()
    }

    const onWindowMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return
      const data = event.data as
        | { type?: string; targetKey?: string }
        | null
        | undefined
      if (!data || data.type !== "slack-huddle-preview:leave-request") return
      if (data.targetKey !== targetKey) return
      handleLeaveRequest()
    }

    window.addEventListener("message", onWindowMessage)

    let channel: BroadcastChannel | null = null
    if (typeof BroadcastChannel !== "undefined") {
      channel = new BroadcastChannel(buildHuddlePreviewChannelName(target))
      channel.onmessage = (event) => {
        const data = event.data as
          | { type?: string; targetKey?: string }
          | null
          | undefined
        if (!data || data.type !== "slack-huddle-preview:leave-request") return
        if (data.targetKey !== targetKey) return
        handleLeaveRequest()
      }
    }

    return () => {
      window.removeEventListener("message", onWindowMessage)
      channel?.close()
    }
  }, [handleLeaveClick, target, targetKey])

  const handleToggleMic = useCallback(async () => {
    if (phase === "preview") {
      // In preview phase, toggle audio track directly without restarting stream
      const stream = previewStreamRef.current
      if (stream) {
        const audioTrack = stream.getAudioTracks()[0]
        if (audioTrack) {
          audioTrack.enabled = !audioTrack.enabled
        }
      }
      setIsMicEnabled((value) => !value)
      return
    }

    const room = roomRef.current
    if (!room) return

    const next = !isMicEnabled
    setIsMicEnabled(next)
    try {
      await room.localParticipant.setMicrophoneEnabled(
        next,
        next && selectedMicId ? { deviceId: { exact: selectedMicId } } : undefined,
      )
      updateRoomVersion()
    } catch (error) {
      setIsMicEnabled(!next)
      toast.error(
        error instanceof Error ? error.message : t("couldNotToggleMic"),
      )
    }
  }, [isMicEnabled, phase, selectedMicId, updateRoomVersion])

  const handleToggleCamera = useCallback(async () => {
    if (phase === "preview") {
      // In preview phase, toggle video track directly without restarting stream
      const stream = previewStreamRef.current
      if (stream) {
        const videoTrack = stream.getVideoTracks()[0]
        if (videoTrack) {
          videoTrack.enabled = !videoTrack.enabled
        }
      }
      setIsCameraEnabled((value) => !value)
      return
    }

    const room = roomRef.current
    if (!room) return

    const next = !isCameraEnabled
    setIsCameraEnabled(next)
    try {
      await room.localParticipant.setCameraEnabled(
        next,
        next && selectedCameraId ? { deviceId: { exact: selectedCameraId } } : undefined,
      )
      updateRoomVersion()
    } catch (error) {
      setIsCameraEnabled(!next)
      toast.error(error instanceof Error ? error.message : t("couldNotToggleCamera"))
    }
  }, [isCameraEnabled, phase, selectedCameraId, updateRoomVersion])

  const handleToggleScreenShare = useCallback(async () => {
    if (phase !== "live") return

    const room = roomRef.current
    if (!room) return

    const next = !isScreenSharing
    setIsScreenSharing(next)

    try {
      await room.localParticipant.setScreenShareEnabled(next, next ? { audio: true } : undefined)
      updateRoomVersion()
    } catch (error) {
      setIsScreenSharing(!next)
      toast.error(
        error instanceof Error ? error.message : t("couldNotToggleScreenShare"),
      )
    }
  }, [isScreenSharing, phase, updateRoomVersion])

  const handleToggleRaiseHand = useCallback(async () => {
    if (phase !== "live") return

    const room = roomRef.current
    if (!room) return

    const next = !isCurrentUserRaisedHand
    setIsCurrentUserRaisedHand(next)

    try {
      await room.localParticipant.setMetadata(
        buildHuddleParticipantMetadataPatch(room.localParticipant.metadata, {
          isRaisedHand: next,
        }),
      )
      updateRoomVersion()
    } catch (error) {
      setIsCurrentUserRaisedHand(!next)
      toast.error(
        error instanceof Error ? error.message : t("couldNotToggleRaiseHand"),
      )
    }
  }, [isCurrentUserRaisedHand, phase, updateRoomVersion])

  const handleSelectMic = useCallback(
    async (deviceId: string) => {
      const previousDeviceId = selectedMicId
      setSelectedMicId(deviceId)
      if (phase !== "preview") {
        const room = roomRef.current
        if (room) {
          try {
            await room.switchActiveDevice("audioinput", deviceId)
          } catch {
            setSelectedMicId(previousDeviceId)
          }
        }
      }
    },
    [phase, selectedMicId],
  )

  const handleSelectSpeaker = useCallback(
    async (deviceId: string) => {
      const previousDeviceId = selectedSpeakerId
      setSelectedSpeakerId(deviceId)
      const room = roomRef.current
      if (room) {
        try {
          await room.switchActiveDevice("audiooutput", deviceId)
        } catch {
          setSelectedSpeakerId(previousDeviceId)
        }
      }
    },
    [selectedSpeakerId],
  )

  const handleSelectCamera = useCallback(
    async (deviceId: string) => {
      const previousDeviceId = selectedCameraId
      setSelectedCameraId(deviceId)
      if (phase !== "preview") {
        const room = roomRef.current
        if (room) {
          try {
            await room.switchActiveDevice("videoinput", deviceId)
          } catch {
            setSelectedCameraId(previousDeviceId)
          }
        }
      }
    },
    [phase, selectedCameraId],
  )

  const participants = useMemo(() => {
    void roomVersion
    const room = roomRef.current
    if (phase !== "live" || !room) return []
    return [room.localParticipant, ...Array.from(room.remoteParticipants.values())]
  }, [phase, roomVersion])

  const liveParticipantCount = useMemo(() => {
    if (phase !== "live") {
      return liveSession?.activeParticipantCount ?? 0
    }

    const realtimeCount = participants.length
    if (realtimeCount > 0) return realtimeCount

    return liveSession?.activeParticipantCount ?? 0
  }, [liveSession?.activeParticipantCount, participants, phase])

  const speakerOptions = useMemo(
    () =>
      deviceState.audioOutputs.length > 0
        ? deviceState.audioOutputs.map((device, index) => ({
            value: device.deviceId,
            label: formatDeviceLabel(device, `Speaker ${index + 1}`),
          }))
        : [{ value: "", label: t("noSpeakerFound") }],
    [deviceState.audioOutputs],
  )

  const micOptions = useMemo(
    () =>
      deviceState.audioInputs.length > 0
        ? deviceState.audioInputs.map((device, index) => ({
            value: device.deviceId,
            label: formatDeviceLabel(device, `Microphone ${index + 1}`),
          }))
        : [{ value: "", label: t("noMicrophoneFound") }],
    [deviceState.audioInputs],
  )

  const cameraOptions = useMemo(
    () =>
      deviceState.videoInputs.length > 0
        ? deviceState.videoInputs.map((device, index) => ({
            value: device.deviceId,
            label: formatDeviceLabel(device, `Camera ${index + 1}`),
          }))
        : [{ value: "", label: t("noCameraFound") }],
    [deviceState.videoInputs],
  )

  const liveRoomState = roomRef.current?.state ?? ConnectionState.Disconnected

  const {
    activeReactionsByParticipant,
    recentReactionToasts,
    sendReaction,
    clearReactions,
  } = useHuddleReactions({
    enabled: phase === "live",
    roomRef,
    roomVersion,
  })

  return {
    phase,
    workspaceBackground,
    headline,
    liveTitle,
    currentUserAvatar,
    currentUserLabel,
    previewStream,
    previewStatus,
    previewError,
    liveError,
    liveSessionParticipants: liveSession?.participants ?? [],
    screenShareCount: (liveSession?.participants ?? []).filter((p) => p.isScreenSharing).length,
    isMicEnabled,
    isCameraEnabled,
    isScreenSharing,
    selectedMicId,
    selectedSpeakerId,
    selectedCameraId,
    setSelectedMicId,
    setSelectedSpeakerId,
    setSelectedCameraId,
    deviceState,
    micOptions,
    speakerOptions,
    cameraOptions,
    participants,
    activeSpeakerIds,
    roomVersion,
    liveParticipantCount,
    liveRoomState,
    handleToggleMic,
    handleToggleCamera,
    handleToggleScreenShare,
    handleToggleRaiseHand,
    handleSelectMic,
    handleSelectSpeaker,
    handleSelectCamera,
    refreshDeviceLists,
    handleStartClick,
    handleLeaveClick,
    closeWindow,
    startButtonLabel,
    isCurrentUserRaisedHand,
    activeReactionsByParticipant,
    recentReactionToasts,
    currentUserId,
    sendReaction,
    clearReactions,
    feedMessageId,
    isThreadOpen,
    toggleThread,
    closeThread,
    isProfilePanelOpen: profilePanelStore.isOpen,
    profilePanelUser: profilePanelStore.userData,
    openProfilePanel,
    closeProfilePanel,
    pinnedParticipantIdentity,
    pinParticipant,
    unpinParticipant,
    isSelfViewHidden,
    hideSelfView,
    showSelfView,
    muteParticipant,
    topic: liveSession?.topic ?? null,
    isTopicDialogOpen,
    setIsTopicDialogOpen,
    handleUpdateTopic,
    isTopicSaving,
    hasThreadUnread,
  }
}
