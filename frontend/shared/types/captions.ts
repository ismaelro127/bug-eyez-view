export type CaptionMode = "off" | "native" | "ai_live" | "ai_on_demand";

export type CaptionCapabilities = {
  native: boolean;        // stream/track captions available
  ai_live: boolean;       // Whisper live (later)
  ai_on_demand: boolean;  // Whisper VOD (later)
};
