// Huddle Preview Constants

export const HUDDLE_CONFIG = {
  // Reaction timing (ms)
  REACTION_FLOAT_TTL: 2500,
  REACTION_TOAST_TTL: 3500,
  REACTION_PRUNE_INTERVAL: 200,

  // Device polling
  DEVICE_ENUMERATION_DELAY: 100,

  // Reconnection
  RECONNECT_MAX_ATTEMPTS: 5,
  RECONNECT_BASE_DELAY: 1000,
  RECONNECT_MAX_DELAY: 5000,

  // UI thresholds
  PARTICIPANT_GRID_MAX_BEFORE_VIRTUAL: 9,
  SCREEN_SHARE_MAX_SIMULTANEOUS: 2,

  // Window dimensions
  WINDOW_WIDTH: 560,
  WINDOW_WIDTH_WITH_THREAD: 960,
  WINDOW_HEIGHT: 880,

  // Audio
  AUDIO_LEVEL_UPDATE_INTERVAL: 100,

  // Video
  VIDEO_ELEMENT_FIT: "cover" as const,

  // Connection quality thresholds
  QUALITY_EXCELLENT: "Excellent",
  QUALITY_GOOD: "Good",
  QUALITY_POOR: "Poor",
} as const;

// Runtime storage key prefix
export const RUNTIME_STORAGE_PREFIX = "slack-huddle-live";

// Window communication
export const HUDDLE_PREVIEW_MESSAGE_TYPE = "slack-huddle-preview:leave-request";
export const HUDDLE_PREVIEW_WINDOW_NAME_PREFIX = "slack-huddle-preview";

// LiveKit room settings
export const LIVEKIT_ADAPTIVE_STREAM = true;
export const LIVEKIT_DYNACAST = true;
