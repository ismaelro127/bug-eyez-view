export const EVENT_TYPES = {
  CHANNEL_SELECTED: "CHANNEL_SELECTED",
  CHANNEL_PLAY_STARTED: "CHANNEL_PLAY_STARTED",
  CHANNEL_PLAY_FAILED: "CHANNEL_PLAY_FAILED",
  CHANNEL_WENT_OFFLINE: "CHANNEL_WENT_OFFLINE",
  CHANNEL_PLAY_STOPPED: "CHANNEL_PLAY_STOPPED",
} as const;

export type EventType =
  typeof EVENT_TYPES[keyof typeof EVENT_TYPES];

export type EventPayloadMap = {
  CHANNEL_SELECTED: {
    channel_id: string;
    source: "sidebar" | "epg";
  };

  CHANNEL_PLAY_STARTED: {
    channel_id: string;
    delivery: "embed" | "hls";
  };


  CHANNEL_PLAY_FAILED: {
    channel_id: string;
    reason: string;
  };

  CHANNEL_PLAY_STOPPED: {
  channel_id: string;
  duration_seconds: number;
};

  CHANNEL_WENT_OFFLINE: {
    channel_id: string;
  };
};
