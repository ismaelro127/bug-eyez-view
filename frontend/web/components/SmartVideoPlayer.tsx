// components/SmartVideoPlayer.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import { Channel, EPGEntry } from "../../types";
import { emitEvent } from "../events/emitEvent";
import { logger } from "../utils/logger";

interface Props {
  channel: Channel | null;
  onLoading?: () => void;
adPlaying?: boolean;
  onPlaying?: () => void;
  source: "sidebar" | "epg" | "auto";
  onError?: () => void;
  onRequestNextChannel?: (reason: string) => void;
  muted?: boolean;
}

type RotationItem = {
  id: string;
  title: string;
  description?: string;
  source?: string;
  video_url?: string;
  video_type?: "youtube" | "hls" | "mp4" | "external_link";
  youtubeId?: string;
  duration_sec?: number;
  category?: string;
  topics?: string[];
  legal_status?: string;
};

const getChannelUrl = (channel: Channel | null) =>
  ((channel as any)?.url || (channel as any)?.stream_url || "") as string;

const getChannelKind = (channel: Channel | null) => {
  const anyChannel = channel as any;
  return anyChannel?.type || anyChannel?.delivery || "hls";
};

const getYouTubeEmbedUrl = (channel: Channel) => {
  const anyChannel = channel as any;

  const addYouTubeApiParams = (url: string) => {
    if (!url) return "";

    try {
      const parsed = new URL(url, window.location.origin);

      parsed.searchParams.set("enablejsapi", "1");
      parsed.searchParams.set("playsinline", "1");
      parsed.searchParams.set("rel", "0");

      return parsed.toString();
    } catch {
      return url;
    }
  };

  if (anyChannel?.embed?.url) {
    return addYouTubeApiParams(anyChannel.embed.url);
  }

  if (anyChannel.youtubeId) {
    return addYouTubeApiParams(
      `https://www.youtube.com/embed/${anyChannel.youtubeId}?autoplay=1&mute=1`
    );
  }

  if (anyChannel.youtubeChannelId) {
    return addYouTubeApiParams(
      `https://www.youtube.com/embed/live_stream?channel=${anyChannel.youtubeChannelId}&autoplay=1&mute=1`
    );
  }

  return "";
};

const extractYouTubeId = (url = "") => {
  const watch = url.match(/[?&]v=([^&]+)/i)?.[1];
  if (watch) return watch;

  const embed = url.match(/youtube\.com\/embed\/([^?&/]+)/i)?.[1];
  if (embed) return embed;

  const short = url.match(/youtu\.be\/([^?&/]+)/i)?.[1];
  return short || "";
};

export default function SmartVideoPlayer({
  channel,
  adPlaying = false,
  onLoading,
  onPlaying,
  onError,
  onRequestNextChannel,
  source,
  muted = true,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
const wasPlayingBeforeAdRef = useRef(false);
const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
const rotationYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);

const sendYouTubeCommand = (
  iframe: HTMLIFrameElement | null,
  command: string
) => {
  if (!iframe?.contentWindow) return;

  iframe.contentWindow.postMessage(
    JSON.stringify({
      event: "command",
      func: command,
      args: [],
    }),
    "https://www.youtube.com"
  );
};

  const [showUI, setShowUI] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(muted);
  const [progress, setProgress] = useState(0);
  const [playerExpanded, setPlayerExpanded] = useState(false);
  const [playerToast, setPlayerToast] = useState<string | null>(null);
  const [seekFeedback, setSeekFeedback] = useState<string | null>(null);
  const [volumeFeedback, setVolumeFeedback] = useState<string | null>(null);
  const [brightnessFeedback, setBrightnessFeedback] = useState<string | null>(null);
  const [speedBoost, setSpeedBoost] = useState<boolean>(false);
  const [brightnessLevel, setBrightnessLevel] = useState(1);
  const [rotationItems, setRotationItems] = useState<RotationItem[]>([]);
  const [rotationError, setRotationError] = useState<string | null>(null);
  const [rotationIndex, setRotationIndex] = useState(0);
  const [contextProgram, setContextProgram] = useState<EPGEntry | null>(null);

  const hasStartedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastFailAtRef = useRef<number>(0);
  const failCountRef = useRef<number>(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const lastBrightnessRef = useRef(1);
  const speedBoostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const channelUrl = getChannelUrl(channel);
  const channelKind = getChannelKind(channel);
  void source;
  const currentRotationItem = rotationItems[rotationIndex] || null;

  const isLiveStream =
    channelUrl.includes(".m3u8") ||
    channel?.category === "live" ||
    channel?.category === "news" ||
    channelKind === "government_live";

  const isTouch =
    typeof window !== "undefined" ? window.matchMedia("(hover: none)").matches : false;

  const revealUI = () => setShowUI(true);

  const showPlayerToast = (message: string) => {
    setPlayerToast(message);
    window.setTimeout(() => setPlayerToast(null), 1600);
  };

  useEffect(() => {
    if (!channel) {
      sessionIdRef.current = null;
      return;
    }

    sessionIdRef.current = `play_${Date.now()}_${channel.id}`;
    hasStartedRef.current = false;
    failCountRef.current = 0;
    lastFailAtRef.current = 0;
    setShowUI(true);
  }, [channel?.id]);

  useEffect(() => {
    if (channelKind !== "rotation" || !channelUrl) {
      setRotationItems([]);
      setRotationError(null);
      setRotationIndex(0);
      return;
    }

    let alive = true;

    const loadRotation = async () => {
      try {
        setRotationError(null);
        setRotationItems([]);
        setRotationIndex(0);

        const res = await fetch(channelUrl, { method: "GET", cache: "no-store" });
        const data = await res.json().catch(() => null);

        if (!res.ok || !Array.isArray(data)) {
          throw new Error(`Rotation playlist failed: ${res.status}`);
        }

        if (!alive) return;
        setRotationItems(data.filter((item) => item && item.id && item.title));
      } catch (err) {
        logger.error("Rotation channel failed to load:", err);
        if (!alive) return;
        setRotationError("This rotation playlist could not be loaded.");
      }
    };

    loadRotation();

    return () => {
      alive = false;
    };
  }, [channelKind, channelUrl]);

  useEffect(() => {
    if (channelKind !== "rotation" || rotationItems.length <= 1) return;

    const item = rotationItems[rotationIndex];
    const durationMs = Math.max(30_000, Math.min((item?.duration_sec || 900) * 1000, 30 * 60 * 1000));

    const t = setTimeout(() => {
      setRotationIndex((prev) => (prev + 1) % rotationItems.length);
    }, durationMs);

    return () => clearTimeout(t);
  }, [channelKind, rotationItems, rotationIndex]);

  useEffect(() => {
    const video = videoRef.current;
    const shouldUseNativeVideo =
      channel &&
      channelKind !== "rotation" &&
      channelKind !== "government_live" &&
      channelKind !== "youtube" &&
      !((channel as any)?.embed?.url) &&
      Boolean(channelUrl);
    const looksLikeHls = channelUrl.toLowerCase().includes(".m3u8");

    if (!video || !shouldUseNativeVideo) return;

    let hls: Hls | null = null;
    let startupTimer: ReturnType<typeof setTimeout> | null = null;

    onLoading?.();

    const handlePlaying = () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }

      if (hasStartedRef.current) return;      hasStartedRef.current = true;

      onPlaying?.();
      if (!channel) return;

      emitEvent("channel-play-started", {
        session_id: sessionIdRef.current,
        channel_id: channel.id,
        delivery: (channel as any).delivery || channelKind || "hls",
      });
    };

    const handleError = (reason: string = "unknown_error") => {
      onError?.();
      if (!channel) return;

      emitEvent("channel-play-failed", {
        session_id: sessionIdRef.current,
        channel_id: channel.id,
        reason,
        delivery: (channel as any).delivery || channelKind || "hls",
      });

      const now = Date.now();
      const sinceLast = now - lastFailAtRef.current;
      if (sinceLast > 15_000) failCountRef.current = 0;

      lastFailAtRef.current = now;
      failCountRef.current += 1;

      const shouldSwap =
        reason === "fatal_hls_error" ||
        reason === "autoplay_blocked" ||
        failCountRef.current >= 2;

      if (shouldSwap) {
        onRequestNextChannel?.(reason);
        failCountRef.current = 0;
      }
    };

    const handleVideoError = () => handleError("video_error");

    if (looksLikeHls && Hls.isSupported()) {
      hls = new Hls({ enableWorker: true });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal) {
          handleError("fatal_hls_error");
        } else {
          logger.warn("HLS recoverable error", data?.type);
        }
      });

      hls.loadSource(channelUrl);
      hls.attachMedia(video);
    } else {
      // Non-HLS personal streams previously never received a video src at all,
      // which produced a permanent black screen and bypassed the startup timer.
      video.src = channelUrl;
    }

    video.muted = isMuted;
    video.addEventListener("playing", handlePlaying);
    video.addEventListener("error", handleVideoError);

    startupTimer = setTimeout(() => {
  if (!hasStartedRef.current) {
    handleError("startup_timeout");
  }
}, 12_000);

    video.play().catch(() => handleError("autoplay_blocked"));

    const updateProgress = () => setProgress(video.currentTime);
    video.addEventListener("timeupdate", updateProgress);

    return () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }
      
      hasStartedRef.current = false;

      if (channel && sessionIdRef.current) {
        emitEvent("channel-play-stopped", {
          session_id: sessionIdRef.current,
          channel_id: channel.id,
          reason: "unmount_or_switch",
        });
      }

      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
      video.removeEventListener("playing", handlePlaying);
      video.removeEventListener("error", handleVideoError);
      video.removeEventListener("timeupdate", updateProgress);
    };
  }, [channel?.id, channelUrl, channelKind]);

  useEffect(() => {
    if (!showUI || playerExpanded) return;
    const t = setTimeout(() => setShowUI(false), 6000);
    return () => clearTimeout(t);
  }, [showUI, playerExpanded]);

  useEffect(() => {
    setIsMuted(muted);
    if (videoRef.current) videoRef.current.muted = muted;
  }, [muted]);

  useEffect(() => {
  const video = videoRef.current;
  if (!video) return;

  if (adPlaying) {
    // Remember whether the channel was actually playing.
    wasPlayingBeforeAdRef.current = !video.paused && !video.ended;

    // Stop the channel immediately while the ad is active.
    video.pause();
    return;
  }

  // Ad closed: resume only if the channel had been playing before it.
  if (wasPlayingBeforeAdRef.current) {
    wasPlayingBeforeAdRef.current = false;

    video.play().catch((err) => {
      console.warn("Unable to resume channel after ad:", err);
    });
  }
}, [adPlaying]);

useEffect(() => {
  const command = adPlaying ? "pauseVideo" : "playVideo";

  const sendCommand = (iframe: HTMLIFrameElement | null) => {
    if (!iframe?.contentWindow) return;

    iframe.contentWindow.postMessage(
      JSON.stringify({
        event: "command",
        func: command,
        args: [],
      }),
      "https://www.youtube.com"
    );
  };

  sendCommand(youtubeIframeRef.current);
  sendCommand(rotationYoutubeIframeRef.current);
}, [adPlaying]);

  useEffect(() => {
    const handleContext = (event: Event) => {
      const detail = (event as CustomEvent<{ channel?: Channel; program?: EPGEntry | null }>).detail;
      if (!detail?.channel || detail.channel.id !== channel?.id) return;
      setContextProgram(detail.program || null);
      setShowUI(true);
    };
    window.addEventListener("bugz-player-context", handleContext);
    return () => window.removeEventListener("bugz-player-context", handleContext);
  }, [channel?.id]);

  const playerShellStyle = useMemo<React.CSSProperties | undefined>(() => {
    if (!playerExpanded) return undefined;
    return {
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "100dvh",
      zIndex: 2147483647,
      background: "black",
    };
  }, [playerExpanded]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        void video.play();
        setIsPlaying(true);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    } else {
      const nextPlaying = !isPlaying;
      sendYouTubeCommand(youtubeIframeRef.current, nextPlaying ? "playVideo" : "pauseVideo");
      sendYouTubeCommand(rotationYoutubeIframeRef.current, nextPlaying ? "playVideo" : "pauseVideo");
      setIsPlaying(nextPlaying);
    }
    setShowUI(true);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    const nextMuted = video ? !video.muted : !isMuted;
    if (video) video.muted = nextMuted;
    sendYouTubeCommand(youtubeIframeRef.current, nextMuted ? "mute" : "unMute");
    sendYouTubeCommand(rotationYoutubeIframeRef.current, nextMuted ? "mute" : "unMute");
    setIsMuted(nextMuted);

    const message = nextMuted ? "Muted" : "Sound on";
    setVolumeFeedback(message);
    showPlayerToast(message);
    setTimeout(() => setVolumeFeedback(null), 800);
    setShowUI(true);
  };

  const togglePlayerExpanded = () => {
    setPlayerExpanded((prev) => {
      const next = !prev;
      showPlayerToast(next ? "Expanded player" : "Collapsed player");
      return next;
    });

    setShowUI(true);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const v = Number(e.target.value);
    video.currentTime = v;
    setProgress(v);
    setShowUI(true);
  };

  const handleTouchStart = (e: TouchEvent) => {
    if (!isTouch) return;

    const t = e.touches[0];
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;

    if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);

    speedBoostTimerRef.current = setTimeout(() => {
      setSpeedBoost(true);
      if (videoRef.current) videoRef.current.playbackRate = 1.75;
    }, 500);
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isTouch) return;

    const video = videoRef.current;
    if (!video) return;

    const t = e.touches[0];
    const dx = t.clientX - startXRef.current;
    const dy = t.clientY - startYRef.current;
    const width = window.innerWidth;

    if (startXRef.current < width * 0.33) {
      const vol = Math.min(1, Math.max(0, video.volume - dy * 0.0025));
      video.volume = vol;
      setVolumeFeedback(`${Math.round(vol * 100)}%`);
      setTimeout(() => setVolumeFeedback(null), 800);
    }

    if (startXRef.current > width * 0.66) {
      const newBright = Math.min(1, Math.max(0, lastBrightnessRef.current - dy * 0.002));
      setBrightnessLevel(newBright);
      setBrightnessFeedback(`${Math.round(newBright * 100)}%`);
      setTimeout(() => setBrightnessFeedback(null), 800);
    }

    if (startXRef.current > width * 0.33 && startXRef.current < width * 0.66) {
      if (Math.abs(dx) > 25) {
        const dir = dx > 0 ? 5 : -5;
        video.currentTime += dir;
        setSeekFeedback(dir > 0 ? "⏩ +5s" : "⏪ -5s");
        setTimeout(() => setSeekFeedback(null), 450);
      }
    }

    setShowUI(true);
  };

  const handleTouchEnd = () => {
    if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);

    const video = videoRef.current;
    if (!video) return;

    video.playbackRate = 1;
    setSpeedBoost(false);
    lastBrightnessRef.current = brightnessLevel;
  };

  const handleDoubleTap = (x: number) => {
    const video = videoRef.current;
    if (!video) return;

    const w = window.innerWidth;

    if (x < w * 0.4) {
      video.currentTime -= 10;
      setSeekFeedback("⏪ -10s");
    } else if (x > w * 0.6) {
      video.currentTime += 10;
      setSeekFeedback("⏩ +10s");
    }

    setTimeout(() => setSeekFeedback(null), 450);
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isTouch) return;

    let lastTap = 0;

    const tapHandler = (e: TouchEvent) => {
      const now = Date.now();
      const touch = e.changedTouches?.[0] || e.touches?.[0];
      if (!touch) return;

      const x = touch.clientX;

      if (now - lastTap < 300) {
        handleDoubleTap(x);
        lastTap = 0;
      } else {
        lastTap = now;
        setShowUI(true);
      }
    };

    el.addEventListener("touchstart", handleTouchStart);
    el.addEventListener("touchmove", handleTouchMove);
    el.addEventListener("touchend", handleTouchEnd);
    el.addEventListener("touchend", tapHandler);

    return () => {
      el.removeEventListener("touchstart", handleTouchStart);
      el.removeEventListener("touchmove", handleTouchMove);
      el.removeEventListener("touchend", handleTouchEnd);
      el.removeEventListener("touchend", tapHandler);
    };
  }, [isTouch, brightnessLevel]);

  const formatProgramTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const playerAction = (name: "bugz-player-prev" | "bugz-player-next" | "bugz-player-guide") => {
    window.dispatchEvent(new Event(name));
    setShowUI(true);
  };

  const renderPlayerOverlay = () => {
    if (!channel) return null;
    const start = formatProgramTime(contextProgram?.start_utc);
    const stop = formatProgramTime(contextProgram?.stop_utc);
    const time = start && stop ? `${start} – ${stop}` : "";

    return (
      <>
        <div className="pointer-events-none absolute left-3 top-3 z-[1000000] max-w-[78%] rounded-xl border border-cyan-400/45 bg-black/95 px-3 py-2 text-white shadow-xl">
          <div className="flex items-center gap-2">
            {channel.logo ? <img src={channel.logo} alt="" className="h-8 w-8 rounded object-contain" /> : null}
            <div className="min-w-0">
              <div className="truncate text-sm font-black text-cyan-200">{channel.name}</div>
              <div className="truncate font-mono text-[10px] text-cyan-100/65">ID: {channel.id}</div>
            </div>
          </div>
          {showUI && (
            <div className="mt-2 border-t border-white/10 pt-2">
              {contextProgram ? (
                <>
                  <div className="text-xs font-bold text-white">{contextProgram.title || "Current program"}</div>
                  {time ? <div className="mt-0.5 text-[10px] text-white/55">{time}</div> : null}
                  <div className="mt-1 line-clamp-2 text-[10px] leading-relaxed text-white/65">
                    {contextProgram.description || "Program description unavailable."}
                  </div>
                </>
              ) : (
                <div className="text-[11px] text-white/60">EPG information unavailable</div>
              )}
            </div>
          )}
        </div>

        {showUI && (
          <>
            <div
              className="absolute z-[1000001] flex max-w-[calc(100%-88px)] flex-nowrap items-center justify-start gap-3 rounded-2xl border border-white/20 bg-black p-2 shadow-2xl"
              style={{
  left: "100px",
  bottom: playerExpanded
    ? "max(84px, calc(72px + env(safe-area-inset-bottom, 0px)))"
    : "16px",
}}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-col overflow-hidden rounded-2xl border border-white/15 bg-black/95">
                <button
                  type="button"
                  className="h-8 min-w-[82px] border-b border-white/15 px-3 text-base font-black text-cyan-200"
                  title="Channel up"
                  onClick={() => playerAction("bugz-player-next")}
                >
                  CH ▲
                </button>
                <button
                  type="button"
                  className="h-8 min-w-[82px] px-3 text-base font-black text-cyan-200"
                  title="Channel down"
                  onClick={() => playerAction("bugz-player-prev")}
                >
                  CH ▼
                </button>
              </div>

              <button type="button" className="h-16 w-16 rounded-2xl border border-white/15 bg-black/95 text-2xl text-cyan-200" title={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>{isPlaying ? "⏸" : "▶"}</button>
              <button type="button" className="h-16 w-16 rounded-2xl border border-white/15 bg-black/95 text-2xl text-cyan-200" title={isMuted ? "Unmute" : "Mute"} onClick={toggleMute}>{isMuted ? "🔇" : "🔊"}</button>
              <button type="button" className="h-16 w-16 rounded-2xl border border-white/15 bg-black/95 text-3xl text-cyan-200" title="Guide" onClick={() => playerAction("bugz-player-guide")}>▦</button>
            </div>

            <button
              type="button"
              className="absolute bottom-3 right-3 z-[1000003] h-16 w-16 rounded-2xl border border-cyan-400/55 bg-black/95 text-2xl text-cyan-200 shadow-2xl"
              title={playerExpanded ? "Exit fullscreen" : "Fullscreen"}
              onClick={(e) => {
                e.stopPropagation();
                togglePlayerExpanded();
              }}
            >
              {playerExpanded ? "⌄" : "⛶"}
            </button>
          </>
        )}
      </>
    );
  };

  const renderExpandedButton = () => renderPlayerOverlay();

  const renderInfoCard = ({
    title,
    description,
    buttonText,
    href,
    details,
  }: {
    title: string;
    description: string;
    buttonText?: string;
    href?: string;
    details?: string[];
  }) => (
    <div
      ref={containerRef}
      className="relative w-full h-full bg-black text-white flex items-center justify-center p-5"
      style={playerShellStyle}
      onMouseMove={revealUI}
      onMouseEnter={revealUI}
      onPointerMove={revealUI}
      onPointerDown={revealUI}
      onTouchStart={revealUI}
      onClick={revealUI}
    >
      <div className="w-full max-w-2xl rounded-2xl border border-cyan-400/30 bg-white/5 p-5 shadow-[0_0_24px_rgba(34,211,238,0.18)]">
        <div className="text-xs uppercase tracking-[0.2em] text-cyan-300 mb-2">Bug Eyez View</div>
        <h2 className="text-2xl font-black text-white mb-2">{title}</h2>
        <p className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">{description}</p>

        {details && details.length > 0 && (
          <ul className="mt-4 space-y-2 text-sm text-gray-300 list-disc pl-5">
            {details.map((detail) => (
              <li key={detail}>{detail}</li>
            ))}
          </ul>
        )}

        {href && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex mt-5 rounded-xl bg-cyan-300 px-4 py-2 text-sm font-black text-black hover:bg-cyan-200 transition"
          >
            {buttonText || "Open official source"}
          </a>
        )}
      </div>
      {renderExpandedButton()}
    </div>
  );

  if (channelKind === "government_live") {
    const officialLinks = (channel as any)?.officialLinks || {};
    const firstOfficialLink =
      officialLinks.house || officialLinks.senate || officialLinks.website || "https://live.house.gov/";

    return renderInfoCard({
      title: channel?.name || "U.S. Congress Live",
      description:
        "This government live channel is ready for official House, Senate, or committee feeds. When no official live feed is active, use Public Affairs Rotation for recent hearings and government coverage.",
      href: firstOfficialLink,
      buttonText: "Open official live source",
      details: [
        "Use official government sources only.",
        "Avoid news-network clips or rehosted streams.",
        "AI summary mode is set to public affairs for neutral plain-English context.",
      ],
    });
  }

  if (channelKind === "rotation") {
    if (rotationError) {
      return renderInfoCard({
        title: channel?.name || "Public Affairs Rotation",
        description: rotationError,
      });
    }

    if (!currentRotationItem) {
      return renderInfoCard({
        title: channel?.name || "Public Affairs Rotation",
        description: "Loading official public affairs rotation content...",
      });
    }

    const itemUrl = currentRotationItem.video_url || "";
    const youtubeId = currentRotationItem.youtubeId || extractYouTubeId(itemUrl);

    if (currentRotationItem.video_type === "youtube" && youtubeId) {
      return (
        <div
          ref={containerRef}
          className="relative w-full h-full bg-black"
          style={playerShellStyle}
          onMouseMove={revealUI}
          onMouseEnter={revealUI}
          onPointerMove={revealUI}
          onPointerDown={revealUI}
          onTouchStart={revealUI}
          onClick={revealUI}
        >
          <iframe
  ref={rotationYoutubeIframeRef}
  src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`}
  className="w-full h-full border-0"
  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
  onLoad={() => {
    window.setTimeout(() => {
      sendYouTubeCommand(rotationYoutubeIframeRef.current, "unMute");
    }, 500);
  }}
/>
          <div className="absolute left-3 top-3 z-[1000000] max-w-[72%] rounded-xl bg-black/80 border border-cyan-400/40 px-3 py-2 text-xs text-white">
            <div className="font-black text-cyan-300">{currentRotationItem.title}</div>
            {currentRotationItem.source && <div className="text-gray-300">{currentRotationItem.source}</div>}
          </div>
          {renderExpandedButton()}
        </div>
      );
    }

    return renderInfoCard({
      title: currentRotationItem.title,
      description:
        currentRotationItem.description ||
        "Official public affairs content selected for the rotation channel.",
      href: itemUrl,
      buttonText: "Open source content",
      details: [
        currentRotationItem.source ? `Source: ${currentRotationItem.source}` : "Source: official public affairs source",
        currentRotationItem.category ? `Category: ${currentRotationItem.category}` : "Category: Government",
        currentRotationItem.topics?.length ? `Topics: ${currentRotationItem.topics.join(", ")}` : "AI summary mode: public affairs",
      ].filter(Boolean),
    });
  }

  const youtubeEmbedUrl = channel ? getYouTubeEmbedUrl(channel) : "";

  if (channel && (channelKind === "youtube" || youtubeEmbedUrl)) {
    return (
      <div
        className="relative w-full h-full bg-black"
        onMouseMove={revealUI}
        onMouseEnter={revealUI}
        onPointerMove={revealUI}
        onPointerDown={revealUI}
        onTouchStart={revealUI}
        onClick={revealUI}
        style={playerShellStyle}
      >
        <iframe
  ref={youtubeIframeRef}
  src={youtubeEmbedUrl}
  className="w-full h-full border-0"
  allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
  allowFullScreen
  referrerPolicy="strict-origin-when-cross-origin"
  onLoad={() => {
    window.setTimeout(() => {
      sendYouTubeCommand(youtubeIframeRef.current, "unMute");
    }, 500);
  }}
/>
        {renderExpandedButton()}
      </div>
    );
  }

  return (
    <div
      id="video-container"
      ref={containerRef}
      className="relative w-full h-full bg-black"
      style={playerShellStyle}
      onMouseMove={revealUI}
      onMouseEnter={revealUI}
      onPointerMove={revealUI}
      onPointerDown={revealUI}
      onTouchStart={revealUI}
      onClick={revealUI}
    >
      {brightnessLevel < 0.99 && (
        <div
          className="absolute inset-0 holo-brightness-mask pointer-events-none"
          style={{ opacity: 1 - brightnessLevel }}
        />
      )}

      {seekFeedback && (
        <div className="absolute top-1/3 inset-x-0 text-center text-3xl holo-seek-feedback z-50">
          {seekFeedback}
        </div>
      )}

      {volumeFeedback && <div className="absolute left-4 top-4 holo-hud z-50">{volumeFeedback}</div>}
      {brightnessFeedback && <div className="absolute right-4 top-4 holo-hud z-50">{brightnessFeedback}</div>}
      {speedBoost && <div className="absolute inset-x-0 top-1/4 text-center holo-speed z-50">⚡ Speed Boost</div>}

      {playerToast && (
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "18%",
            transform: "translateX(-50%)",
            zIndex: 1000002,
            padding: "8px 14px",
            borderRadius: 999,
            background: "rgba(0,0,0,0.88)",
            color: "rgb(165,243,252)",
            border: "1px solid rgba(0,255,255,0.55)",
            boxShadow: "0 0 14px rgba(0,255,255,0.28)",
            fontSize: 13,
            fontWeight: 900,
            pointerEvents: "none",
            whiteSpace: "nowrap",
          }}
        >
          {playerToast}
        </div>
      )}

            {channel ? (
        <>
          <video
            ref={videoRef}
            className="w-full h-full object-contain bg-black"
            playsInline
            muted={isMuted}
          />

        </>
      ) : (
        <div className="flex items-center justify-center w-full h-full bg-black text-gray-400">
          Select a channel to start playback
        </div>
      )}

      {renderPlayerOverlay()}

      {showUI && !isLiveStream && Number.isFinite(videoRef.current?.duration || NaN) && (videoRef.current?.duration || 0) > 0 ? (
        <div className="absolute left-3 right-3 z-[1000000]" style={{ bottom: playerExpanded ? 96 : 88 }}>
          <input
            type="range"
            min="0"
            max={videoRef.current?.duration || 0}
            value={progress}
            onChange={handleSeek}
            style={{ width: "100%", accentColor: "rgb(0,255,255)" }}
          />
        </div>
      ) : null}
    </div>
  );
}
