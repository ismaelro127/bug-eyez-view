export type ChannelDelivery =
  | "native"    // direct video / your content
  | "proxy"     // your proxy
  | "youtube"   // YouTube iframe
  | "embed"    // verified iframe embed
  | "Live Web"; // live stream webpage

export interface Channel {
  id: string;
  name: string;

  // 🔹 Used ONLY for native/proxy playback
  url?: string;

  delivery?: ChannelDelivery;

  // 🔹 YouTube-only
  youtubeId?: string;

  // 🔹 Generic iframe embed (NOT webpages)
  embed?: {
    url: string;
    provider: string;
    trusted?: boolean;
  };

  // existing fields (unchanged)
  number?: number;
  language?: string;
  origin?: string;
  hasEPG?: boolean;
  epgId?: string;
  status?: string;
  genre?: string;
  favorite?: boolean;
  category?: string;
  region?: string;
  offline?: boolean;
isLive?: boolean;
unlockDisabled?: boolean;
logo?: string;
  epg?: EPGEntry[];
  useStrict?: boolean;
  locked?: boolean;
  unlockCost?: number;
  officialLinks?: {
    website?: string;
    wiki?: string;
    twitter?: string;
    facebook?: string;
    youtube?: string;
    [key: string]: string | undefined;
  };

/** AI fallback EPG metadata (optional) */
  aiEPG?: {
    label?: string;     // short title
    summary: string;
    confidence?: number;
    lastUpdated?: string;
    source?: "ai";
  };}


export interface EPGProgram {
  channel?: string;
  title: string;
  description?: string;
  time_local?: string;
  category?: string;
  thumbnail?: string;
  link?: string;
}


export interface EPGItem {
  [x: string]: string | undefined;
  start: string;
  end: string;
  title: string;
  episode?: string;
  description?: string;
}

export interface EPGEntry {
  channel_id: string;
  channel_name?: string;

  title: string;
  episode_title?: string;
  season?: number | null;
  episode?: number | null;
  description?: string;
  isFallback?: boolean;
  isAISummary?: boolean;

  category?: string;
  genre?: string;
  tags?: string[];

  thumbnail?: string;
  link?: string;
  time_local?: string;

  // ✅ SOURCE OF TRUTH (required)
  start_utc: string;
  stop_utc: string;

  // ✅ OPTIONAL but useful
  start_utc_xml?: string;
  stop_utc_xml?: string;

  // ✅ Precomputed helpers (from scraper)
  start_min?: number;
  end_min?: number;
  duration_min?: number;

  // flags
  is_live?: boolean;
  is_repeat?: boolean;
  is_premiere?: boolean;
}

export interface EPGMapEntry {
  epg_id?: string;
}

export type ChannelHealth = {
  channel_id: string;
  health_score: number;
  tier: "high" | "medium" | "unstable";
  is_disabled: boolean;
  suppressed: boolean;

  avg_watch_time?: number;

  // ✅ add these
  suppressed_until?: string | null;
  suppressed_reason?: string;
  disabled_reason?: string;
};