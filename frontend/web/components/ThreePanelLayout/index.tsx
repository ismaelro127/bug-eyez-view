"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import DesktopThreePanelLayout from "./Panels/DesktopThreePanelLayout";
import MobileThreePanelLayout from "./Panels/MobileThreePanelLayout";
import { Channel, EPGEntry } from "../../../types";
import { normalizeEPG } from "../../../shared/utils/normalizeEPG";
import { getDeviceHash } from "../../../shared/device";
import { io } from "socket.io-client";
import { pickBestChannel } from "../../../shared/utils/pickBestChannel"; // Ã¢Å“â€¦ add
import { logger } from "../../utils/logger";
import SettingsView from "../Settings/SettingsView";
import { useSettingsData } from "../Settings/useSettingsData";
import HomeView from "../Home/HomeView";
import { useToast } from "../ui/ToastProvider";
import AdminGuidePage from "../AdminGuidePage";

import ProfileView from "../Profile/ProfileView";
import { apiFetch } from "../../../lib/apiFetch";


type ChannelHealth = {
  channel_id: string;
  health_score: number;
  tier: "high" | "medium" | "unstable";
  is_disabled: boolean;
  suppressed: boolean;
  avg_watch_time?: number;
};

const ThreePanelLayout: React.FC = () => {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const genreScrollRef = useRef<HTMLDivElement | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selected, _setSelected] = useState<Channel | null>(null);
  const selectedRef = useRef<Channel | null>(null);
  const [selectedProgram, setSelectedProgram] = useState<EPGEntry | null>(null);
  const [channelHealth, setChannelHealth] = useState<Record<string, ChannelHealth>>({});
  const [userFeatures, setUserFeatures] = useState<any>(null);
  const [epgData, setEpgData] = useState<Record<string, EPGEntry[]>>({});
  const [nowTs, setNowTs] = useState(() => Date.now());
  const [menuOpen, setMenuOpen] = useState(false);
  const [recentChannelIds, setRecentChannelIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [adOverlayOpen, setAdOverlayOpen] = useState(false);
const [activeView, setActiveView] =
useState<"home" | "live" | "profile" | "settings" | "admin">("live");
  const [favoriteIDs, setFavoriteIDs] = useState<string[]>([]);
const warnedMissingEPGRef = useRef<Set<string>>(new Set());
const warnedCrashEPGRef = useRef<Set<string>>(new Set());
const DEBUG_EPG = false;
 const [unlockConfirm, setUnlockConfirm] = useState<{
  channelId: string;
  channelName: string;
  unlockCost: number;
  unlockType: "channel" | "youtube_pack" | "youtube_choice";
  channelCount?: number;
} | null>(null);

const [unlockBusy, setUnlockBusy] = useState(false);
 const { showToast } = useToast();
const [isMobile, setIsMobile] = useState(false);
const recentSaveReadyRef = useRef(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("All");
const [userProfile, setUserProfile] = useState<any>(null);
const [canSkipAd, setCanSkipAd] = useState(false);
const [skipAdCountdown, setSkipAdCountdown] = useState(5);
const adStartTimeRef = useRef<number | null>(null);
const adRewardIssuedRef = useRef(false);
const [creditBalance, setCreditBalance] = useState<number>(0);
const [unlockedChannelIds, setUnlockedChannelIds] = useState<string[]>([]);

const filteredChannels = useMemo(() => {
  if (selectedGenre === "All") {
    return channels;
  }

  const target = selectedGenre.trim().toLowerCase();

  return channels.filter((channel) => {
    const genre = String(channel.genre || "")
      .trim()
      .toLowerCase();

    const category = String(channel.category || "")
      .trim()
      .toLowerCase();

    return genre === target || category === target;
  });
}, [channels, selectedGenre]);

// keep ref synced
  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  // Ã¢Å“â€¦ Real AI summary state shared by desktop + mobile panels
  const [aiSummary, setAISummary] = useState<any>(null);
  const [loadingAI, setLoadingAI] = useState(false);

  // Ã°Å¸â€â€™ Optional data placeholders
  const liveNewsData: any[] = [];
  const relatedPrograms: any[] = [];
  const detectedPeople: any[] = [];
  const safeOfficialLinks: Record<string, string> = {};
const FAVORITES_KEY = "bugz_favorites_v1";


const buildLocalAISummary = useCallback((channel: Channel, program: EPGEntry | null) => {
  const channelCategory = String(channel.category || channel.genre || "Live TV");
  const summaryMode = (channel as any).summaryMode ||
    (/government|public affairs|congress/i.test(channelCategory) ? "public_affairs" : "normal");

  const title =
    program?.title ||
    (summaryMode === "public_affairs" ? `${channel.name} Briefing` : channel.name || "Live Channel");

  const rawDescription =
    program?.description ||
    (channel as any).description ||
    (channel as any).notes ||
    "";

  const baseSummary = rawDescription ||
    (summaryMode === "public_affairs"
      ? `${channel.name} is a public affairs or government channel. Select a listed hearing, briefing, or live session when available for a more detailed AI summary.`
      : `${channel.name} is currently selected. Detailed AI information depends on available guide data, program descriptions, captions, or backend summary support.`);

  const tags = [channelCategory, channel.language, (channel as any).origin || (channel as any).country]
    .filter(Boolean)
    .map((v: any) => String(v).replace(/\s+/g, "_"));

  return {
    title,
    summary: baseSummary,
    description: baseSummary,
    channel: channel.name || "",
    category: channelCategory,
    summaryMode,
    tags,
    source: program ? "selected_program" : "selected_channel_fallback",
  };
}, []);

useEffect(() => {
  if (!selected) {
    setAISummary(null);
    setLoadingAI(false);
    return;
  }

  const fallback = buildLocalAISummary(selected, selectedProgram);
  setAISummary(fallback);

  const controller = new AbortController();
  let cancelled = false;

  const run = async () => {
    setLoadingAI(true);

    try {
      const res = await fetch("/api/ai-summary", {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: fallback.title,
          description: fallback.description || "",
          channel: selected.name || "",
          channelId: selected.id,
          category: fallback.category,
          language: selected.language || "",
          country: (selected as any).country || (selected as any).origin || "",
          summaryMode: fallback.summaryMode,
          currentProgram: selectedProgram
            ? {
                title: selectedProgram.title || "",
                description: selectedProgram.description || "",
                channel: (selectedProgram as any).channel || selected.name || "",
                category: (selectedProgram as any).category || fallback.category,
              }
            : null,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        logger.warn("AI summary request failed:", res.status, data);
        return;
      }

      if (cancelled) return;

      const normalized = {
        ...fallback,
        title: data?.title || fallback.title,
        summary: data?.summary || data?.description || fallback.summary,
        description: data?.summary || data?.description || fallback.description,
        tags: Array.isArray(data?.tags) ? data.tags : fallback.tags,
        entities: Array.isArray(data?.entities) ? data.entities : [],
        highlights: Array.isArray(data?.highlights) ? data.highlights : [],
        source: "backend_ai_summary",
      };

      setAISummary(normalized);
    } catch (err: any) {
      if (err?.name !== "AbortError") {
        logger.warn("AI summary fallback used:", err);
      }
    } finally {
      if (!cancelled) setLoadingAI(false);
    }
  };

  run();

  return () => {
    cancelled = true;
    controller.abort();
  };
}, [
  selected?.id,
  selected?.name,
  selected?.category,
  selected?.language,
  selectedProgram?.title,
  selectedProgram?.description,
  buildLocalAISummary,
]);

const {
  settings,
  updateSetting,
  resetSettings,
} = useSettingsData();

useEffect(() => {
  const root = document.documentElement;

  const accentMap = {
    cyan: {
      main: "#22d3ee",
      soft: "rgba(34,211,238,0.18)",
      border: "rgba(34,211,238,0.45)",
    },
    emerald: {
      main: "#34d399",
      soft: "rgba(52,211,153,0.18)",
      border: "rgba(52,211,153,0.45)",
    },
    gold: {
      main: "#facc15",
      soft: "rgba(250,204,21,0.18)",
      border: "rgba(250,204,21,0.45)",
    },
    purple: {
      main: "#c084fc",
      soft: "rgba(192,132,252,0.18)",
      border: "rgba(192,132,252,0.45)",
    },
    red: {
      main: "#f87171",
      soft: "rgba(248,113,113,0.18)",
      border: "rgba(248,113,113,0.45)",
    },
  } as const;

  const accent = accentMap[settings.accentColor || "cyan"];

  root.style.setProperty("--bug-accent", accent.main);
  root.style.setProperty("--bug-accent-soft", accent.soft);
  root.style.setProperty("--bug-accent-border", accent.border);

  if (settings.themeMode === "neon") {
    root.style.setProperty("--bug-bg", "#020617");
    root.style.setProperty("--bug-panel-bg", "rgba(0,0,0,0.72)");
    root.style.setProperty("--bug-glow", `0 0 24px ${accent.border}`);
  } else if (settings.themeMode === "holographic") {
    root.style.setProperty("--bug-bg", "#030712");
    root.style.setProperty("--bug-panel-bg", "rgba(255,255,255,0.07)");
    root.style.setProperty("--bug-glow", `0 0 18px ${accent.border}`);
  } else {
    root.style.setProperty("--bug-bg", "#000000");
    root.style.setProperty("--bug-panel-bg", "rgba(255,255,255,0.05)");
    root.style.setProperty("--bug-glow", "none");
  }
}, [settings.themeMode, settings.accentColor]);


  const unlockPromptOpenRef = useRef(false);
const API = (
  process.env.NEXT_PUBLIC_API_URL || ""
).replace(/\/$/, "");

  const recordRecentChannel = useCallback((channelId: string) => {
  if (!channelId) return;

  setRecentChannelIds((prev) => {
    const next = [
      channelId,
      ...prev.filter((id) => id !== channelId),
    ].slice(0, 8);

    try {
      localStorage.setItem(
        "bugz_recent_channels_v1",
        JSON.stringify(next)
      );
    } catch {
      // ignore storage errors
    }

    return next;
  });
}, []);

  // Ã¢Å“â€¦ CENTRALIZED SELECTION (ALL paths must go here)
 const selectChannel = useCallback(
  (ch: Channel) => {
    if (!ch) return;

    const current = selectedRef.current;
    if (current && current.id === ch.id) return;

    const h = channelHealth[ch.id] || (ch as any).health;

    // 1) Hard disabled => instantly swap to best option
    if (h?.is_disabled) {
      const next = pickBestChannel(channels, ch, channelHealth);

      if (next) {
        _setSelected(next);
        selectedRef.current = next;
        recordRecentChannel(next.id);
        return;
      }

      _setSelected(ch);
      selectedRef.current = ch;
      recordRecentChannel(ch.id);
      return;
    }

    // Normal selection
    _setSelected(ch);
    selectedRef.current = ch;
    recordRecentChannel(ch.id);

    // 2) Soft unstable/suppressed => swap after a short delay IF still selected
    if (h?.suppressed || h?.tier === "unstable") {
      const targetId = ch.id;

      setTimeout(() => {
        const current = selectedRef.current;
        if (!current || current.id !== targetId) return;

        const latestH = channelHealth[targetId] || (current as any).health;
        if (!latestH) return;

        if (latestH.suppressed || latestH.tier === "unstable") {
          const next = pickBestChannel(channels, current, channelHealth);

          if (next && next.id !== current.id) {
            _setSelected(next);
            selectedRef.current = next;
            recordRecentChannel(next.id);
          }
        }
      }, 4000);
    }
  },
  [channels, channelHealth, recordRecentChannel]
);

  const handleLogout = async () => {
  try {
  await apiFetch("/api/auth/logout", {
    method: "POST",
  }).catch((err) => {
    logger.warn("Logout request failed:", err);
  });
} finally {
  localStorage.removeItem("token");
  localStorage.removeItem("accessToken");
  localStorage.removeItem("authToken");
  localStorage.removeItem("user");

  // This only clears non-httpOnly cookies.
  // The backend /api/auth/logout route should clear the real httpOnly cookie.
  document.cookie = "token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";

  setUserFeatures(null);
  setMenuOpen(false);

  window.location.href = "/login";
}
};

  // Ã¢Å“â€¦ Wrapper so children can still call `setSelected(ch)`
  // without bypassing centralized logic
  const setSelectedSafe = useCallback(
    (value: any) => {
      // allow React setState function form: setSelected(prev => next)
      if (typeof value === "function") {
        const next = value(selectedRef.current);
        if (next == null) {
          _setSelected(null);
          return;
        }
        selectChannel(next);
        return;
      }

      if (value == null) {
        _setSelected(null);
        return;
      }

      selectChannel(value);
    },
    [selectChannel]
  );

  const requestNextChannel = useCallback(
  (reason: string) => {
    const current = selectedRef.current;
    if (!current) return;

    const next = pickBestChannel(
  channels.filter((ch) => ch.locked !== true),
  current,
  channelHealth
);

if (!next) return;

selectChannel(next);

    // Optional: you can also log this auto action to backend if you want
    // emitEvent("channel-auto-swapped", { from: current.id, to: next.id, reason })
  },
  [channels, channelHealth, selectChannel]
);

const loadServerPreferences = async () => {
  try {
    const res = await apiFetch("/api/user-preferences/me", {
      method: "GET",
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      logger.warn("Server preferences load failed:", data);
      return null;
    }

    return data;
  } catch (err) {
    logger.error("Server preferences load crashed:", err);
    return null;
  }
};

const saveServerPreferences = async (payload: {
  settings?: any;
  favoriteChannelIds?: string[];
  recentChannelIds?: string[];
}) => {
  try {
    const res = await apiFetch("/api/user-preferences/me", {
  method: "PUT",
  body: JSON.stringify(payload),
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  logger.warn("Server preferences save failed:", data);
  return null;
}

return data;
} catch (err) {
  logger.error("Server preferences save crashed:", err);
  return null;
}
};

const closeAdOverlay = () => {
  setAdOverlayOpen(false);
  setCanSkipAd(false);
  setSkipAdCountdown(5);
  adStartTimeRef.current = null;
  adRewardIssuedRef.current = false;
};

const issueOverlayAdReward = async (
  reason: "completed" | "skipped_after_delay"
) => {
  if (adRewardIssuedRef.current) return;

  adRewardIssuedRef.current = true;

  let durationWatched = 0;

  if (reason === "completed") {
    durationWatched = adStartTimeRef.current
      ? Math.floor((Date.now() - adStartTimeRef.current) / 1000)
      : 0;
  }

  if (reason === "skipped_after_delay") {
    durationWatched = 5;
  }

  await handleAdReward({
    reason,
    durationWatched,
    channelId: selectedRef.current?.id,
  });
};


  // Ã°Å¸â€œÂ± Mobile + Tablet detection
useEffect(() => {
  const check = () => {
    const width = window.innerWidth;

    const isTouch =
      window.matchMedia("(pointer: coarse)").matches;

    setIsMobile(
      width < 1100 || isTouch
    );
  };

  check();

  window.addEventListener("resize", check);
  window.addEventListener("orientationchange", check);

  return () => {
    window.removeEventListener("resize", check);
    window.removeEventListener("orientationchange", check);
  };
}, []);


  useEffect(() => {
  const loadUserProfile = async () => {
    try {
      const res = await apiFetch("/api/user-features/me", {
  method: "GET",
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  logger.warn("User profile request failed:", res.status, data);

  return;
}

setUserProfile(data?.user);
setUserFeatures(data?.features);
    } catch (err) {
      console.error("Failed to load user profile:", err);
    }
  };

  loadUserProfile();
}, []);

const serverPrefsLoadedRef = useRef(false);

useEffect(() => {
  if (serverPrefsLoadedRef.current) return;
  serverPrefsLoadedRef.current = true;

  const run = async () => {
    const data = await loadServerPreferences();
    if (!data?.ok) return;

    if (Array.isArray(data.favoriteChannelIds)) {
      setFavoriteIDs(data.favoriteChannelIds);
    }

    if (Array.isArray(data.recentChannelIds)) {
  const cleanRecent = data.recentChannelIds
    .filter((id: any) => typeof id === "string")
    .slice(0, 8);

  setRecentChannelIds(cleanRecent);

  try {
    localStorage.setItem(
      "bugz_recent_channels_v1",
      JSON.stringify(cleanRecent)
    );
  } catch {
    // ignore storage errors
  }
}
    if (data.settings && typeof data.settings === "object") {
      Object.entries(data.settings).forEach(([key, value]) => {
        updateSetting(key as any, value as any);
      });
    }
  };

  run();
}, []);

const prefsSaveReadyRef = useRef(false);

useEffect(() => {
  if (!serverPrefsLoadedRef.current) return;

  if (!prefsSaveReadyRef.current) {
    prefsSaveReadyRef.current = true;
    return;
  }

  const t = setTimeout(() => {
    saveServerPreferences({
      favoriteChannelIds: favoriteIDs,
    });
  }, 700);

  return () => clearTimeout(t);
}, [favoriteIDs]);

useEffect(() => {
  if (!serverPrefsLoadedRef.current) return;

  if (!prefsSaveReadyRef.current) return;

  const t = setTimeout(() => {
    saveServerPreferences({
      settings,
    });
  }, 700);

  return () => clearTimeout(t);
}, [settings]);

// ðŸ”Œ Channel Health Live Updates (Socket.IO)
useEffect(() => {
  if (!API) {
    logger.warn(
      "NEXT_PUBLIC_API_URL is not configured. Socket.IO connection skipped."
    );
    return;
  }

  const socket = io(API, {
    transports: ["websocket"],
  });

  socket.on("connect", () => {
    logger.info("Socket connected:", socket.id);
  });

  const handler = (payload: any) => {
    if (!payload) return;

    // Map form: { channelId: {...}, channelId2: {...} }
    if (
      typeof payload === "object" &&
      !payload.channel_id
    ) {
      setChannelHealth((prev) => ({
        ...prev,
        ...payload,
      }));
      return;
    }

    // Single form: { channel_id, ... }
    if (payload.channel_id) {
      setChannelHealth((prev) => ({
        ...prev,
        [payload.channel_id]: payload,
      }));
    }
  };

  // Support both backend event names
  socket.on("channelHealth:update", handler);
  socket.on("channel-health-update", handler);

  return () => {
    socket.off("channelHealth:update", handler);
    socket.off("channel-health-update", handler);
    socket.disconnect();
  };
}, [API]);

  // Ã¢Å“â€¦ Auto-swap if CURRENT channel becomes disabled via live health update
  useEffect(() => {
  if (!selected) return;

  const h = channelHealth[selected.id];
  if (!h) return;

  if (h.is_disabled) {
    const next = pickBestChannel(channels, selected, channelHealth);
    if (next && next.id !== selected.id) {
      _setSelected(next);
    }
  }
}, [channelHealth, selected, channels]);

  // Ã¢ÂÂ±Ã¯Â¸Â Clock tick
  useEffect(() => {
    const id = setInterval(() => {
      setNowTs(Date.now());
    }, 60_000);
    return () => clearInterval(id);
  }, []);

// Load public + personal channels
useEffect(() => {
  let alive = true;

  const loadChannels = async () => {
    let publicChannels: Channel[] = [];
    let personalChannels: Channel[] = [];

    // --------------------------------------------------
    // Public / legal channels
    // --------------------------------------------------

    try {
      const response = await fetch(
        "/legal_verified_channels.json",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (response.ok) {
        const json = await response.json().catch(() => []);

        if (Array.isArray(json)) {
          publicChannels = json;
        } else {
          logger.warn(
            "Invalid legal_verified_channels.json format:",
            json
          );
        }
      } else {
        logger.warn(
          "Failed to load legal_verified_channels.json:",
          response.status
        );
      }
    } catch (error) {
      logger.warn(
        "Failed to load public channels:",
        error
      );
    }

    // --------------------------------------------------
    // Personal channels
    // --------------------------------------------------

    try {
      const response = await fetch(
        "/personal_channels_verified.json",
        {
          method: "GET",
          cache: "no-store",
        }
      );

      if (response.ok) {
        const json = await response.json().catch(() => []);

        if (Array.isArray(json)) {
          personalChannels = json
            .filter(
              (item: any) =>
                item &&
                typeof item.url === "string" &&
                item.url.length > 0
            )
            .map((item: any, index: number): Channel => {
              const tvgId = String(
                item["tvg-id"] || ""
              ).trim();

              const group = String(
                item["group-title"] || "Personal"
              ).trim();

              return {
                id: `personal:${tvgId || index}`,
                name:
                  String(item.name || "").trim() ||
                  `Personal Channel ${index + 1}`,

                url: item.url,
                delivery: "native",

                logo:
                  String(item["tvg-logo"] || "").trim() ||
                  undefined,

                genre: group,
                category: group,

                epgId: tvgId || undefined,

                hasEPG: false,

                status: "working",
                offline: false,
                isLive: true,

                locked: false,
                unlockDisabled: true,
              };
            });
        } else {
          logger.warn(
            "Invalid personal_channels_verified.json format:",
            json
          );
        }
      } else {
        logger.warn(
          "Failed to load personal_channels_verified.json:",
          response.status
        );
      }
    } catch (error) {
      logger.warn(
        "Failed to load personal channels:",
        error
      );
    }

    if (!alive) return;

    const data: Channel[] = [
      ...publicChannels,
      ...personalChannels,
    ];

    logger.info(
      `Loaded ${publicChannels.length} public channels and ${personalChannels.length} personal channels.`
    );

    setChannels(data);

    if (!selectedRef.current && data.length) {
      const firstPlayable =
        data.find((channel) => channel.locked !== true) ||
        data[0];

      _setSelected(
        (previous) => previous ?? firstPlayable
      );
    }
  };

  loadChannels();

  return () => {
    alive = false;
  };
}, []); // Load public + personal channels


// Load EPG
useEffect(() => {
  if (!channels.length) return;

  let cancelled = false;

  const load = async () => {
    const next: Record<string, EPGEntry[]> = {};

    for (const ch of channels) {
      if (cancelled) return;

      const channelType = String(
        (ch as any).type ||
          (ch as any).delivery ||
          "hls"
      ).toLowerCase();

      const hasEPG = (ch as any).hasEPG;

      /*
       * Explicit false always wins.
       */
      if (hasEPG === false) {
        continue;
      }

      /*
       * Rotation/government-live channels use their
       * own program source rather than /epg/<id>.json.
       */
      if (
        channelType === "rotation" ||
        channelType === "government_live"
      ) {
        continue;
      }

      /*
       * Auto YouTube channels normally have no EPG.
       *
       * But manual YouTube channels are allowed to
       * explicitly opt in with hasEPG: true.
       */
      const isYoutube =
        ch.delivery === "youtube" ||
        channelType === "youtube";

      if (isYoutube && hasEPG !== true) {
        continue;
      }

      const epgUrl = `/epg/${ch.id}.json`;

      try {
        const res = await fetch(epgUrl, {
          method: "GET",
          cache: "no-store",
        });

        if (!res.ok) {
          const warnKey =
            `${ch.id}:${res.status}`;

          if (
            !warnedMissingEPGRef.current.has(
              warnKey
            )
          ) {
            warnedMissingEPGRef.current.add(
              warnKey
            );

            logger.warn(
              `[EPG] ${res.status} missing/unavailable: ${epgUrl}`
            );
          }

          continue;
        }

        const list = await res
          .json()
          .catch(() => null);

        if (!Array.isArray(list)) {
          const warnKey =
            `${ch.id}:invalid-json-shape`;

          if (
            !warnedMissingEPGRef.current.has(
              warnKey
            )
          ) {
            warnedMissingEPGRef.current.add(
              warnKey
            );

            logger.warn(
              `[EPG] Invalid EPG format for ${ch.id}: ${epgUrl}`
            );
          }

          continue;
        }

        const normalized =
          normalizeEPG(ch.id, list);

        next[ch.id] = normalized;

        if (DEBUG_EPG) {
          logger.info(
            `[EPG] Loaded ${ch.id}: ${normalized.length}`
          );
        }
      } catch (err) {
        if (
          !warnedCrashEPGRef.current.has(
            ch.id
          )
        ) {
          warnedCrashEPGRef.current.add(
            ch.id
          );

          logger.error(
            `[EPG] Load crashed for ${ch.id}:`,
            err
          );
        }
      }
    }

    if (!cancelled) {
      setEpgData(next);
    }
  };

  void load();

  return () => {
    cancelled = true;
  };
}, [channels]);

  // Ã¢Â­Â Favorites
  useEffect(() => {
  try {
    const stored =
      JSON.parse(localStorage.getItem(FAVORITES_KEY) || "[]");

    if (Array.isArray(stored)) {
      setFavoriteIDs(stored);
    }
  } catch {
    setFavoriteIDs([]);
  }
}, []);

useEffect(() => {
  try {
    localStorage.setItem(
      FAVORITES_KEY,
      JSON.stringify(favoriteIDs)
    );
  } catch {}
}, [favoriteIDs]);

  useEffect(() => {
  if (!adOverlayOpen) return;

  adStartTimeRef.current = Date.now();
  adRewardIssuedRef.current = false;
  setCanSkipAd(false);
  setSkipAdCountdown(5);

  const id = setInterval(() => {
    setSkipAdCountdown((prev) => {
      if (prev <= 1) {
        setCanSkipAd(true);
        clearInterval(id);
        return 0;
      }

      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(id);
}, [adOverlayOpen]);

  
const startViewAppliedRef = useRef(false);

useEffect(() => {
  if (startViewAppliedRef.current) return;

  startViewAppliedRef.current = true;

  if (settings?.defaultStartView) {
    setActiveView(settings.defaultStartView);
  }
}, [settings?.defaultStartView]);

const handleAdReward = async ({
  reason,
  durationWatched,
  channelId,
}: {
  reason: "completed" | "skipped_after_delay";
  durationWatched: number;
  channelId?: string;
}) => {
  const adSessionId = `ad_${Date.now()}_${
    channelId ?? selectedRef.current?.id ?? "unknown"
  }`;

  const effectiveDeviceHash = await getDeviceHash();

  const payload = {
    adSessionId,
    effectiveDeviceHash,
    durationWatched,
    adType: "rewarded_video",
    reason,
    channelId: channelId ?? selectedRef.current?.id ?? null,
  };

  try {
  const res = await apiFetch("/api/credits/award", {
  method: "POST",
  body: JSON.stringify(payload),
});

const data = await res.json().catch(() => null);

if (!res.ok) {
  logger.error("Ad reward failed:", {
    status: res.status,
    data,
    payload,
  });

  showToast(
    data?.message ||
      data?.error ||
      "Ad reward failed.",
    "error"
  );

  return;
}
  // Ã¢Å“â€¦ update local balance immediately if backend returned it
  if (typeof data?.credits === "number") {
    setCreditBalance(data.credits);
  }

  // Ã¢Å“â€¦ refresh balance + unlocked channels used by TVGuidePanel
showToast(
  typeof data?.amount === "number"
    ? `+${data.amount} credits earned`
    : "Ad reward earned.",
  "success"
);

void loadUnlockData();
} catch (err) {
  logger.error("Ad reward request crashed:", err);
  showToast("Ad reward request failed.", "error");
}
};

  useEffect(() => {
  setMounted(true);
}, []);



const loadUnlockData = async () => {
  try {
    const [balanceRes, unlocksRes] = await Promise.all([
      apiFetch("/api/credits/balance", {
        method: "GET",
      }),
      apiFetch("/api/credits/user/unlocks", {
        method: "GET",
      }),
    ]);

    if (balanceRes.ok) {
      const data = await balanceRes.json().catch(() => null);

      if (typeof data?.credits === "number") {
        setCreditBalance(data.credits);
      }
    }

    if (unlocksRes.ok) {
      const data = await unlocksRes.json().catch(() => null);

      setUnlockedChannelIds(
        Array.isArray(data?.unlockedChannelIds)
          ? data.unlockedChannelIds
          : []
      );

      if (typeof data?.youtubePackUnlocked === "boolean") {
        setUserFeatures((prev: any) => ({
  ...(prev || {}),
  youtubePackUnlocked: data.youtubePackUnlocked,
  youtubePackUnlockCost: Number(
    data?.youtubePackUnlockCost ?? 100
  ),
  youtubePackExpiresAt:
    data?.youtubePackExpiresAt ?? null,
  individualUnlocks: Array.isArray(
    data?.individualUnlocks
  )
    ? data.individualUnlocks
    : [],
}));
      }
    }
  } catch (err) {
    logger.error("Failed to load unlock data:", err);
  }
};

useEffect(() => {
  void loadUnlockData();
}, []);

useEffect(() => {
  type UnlockExpiration = {
    expiresAt: number;
    type: "channel" | "youtube_pack";
    channelId?: string;
  };

  const expirations: UnlockExpiration[] = [];
  const now = Date.now();

  const individualUnlocks = Array.isArray(
    (userFeatures as any)?.individualUnlocks
  )
    ? (userFeatures as any).individualUnlocks
    : [];

  for (const unlock of individualUnlocks) {
    const expiresAt = new Date(unlock?.expiresAt).getTime();

    if (
      Number.isFinite(expiresAt) &&
      expiresAt > now
    ) {
      expirations.push({
        expiresAt,
        type: "channel",
        channelId: unlock?.channelId,
      });
    }
  }

  const youtubePackExpiresAt = new Date(
    (userFeatures as any)?.youtubePackExpiresAt ?? 0
  ).getTime();

  if (
    Number.isFinite(youtubePackExpiresAt) &&
    youtubePackExpiresAt > now
  ) {
    expirations.push({
      expiresAt: youtubePackExpiresAt,
      type: "youtube_pack",
    });
  }

  if (expirations.length === 0) {
    return;
  }

  const nextExpiration = Math.min(
    ...expirations.map((item) => item.expiresAt)
  );

  const expiringItems = expirations.filter(
    (item) => item.expiresAt === nextExpiration
  );

  const delay = Math.max(
    0,
    nextExpiration - Date.now() + 1000
  );

  const timer = window.setTimeout(() => {
    const packExpired = expiringItems.some(
      (item) => item.type === "youtube_pack"
    );

    if (packExpired) {
      showToast(
        "Your 24-hour YouTube access has expired. You can keep watching the current channel until you switch.",
        "info"
      );
    } else {
      const expiredChannelIds = expiringItems
        .filter((item) => item.type === "channel")
        .map((item) => item.channelId)
        .filter(Boolean);

      if (expiredChannelIds.length === 1) {
        const expiredChannel = channels.find(
          (channel) => channel.id === expiredChannelIds[0]
        );

        showToast(
          `${expiredChannel?.name || "Channel"} access has expired. You can keep watching until you switch channels.`,
          "info"
        );
      } else {
        showToast(
          "Your channel access has expired. Currently playing channels can continue until you switch.",
          "info"
        );
      }
    }

    void loadUnlockData();
  }, delay);

  return () => {
    window.clearTimeout(timer);
  };
}, [
  (userFeatures as any)?.individualUnlocks,
  (userFeatures as any)?.youtubePackExpiresAt,
  channels,
]);

const handleUnlockChannel = (channelId: string) => {
  if (unlockPromptOpenRef.current) return;

  const channel = channels.find(
    (item) => item.id === channelId
  );

  if (!channel) {
    showToast(
      "This channel is no longer available.",
      "error"
    );
    return;
  }

  const isYoutubeChannel =
    channel.delivery === "youtube" ||
    (channel as any).type === "youtube" ||
    channel.category === "YouTube Live" ||
    (channel as any).unlockPack === "youtube_all_live";

  if (isYoutubeChannel) {
    const playableYoutubeChannels = channels.filter(
      (item) => {
        const isYoutube =
          item.delivery === "youtube" ||
          (item as any).type === "youtube" ||
          item.category === "YouTube Live" ||
          (item as any).unlockPack ===
            "youtube_all_live";

        const isOffline =
          (item as any).offline === true ||
          (item as any).isLive === false ||
          (item as any).live === false ||
          (item as any).unlockDisabled === true ||
          (item as any).status === "offline" ||
          (item as any).live_status === "offline";

        return isYoutube && !isOffline;
      }
    );

    unlockPromptOpenRef.current = true;

    setUnlockConfirm({
      channelId: channel.id,
      channelName: channel.name || "YouTube Channel",
      unlockCost: Number(channel.unlockCost ?? 25),
      unlockType: "youtube_choice",
      channelCount: playableYoutubeChannels.length,
    });

    return;
  }

  unlockPromptOpenRef.current = true;

  setUnlockConfirm({
    channelId: channel.id,
    channelName: channel.name || "Channel",
    unlockCost: Number(channel.unlockCost ?? 25),
    unlockType: "channel",
  });
};

const confirmUnlockChannel = async (
  requestedUnlockType?: "channel" | "youtube_pack"
) => {
  if (!unlockConfirm || unlockBusy) return;

  const { channelId } = unlockConfirm;

  const unlockType =
    requestedUnlockType ??
    (unlockConfirm.unlockType === "youtube_choice"
      ? "channel"
      : unlockConfirm.unlockType);

  const isYoutubePack =
    unlockType === "youtube_pack";

  try {
    setUnlockBusy(true);

    const res = await apiFetch(
      isYoutubePack
        ? "/api/credits/spend/unlock-youtube-pack"
        : "/api/credits/spend/unlock-channel",
      isYoutubePack
        ? {
            method: "POST",
          }
        : {
            method: "POST",
            body: JSON.stringify({
              channelId,
            }),
          }
    );

    const data = await res.json().catch(() => null);

    if (
      res.status === 401 ||
      res.status === 403
    ) {
      showToast(
        "Your login session was not accepted. Please log out and log back in.",
        "error"
      );
      return;
    }

    if (!res.ok) {
      showToast(
        data?.message ||
          data?.error ||
          (isYoutubePack
            ? "YouTube pack unlock failed."
            : "Channel unlock failed."),
        "error"
      );
      return;
    }

    if (typeof data?.credits === "number") {
      setCreditBalance(data.credits);
    }

    if (isYoutubePack) {
      const returnedIds = Array.isArray(
        data?.unlockedChannelIds
      )
        ? data.unlockedChannelIds
        : [];

      setUnlockedChannelIds((previous) =>
        Array.from(
          new Set([
            ...previous,
            ...returnedIds,
          ])
        )
      );

      setUserFeatures((previous: any) => ({
        ...(previous || {}),
        youtubePackUnlocked: true,
        youtubePackUnlockCost: 100,
        youtubePackExpiresAt:
          data?.expiresAt ??
          data?.youtubePackExpiresAt ??
          null,
      }));
    } else {
      setUnlockedChannelIds((previous) => {
        if (previous.includes(channelId)) {
          return previous;
        }

        return [
          ...previous,
          channelId,
        ];
      });
    }

await loadUnlockData();

if (isYoutubePack) {
  showToast(
    "All YouTube channels unlocked for 24 hours.",
    "success"
  );
} else {
  const unlockedChannel = channels.find(
    (channel) => channel.id === channelId
  );

  showToast(
    `${unlockedChannel?.name || "Channel"} unlocked for 24 hours.`,
    "success"
  );
}

setUnlockConfirm(null);
unlockPromptOpenRef.current = false;  } catch (err) {
    logger.error(
      "Unlock request failed:",
      err
    );

    showToast(
      isYoutubePack
        ? "YouTube pack unlock failed."
        : "Channel unlock failed.",
      "error"
    );
  } finally {
    setUnlockBusy(false);
  }
};

const cancelUnlockChannel = () => {
  setUnlockConfirm(null);
  unlockPromptOpenRef.current = false;
};

const toggleFavoriteChannel = (channelId: string) => {
  setFavoriteIDs((prev) => {
    if (prev.includes(channelId)) {
      return prev.filter((id) => id !== channelId);
    }

    return [...prev, channelId];
  });
};

useEffect(() => {
  try {
    const raw = localStorage.getItem("bugz_recent_channels_v1");
    const parsed = raw ? JSON.parse(raw) : [];

    if (Array.isArray(parsed)) {
      setRecentChannelIds(
        parsed.filter((id) => typeof id === "string").slice(0, 8)
      );
    }
  } catch {
    setRecentChannelIds([]);
  }
}, []);

useEffect(() => {
  if (!serverPrefsLoadedRef.current) return;

  if (!recentSaveReadyRef.current) {
    recentSaveReadyRef.current = true;
    return;
  }

  const t = setTimeout(() => {
    saveServerPreferences({
      recentChannelIds,
    });
  }, 700);

  return () => clearTimeout(t);
}, [recentChannelIds]);

return (
  <>
    {mounted &&
  menuOpen &&
  createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647,
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <div
        style={{
          position: "fixed",
          top: 42,
          left: 8,
          width: 80,
          minWidth: 130,
          maxWidth: 280,
          zIndex: 2147483647,
          background: "rgba(0,0,0,0.96)",
          border: "2px solid rgba(34,211,238,0.75)",
          borderRadius: 14,
          boxShadow: "0 10px 40px rgba(0,0,0,0.95)",
          overflow: "visible",
          pointerEvents: "auto",
        }}
      >
        <button
          onClick={() => {
            setActiveView("home");
            setMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "white",
            background: "transparent",
            border: 0,
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <span>Home</span>
        </button>

        <button
          onClick={() => {
            setActiveView("live");
            setMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "white",
            background: "transparent",
            border: 0,
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <span>Live TV</span>
        </button>

        <button
          onClick={() => {
  setAdOverlayOpen(true);
  setMenuOpen(false);
}}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "#fde047",
            background: "transparent",
            border: 0,
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <span>Watch Ad</span>
        </button>

        <button
          onClick={() => {
            setActiveView("profile");
            setMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "white",
            background: "transparent",
            border: 0,
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <span>Profile</span>
        </button>

        <button
          onClick={() => {
            setActiveView("settings");
            setMenuOpen(false);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "white",
            background: "transparent",
            border: 0,
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          <span>Settings</span>
        </button>

        <button
          onClick={handleLogout}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            width: "100%",
            padding: "12px 16px",
            color: "#fca5a5",
            background: "transparent",
            border: 0,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            textAlign: "left",
            fontSize: 16,
            cursor: "pointer",
          }}
        >
          
          
          <button
  onClick={() => {
    setActiveView("admin");
    setMenuOpen(false);
  }}
  style={{
    display: "flex",
    alignItems: "center",
    gap: 12,
    width: "100%",
    padding: "12px 16px",
    color: "#fde047",
    background: "transparent",
    border: 0,
    textAlign: "left",
    fontSize: 16,
    cursor: "pointer",
  }}
>
  <span>Admin</span>
</button>
<span>Logout</span>
        </button>
      </div>
    </div>,
    document.body
  )}
  
  {mounted &&
  adOverlayOpen &&
  createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        background: "black",
        display: "flex",
        flexDirection: "column",
        pointerEvents: "auto",
      }}
    >
      {/* AD HEADER */}
      <div
        style={{
          height: 52,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 12px",
          borderBottom: "1px solid rgba(255,255,255,0.15)",
          color: "white",
          background: "rgba(0,0,0,0.95)",
        }}
      >
        <div style={{ color: "#22d3ee", fontWeight: 700 }}>
          Sponsored Ad
        </div>

        <div>
          {canSkipAd ? (
            <button
              onClick={async () => {
                await issueOverlayAdReward("skipped_after_delay");
                closeAdOverlay();
              }}
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.25)",
                background: "rgba(255,255,255,0.9)",
                color: "black",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Skip Ad
            </button>
          ) : (
            <div
              style={{
                padding: "8px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.1)",
                color: "white",
                fontSize: 14,
              }}
            >
              Skip in {skipAdCountdown}s
            </div>
          )}
        </div>
      </div>

      {/* AD BODY */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "black",
          overflow: "hidden",
        }}
      >
        <video
          src="/ads/test-ad.mp4"
          autoPlay
          playsInline
          controls={false}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            background: "black",
          }}
          onEnded={async () => {
            await issueOverlayAdReward("completed");
            closeAdOverlay();
          }}
          onError={(e) => {
            console.error("Ad video failed:", e.currentTarget.error);
            console.error("Tried path:", e.currentTarget.currentSrc);
          }}
        />
      </div>
    </div>,
    document.body
  )}
  
<div
  className="relative flex flex-col w-full h-full overflow-hidden text-white isolate"
  style={{
    background: "var(--bug-bg)",
  }}
>
      
{mounted &&
  unlockConfirm &&
  createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unlock-dialog-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !unlockBusy) {
          cancelUnlockChannel();
        }
      }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483646,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        background: "rgba(0, 0, 0, 0.82)",
        pointerEvents: "auto",
      }}
    >
      <div
        onMouseDown={(event) => event.stopPropagation()}
        style={{
          position: "relative",
          zIndex: 2147483646,
          width: "min(92vw, 440px)",
          padding: 24,
          borderRadius: 20,
          border: "2px solid rgba(250, 204, 21, 0.85)",
          background:
            "linear-gradient(180deg, #172033 0%, #050914 100%)",
          color: "#ffffff",
          boxShadow:
            "0 0 35px rgba(250,204,21,0.45), 0 25px 90px rgba(0,0,0,0.95)",
          opacity: 1,
          filter: "none",
          isolation: "isolate",
        }}
      >
        <div
          style={{
            marginBottom: 8,
            color: "#facc15",
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: "0.14em",
          }}
        >
          CHANNEL ACCESS
        </div>

       <h3
  id="unlock-dialog-title"
  style={{
    margin: 0,
    color: "#ffffff",
    fontSize: 22,
    fontWeight: 900,
  }}
>
  {unlockConfirm.unlockType === "youtube_choice"
    ? "Choose YouTube Access"
    : unlockConfirm.unlockType === "youtube_pack"
      ? "Unlock YouTube Pack?"
      : "Unlock channel?"}
</h3>

{unlockConfirm.unlockType === "youtube_choice" && (
  <button
    type="button"
    disabled={unlockBusy}
    onClick={() => {
      void confirmUnlockChannel("channel");
    }}
    style={{
      minWidth: 150,
      padding: "11px 18px",
      borderRadius: 12,
      border: "1px solid #fde68a",
      background: "rgba(250,204,21,0.12)",
      color: "#fde047",
      fontSize: 15,
      fontWeight: 900,
      cursor: unlockBusy ? "not-allowed" : "pointer",
      opacity: unlockBusy ? 0.65 : 1,
    }}
  >
    {unlockBusy
      ? "Unlocking..."
      : `${unlockConfirm.unlockCost} Credits — This Channel`}
  </button>
)}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 12,
            marginTop: 24,
          }}
        >
          <button
            type="button"
            disabled={unlockBusy}
            onClick={cancelUnlockChannel}
            style={{
              minWidth: 100,
              padding: "11px 18px",
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,0.35)",
              background: "rgba(255,255,255,0.08)",
              color: "#ffffff",
              fontSize: 15,
              fontWeight: 800,
              cursor: unlockBusy ? "not-allowed" : "pointer",
              opacity: unlockBusy ? 0.5 : 1,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={unlockBusy}
            onClick={() => {
  void confirmUnlockChannel(
    unlockConfirm.unlockType === "youtube_choice"
      ? "youtube_pack"
      : undefined
  );
}}
            style={{
              minWidth: 110,
              padding: "11px 18px",
              borderRadius: 12,
              border: "2px solid #fde68a",
              background: "#facc15",
              color: "#000000",
              fontSize: 15,
              fontWeight: 950,
              cursor: unlockBusy ? "not-allowed" : "pointer",
              opacity: unlockBusy ? 0.65 : 1,
              boxShadow: "0 0 22px rgba(250,204,21,0.5)",
            }}
          >
            {unlockBusy
  ? "Unlocking..."
  : unlockConfirm.unlockType === "youtube_choice"
    ? "100 Credits — All YouTube"
    : "Unlock"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  )}
    
{/* TOP APP MENU */}
<div
  style={{
  zIndex: 2147483645,
  minHeight: isMobile ? 52 : 44,
  paddingTop: isMobile
    ? "calc(env(safe-area-inset-top, 0px) + -20px)"
    : 0,
}}
>
  <div
    style={{
      position: "relative",
      height: 44,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "0 10px",
    }}
  >
    {/* MENU BUTTON */}
    <button
      type="button"
      aria-label={
        menuOpen
          ? "Close menu"
          : "Open menu"
      }
      title="Menu"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(
          (current) => !current
        );
      }}
      style={{
        position: "absolute",
        left: 10,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        width: 34,
        height: 34,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        border:
          "1px solid var(--bug-accent-border, rgba(34,211,238,0.75))",
        background:
          "rgba(255,255,255,0.1)",
        color: "#ffffff",
        boxShadow:
          "var(--bug-glow, 0 0 14px rgba(34,211,238,0.35))",
        cursor: "pointer",
        pointerEvents: "auto",
        fontSize: 21,
        fontWeight: 900,
        lineHeight: 1,
      }}
    >
{menuOpen ? (
  <>&times;</>
) : (
  <>&#9776;</>
)}    </button>

    {/* APP TITLE */}
    <div
      style={{
        color:
          "var(--bug-accent, #22d3ee)",
        fontSize: 15,
        fontWeight: 900,
        textAlign: "center",
        lineHeight: 1,
      }}
    >
      Bug Eyez View
    </div>

    {/* PLAY AD BUTTON */}
    <button
      type="button"
      title="Play rewarded ad"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();

        setMenuOpen(false);
        setAdOverlayOpen(true);
      }}
      style={{
        position: "absolute",
        right: 10,
        top: "50%",
        transform: "translateY(-50%)",
        zIndex: 10,
        minWidth: 86,
        height: 32,
        padding: "0 12px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        borderRadius: 10,
        border:
          "1px solid rgba(250,204,21,0.75)",
        background:
          "rgba(250,204,21,0.14)",
        color: "#fde047",
        boxShadow:
          "0 0 14px rgba(250,204,21,0.25)",
        cursor: "pointer",
        pointerEvents: "auto",
        fontSize: 12,
        fontWeight: 900,
        whiteSpace: "nowrap",
      }}
    >
      <span aria-hidden="true"></span>
      <span>Play Ad</span>
    </button>
  </div>
</div>
        {/* LIVE TV VIEW */}
    {activeView === "live" && (
      <>
      {/* GENRE TABS */}
<div
  className="flex-shrink-0 relative z-10 border-b border-white/10 bg-[#0b0f14]"
  style={{
    width: "100%",
    maxWidth: "100vw",
    minWidth: 0,
    overflow: "hidden",
  }}
>
  {/* LEFT SCROLL BUTTON */}
  <button
    type="button"
    aria-label="Scroll genres left"
    onClick={() => {
      genreScrollRef.current?.scrollBy({
        left: -280,
        behavior: "smooth",
      });
    }}
    style={{
      position: "absolute",
      left: 4,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 20,
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: "1px solid rgba(34,211,238,0.55)",
      background: "rgba(0,0,0,0.92)",
      color: "#22d3ee",
      cursor: "pointer",
      fontSize: 20,
      fontWeight: 900,
      lineHeight: 1,
    }}
    >
    &lsaquo;
  </button>

  {/* SCROLLABLE TAB AREA */}
<div
  ref={genreScrollRef}
  className="genre-scroll"
  onWheel={(event) => {
    const element = event.currentTarget;

    if (element.scrollWidth <= element.clientWidth) {
      return;
    }

    const movement =
      Math.abs(event.deltaX) > Math.abs(event.deltaY)
        ? event.deltaX
        : event.deltaY;

    element.scrollLeft += movement;
    event.preventDefault();
  }}
  style={{
    width: "100%",
    minWidth: 0,
    display: "flex",
    flexWrap: "nowrap",
    alignItems: "center",
    gap: 8,
    overflowX: "auto",
    overflowY: "hidden",
    padding: "8px 42px",
    WebkitOverflowScrolling: "touch",
    overscrollBehaviorX: "contain",
    touchAction: "pan-x",
    scrollbarWidth: "none",
    msOverflowStyle: "none",
  }}
>
  {[
    "All",
    "News",
    "Government",
    "Public TV",
    "Education",
    "Culture",
    "Sports",
    "Movies",
    "Kids",
    "Music",
    "Documentary",
  ].map((genre) => {
    const active = selectedGenre === genre;

    return (
<button
  key={genre}
  type="button"
  onClick={() => setSelectedGenre(genre)}
  style={{
    whiteSpace: "nowrap",
    flexShrink: 0,
  }}
  className={`
    flex-none whitespace-nowrap rounded-full
    px-4 py-1.5 text-sm transition
              ${
            active
              ? "bg-gradient-to-r from-cyan-400 to-emerald-400 text-black font-semibold"
              : "bg-white/5 text-gray-300 hover:bg-white/10"
          }
        `}
      >
        {genre}
      </button>
    );
  })}
</div>

  {/* RIGHT SCROLL BUTTON */}
  <button
    type="button"
    aria-label="Scroll genres right"
    onClick={() => {
      genreScrollRef.current?.scrollBy({
        left: 280,
        behavior: "smooth",
      });
    }}
    style={{
      position: "absolute",
      right: 4,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 20,
      width: 30,
      height: 30,
      borderRadius: "50%",
      border: "1px solid rgba(34,211,238,0.55)",
      background: "rgba(0,0,0,0.92)",
      color: "#22d3ee",
      cursor: "pointer",
      fontSize: 20,
      fontWeight: 900,
      lineHeight: 1,
    }}
   >
    &rsaquo;
  </button>
</div>

        {/* MAIN LAYOUT */}
        {/* LIVE TV BODY */}
{activeView === "live" && (
  <div className="flex-1 min-h-0 overflow-hidden">
    {isMobile ? (
      <MobileThreePanelLayout
        selected={selected}
        adPlaying={adOverlayOpen}
        setSelected={setSelectedSafe}
channels={filteredChannels}
        selectedProgram={selectedProgram}
        setSelectedProgram={setSelectedProgram}
        aiSummary={aiSummary}
        loadingAI={loadingAI}
        
        unlockedChannelIds={unlockedChannelIds}
        credits={creditBalance}
        onUnlockChannel={handleUnlockChannel}

        setLoadingAI={setLoadingAI}
        appSettings={settings}
        setAISummary={setAISummary}
        timelineRef={timelineRef}
        epgData={epgData}
        nowTs={nowTs}
        onToggleFavorite={toggleFavoriteChannel}
        liveNewsData={liveNewsData}
        relatedPrograms={relatedPrograms}
        detectedPeople={detectedPeople}
        channelHealth={channelHealth}
        safeOfficialLinks={safeOfficialLinks}
        userFeatures={userFeatures}
        favoriteIDs={favoriteIDs}
        setFavoriteIDs={setFavoriteIDs}
      />
    ) : (
      <DesktopThreePanelLayout
channels={filteredChannels}
        timelineRef={timelineRef}
        allEPG={epgData}
        selected={selected}
        setSelected={setSelectedSafe}
        selectedProgram={selectedProgram}
        setSelectedProgram={setSelectedProgram}
        appSettings={settings}
        aiSummary={aiSummary}
        loadingAI={loadingAI}
        setLoadingAI={setLoadingAI}
        setAISummary={setAISummary}
        channelHealth={channelHealth}
        nowTs={nowTs}
        onToggleFavorite={toggleFavoriteChannel}
        epgData={epgData}
        unlockedChannelIds={unlockedChannelIds}
credits={creditBalance}
onUnlockChannel={handleUnlockChannel}
        liveNewsData={liveNewsData}
        relatedPrograms={relatedPrograms}
        detectedPeople={detectedPeople}
        safeOfficialLinks={safeOfficialLinks}
        userFeatures={userFeatures}
        favoriteIDs={favoriteIDs}
        setFavoriteIDs={setFavoriteIDs}
      />
    )}
  </div>
)}
      </>
    )}

    {/* HOME VIEW */}
    {activeView === "home" && (
  <HomeView
    userProfile={userProfile}
    userFeatures={userFeatures}
    channels={channels}
    channelHealth={channelHealth}
    epgData={epgData}
    selected={selected}
    favoriteIDs={favoriteIDs}
    appSettings={settings}
updateSetting={updateSetting}
unlockedChannelIds={unlockedChannelIds}
    creditBalance={creditBalance}
    onGoLive={() => setActiveView("live")}
    onGoProfile={() => setActiveView("profile")}
    onGoSettings={() => setActiveView("settings")}
    onWatchAd={() => setAdOverlayOpen(true)}
    onSelectChannel={(channel) => {
      setSelectedSafe(channel);
      setSelectedProgram(null);
    }}
  />
)}

    {/* PROFILE VIEW */}
{activeView === "profile" && (
  <ProfileView API_BASE={API} />
)}
{/* ADMIN VIEW */}
{activeView === "admin" && (
  <AdminGuidePage />
)}

    {/* SETTINGS VIEW */}
    {activeView === "settings" && (
  <SettingsView
    settings={settings}
    updateSetting={updateSetting}
    resetSettings={resetSettings}
    onLogout={handleLogout}
  userProfile={userProfile}
userFeatures={userFeatures}
favoriteIDs={favoriteIDs}
recentChannelIds={recentChannelIds}
setFavoriteIDs={setFavoriteIDs}
setRecentChannelIds={setRecentChannelIds}
API_BASE={API}
setUserProfile={setUserProfile}
/>
)}
     
  
      </div>
  </>
);
}
export default ThreePanelLayout;


