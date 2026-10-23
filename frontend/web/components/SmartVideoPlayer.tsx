// components/SmartVideoPlayer.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  /** Optional: the program that follows contextProgram. Only shown when provided. */
  nextProgram?: EPGEntry | null;
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

type NowOverride = {
  title: string;
  subtitle?: string;
  nextTitle?: string;
};

type GestureZone = "left" | "middle" | "right" | null;

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

/* ------------------------------------------------------------------ */
/* Holographic broadcast styling (no extra deps: plain CSS, no Tailwind) */
/* ------------------------------------------------------------------ */

const BUGZ_STYLES = `
.bugz-glass{background:linear-gradient(135deg,rgba(14,30,54,0.62),rgba(5,11,24,0.58));-webkit-backdrop-filter:blur(14px) saturate(140%);backdrop-filter:blur(14px) saturate(140%);border:1px solid rgba(103,232,249,0.30);box-shadow:inset 0 1px 0 rgba(255,255,255,0.06),inset 0 0 0 1px rgba(103,232,249,0.05),0 0 18px rgba(34,211,238,0.14),0 10px 30px rgba(0,0,0,0.45);}
.bugz-iridescent::before{content:"";position:absolute;inset:0;border-radius:inherit;padding:1px;background:linear-gradient(120deg,rgba(103,232,249,0.6),rgba(167,139,250,0.35) 35%,rgba(244,114,182,0.22) 55%,rgba(103,232,249,0.08) 75%,rgba(103,232,249,0.45));-webkit-mask:linear-gradient(#000 0 0) content-box,linear-gradient(#000 0 0);-webkit-mask-composite:xor;mask-composite:exclude;pointer-events:none;}
.bugz-iridescent::after{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(115deg,transparent 30%,rgba(186,230,253,0.07) 42%,rgba(232,121,249,0.06) 50%,transparent 60%);pointer-events:none;}
.bugz-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;gap:4px;min-width:48px;min-height:48px;border-radius:16px;color:rgb(186,240,250);cursor:pointer;-webkit-tap-highlight-color:transparent;transition:box-shadow .2s ease,border-color .2s ease,color .2s ease,transform .12s ease;}
.bugz-btn:hover,.bugz-btn:focus-visible,.bugz-btn[data-active="true"]{border-color:rgba(103,232,249,0.75);color:#e0fbff;box-shadow:inset 0 0 12px rgba(34,211,238,0.18),0 0 16px rgba(34,211,238,0.45),0 10px 30px rgba(0,0,0,0.45);outline:none;}
.bugz-btn:active{transform:scale(.95);border-color:rgba(165,243,252,0.9);box-shadow:inset 0 0 16px rgba(34,211,238,0.3),0 0 22px rgba(34,211,238,0.6);}
.bugz-scanlines{background:repeating-linear-gradient(to bottom,rgba(255,255,255,0.5) 0px,rgba(255,255,255,0.5) 1px,transparent 1px,transparent 3px);opacity:.035;mix-blend-mode:overlay;}
.bugz-progress{-webkit-appearance:none;appearance:none;width:100%;height:18px;background:transparent;cursor:pointer;margin:0;display:block;}
.bugz-progress:focus{outline:none;}
.bugz-progress::-webkit-slider-runnable-track{height:3px;border-radius:999px;background:linear-gradient(to right,rgb(103,232,249) 0%,rgb(103,232,249) var(--bugz-pct,0%),rgba(148,163,184,0.25) var(--bugz-pct,0%),rgba(148,163,184,0.25) 100%);box-shadow:0 0 8px rgba(34,211,238,0.55);}
.bugz-progress::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:12px;height:12px;margin-top:-4.5px;border-radius:50%;background:#e0fbff;border:none;box-shadow:0 0 10px rgba(34,211,238,0.9),0 0 2px #fff;}
.bugz-progress::-moz-range-track{height:3px;border-radius:999px;background:rgba(148,163,184,0.25);}
.bugz-progress::-moz-range-progress{height:3px;border-radius:999px;background:rgb(103,232,249);box-shadow:0 0 8px rgba(34,211,238,0.55);}
.bugz-progress::-moz-range-thumb{width:12px;height:12px;border-radius:50%;background:#e0fbff;border:none;box-shadow:0 0 10px rgba(34,211,238,0.9);}
@keyframes bugz-pulse{0%,100%{opacity:1}50%{opacity:.45}}
@keyframes bugz-pop{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.bugz-live-dot{animation:bugz-pulse 1.6s ease-in-out infinite;}
.bugz-pop{animation:bugz-pop .2s ease-out;}
.bugz-shell{position:relative;width:100%;height:100%;background:#000;overflow:hidden;}
.bugz-media{display:block;width:100%;height:100%;border:0;object-fit:contain;background:#000;}
.bugz-empty{display:flex;align-items:center;justify-content:center;width:100%;height:100%;background:#000;font-size:14px;letter-spacing:.025em;color:rgba(207,250,254,.5);}
.bugz-scanlines{position:absolute;inset:0;z-index:999998;pointer-events:none;}
.bugz-catcher{position:absolute;inset:0;z-index:999997;background:transparent;}
.bugz-scrim{position:absolute;left:0;right:0;bottom:0;height:40%;z-index:999999;pointer-events:none;}
.bugz-badge{position:absolute;right:12px;top:12px;z-index:1000000;display:flex;align-items:center;gap:10px;max-width:78%;border-radius:16px;padding:8px 12px;pointer-events:none;box-sizing:border-box;}
.bugz-badge-icon{width:28px;height:28px;flex-shrink:0;}
.bugz-badge-logo{width:24px;height:24px;flex-shrink:0;border-radius:4px;object-fit:contain;}
.bugz-badge-name{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:.14em;color:rgba(255,255,255,.9);}
.bugz-badge-brand{color:rgb(103,232,249);}
.bugz-live{display:flex;flex-shrink:0;align-items:center;gap:6px;border-left:1px solid rgba(255,255,255,.15);padding-left:10px;}
.bugz-live-dot{display:inline-block;width:8px;height:8px;border-radius:999px;background:#ef4444;box-shadow:0 0 8px rgba(239,68,68,.9);}
.bugz-live-text{font-size:12px;font-weight:700;letter-spacing:.14em;color:rgba(255,255,255,.9);}
.bugz-dock{position:absolute;left:0;right:0;bottom:0;z-index:1000001;display:flex;flex-direction:column;gap:12px;padding-left:12px;padding-right:12px;pointer-events:none;box-sizing:border-box;}
.bugz-lower{position:relative;width:100%;overflow:hidden;border-radius:16px;padding:12px 16px;color:#fff;box-sizing:border-box;text-align:left;}
.bugz-tag{display:inline-flex;align-items:center;margin-bottom:8px;border-radius:6px;padding:2px 10px;font-size:10px;font-weight:700;letter-spacing:.12em;box-shadow:0 0 12px rgba(220,38,38,.35);}
.bugz-tag-prime{border:1px solid rgba(248,113,113,.5);background:rgba(185,28,28,.8);color:#fff;}
.bugz-tag-live{border:1px solid rgba(248,113,113,.4);background:rgba(220,38,38,.25);color:#fee2e2;}
.bugz-label{font-size:10px;font-weight:600;letter-spacing:.22em;color:rgb(103,232,249);text-shadow:0 0 12px rgba(34,211,238,.35);}
.bugz-title{margin-top:2px;font-family:ui-serif,Georgia,Cambria,"Times New Roman",serif;font-size:18px;line-height:1.375;color:#fff;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.bugz-sub{margin-top:4px;font-size:12px;color:rgba(255,255,255,.7);}
.bugz-truncate{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bugz-desc{display:none;margin-top:4px;font-size:11px;line-height:1.625;color:rgba(255,255,255,.55);-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.bugz-unavail{margin-top:4px;font-size:14px;color:rgba(255,255,255,.55);}
.bugz-divider{margin:10px 0;height:1px;background:linear-gradient(to right,rgba(103,232,249,.35),rgba(255,255,255,.1),transparent);}
.bugz-next{margin-top:2px;font-size:12px;color:rgba(255,255,255,.8);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.bugz-next-time{margin-right:6px;color:rgba(255,255,255,.6);}
.bugz-controls{position:relative;display:flex;flex-wrap:wrap;align-items:flex-start;justify-content:center;gap:8px;pointer-events:auto;}
.bugz-btn-wrap{display:flex;flex-direction:column;align-items:center;gap:4px;}
.bugz-btn{box-sizing:border-box;margin:0;padding:0;font:inherit;width:48px;height:48px;}
.bugz-btn-wide{width:auto;min-width:60px;padding:0 12px;}
.bugz-btn-label{user-select:none;-webkit-user-select:none;font-size:9px;font-weight:600;letter-spacing:.18em;color:rgba(207,250,254,.7);}
.bugz-btn-ch{font-size:11px;font-weight:700;letter-spacing:.05em;}
.bugz-icon{display:block;width:24px;height:24px;flex-shrink:0;}
.bugz-icon-sm{width:20px;height:20px;}
.bugz-menu{position:absolute;bottom:100%;right:0;z-index:1000002;margin-bottom:12px;min-width:210px;border-radius:16px;padding:8px;font-size:12px;color:#fff;text-align:left;}
.bugz-menu-head{padding:4px 8px;font-size:10px;font-weight:600;letter-spacing:.2em;color:rgb(103,232,249);}
.bugz-menu-row{padding:4px 8px;color:rgba(255,255,255,.7);}
.bugz-menu-id{margin-top:4px;border-top:1px solid rgba(255,255,255,.1);padding:6px 8px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:9px;color:rgba(255,255,255,.35);}
.bugz-progress-wrap{position:absolute;left:0;right:0;bottom:0;z-index:1000002;}
.bugz-fb-center{position:absolute;left:0;right:0;top:33.333%;z-index:1000002;text-align:center;font-size:30px;line-height:36px;color:#cffafe;pointer-events:none;text-shadow:0 0 12px rgba(34,211,238,.35);}
.bugz-fb-speed{top:25%;font-size:14px;line-height:20px;font-weight:700;letter-spacing:.1em;}
.bugz-fb-chip{position:absolute;z-index:1000002;border-radius:12px;padding:6px 12px;font-size:14px;font-weight:700;color:#cffafe;pointer-events:none;}
.bugz-fb-vol{left:16px;top:16px;}
.bugz-fb-bright{right:16px;top:80px;}
.bugz-dim{position:absolute;inset:0;z-index:20;pointer-events:none;background:#000;}
.bugz-card-shell{display:flex;align-items:center;justify-content:center;padding:64px 20px 224px;color:#fff;box-sizing:border-box;}
.bugz-card{position:relative;max-height:100%;width:100%;max-width:672px;overflow:auto;border-radius:16px;padding:20px;box-sizing:border-box;text-align:left;}
.bugz-card-kicker{margin-bottom:8px;font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.24em;color:rgb(103,232,249);text-shadow:0 0 12px rgba(34,211,238,.35);}
.bugz-card-title{margin:0 0 8px;font-family:ui-serif,Georgia,Cambria,"Times New Roman",serif;font-size:24px;line-height:32px;font-weight:400;color:#fff;}
.bugz-card-text{margin:0;font-size:14px;line-height:1.625;color:rgba(255,255,255,.7);white-space:pre-wrap;}
.bugz-card-list{margin:16px 0 0;padding-left:20px;list-style:disc;font-size:14px;color:rgba(255,255,255,.65);}
.bugz-card-list li{margin-top:8px;}
.bugz-card-list li::marker{color:rgba(103,232,249,.7);}
.bugz-btn.bugz-card-link{z-index:10;margin-top:20px;width:auto;height:auto;min-width:0;min-height:0;border-radius:12px;border:1px solid rgba(103,232,249,.6);background:rgba(34,211,238,.15);padding:8px 16px;font-size:14px;font-weight:700;color:#cffafe;text-decoration:none;}
/* Overlay frame = the actual (letterboxed) video box, not the wider shell. */
.bugz-frame{position:absolute;z-index:999996;pointer-events:none;box-sizing:border-box;}
.bugz-frame > *{pointer-events:none;}
.bugz-frame .bugz-controls,.bugz-frame .bugz-progress-wrap,.bugz-frame .bugz-menu{pointer-events:auto;}
.bugz-frame .bugz-scanlines,.bugz-frame .bugz-catcher{position:absolute;inset:0;}
.bugz-dock{flex-direction:column;align-items:stretch;justify-content:flex-end;gap:8px;}
.bugz-controls{flex-wrap:nowrap;align-items:flex-start;justify-content:center;}
/* lg: big player (>= 1000x460 video box) - lower-third left, controls right, labels on */
.bugz-frame[data-size="lg"] .bugz-badge{right:16px;top:16px;padding:8px 16px;}
.bugz-frame[data-size="lg"] .bugz-badge-icon{width:36px;height:36px;}
.bugz-frame[data-size="lg"] .bugz-badge-name,.bugz-frame[data-size="lg"] .bugz-live-text{font-size:14px;}
.bugz-frame[data-size="lg"] .bugz-dock{flex-direction:row;align-items:flex-start;justify-content:space-between;gap:16px;padding-left:16px;padding-right:16px;}
.bugz-frame[data-size="lg"] .bugz-lower{width:min(400px,40%);flex-shrink:1;min-width:0;padding:14px 18px;}
.bugz-frame[data-size="lg"] .bugz-tag,.bugz-frame[data-size="lg"] .bugz-label{font-size:12px;}
.bugz-frame[data-size="lg"] .bugz-title{font-size:22px;}
.bugz-frame[data-size="lg"] .bugz-sub,.bugz-frame[data-size="lg"] .bugz-next{font-size:14px;}
.bugz-frame[data-size="lg"] .bugz-desc{display:-webkit-box;}
.bugz-frame[data-size="lg"] .bugz-controls{justify-content:flex-end;gap:10px;flex-shrink:0;}
.bugz-frame[data-size="lg"] .bugz-btn{width:52px;height:52px;}
.bugz-frame[data-size="lg"] .bugz-btn-wide{width:auto;min-width:66px;}
.bugz-frame[data-size="lg"] .bugz-btn-label{font-size:10px;}
/* md + sm: slim two-line lower-third stacked above one row of controls, no labels */
.bugz-frame:not([data-size="lg"]) .bugz-btn-label{display:none;}
.bugz-frame:not([data-size="lg"]) .bugz-desc{display:none;}
.bugz-frame:not([data-size="lg"]) .bugz-divider + .bugz-label{order:3;}
.bugz-frame:not([data-size="lg"]) .bugz-lower{display:flex;flex-wrap:wrap;align-items:baseline;column-gap:8px;row-gap:2px;align-self:flex-start;width:100%;max-width:min(560px,100%);padding:7px 12px;border-radius:12px;}
.bugz-frame:not([data-size="lg"]) .bugz-tag{margin:0;padding:1px 6px;font-size:9px;border-radius:4px;align-self:center;}
.bugz-frame:not([data-size="lg"]) .bugz-label{font-size:9px;letter-spacing:.16em;}
.bugz-frame:not([data-size="lg"]) .bugz-title{flex:1 1 0;min-width:0;margin:0;font-size:15px;line-height:1.25;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;-webkit-line-clamp:unset;}
.bugz-frame:not([data-size="lg"]) .bugz-sub{order:2;margin:0;font-size:11px;white-space:nowrap;flex-shrink:0;}
.bugz-frame:not([data-size="lg"]) .bugz-divider{order:1;flex-basis:100%;height:0;margin:0;background:none;}
.bugz-frame:not([data-size="lg"]) .bugz-next{order:3;margin:0;font-size:11px;flex:1 1 0;min-width:0;}
.bugz-frame[data-size="md"] .bugz-controls{gap:8px;}
.bugz-frame[data-size="md"] .bugz-btn{width:44px;height:44px;min-width:44px;min-height:44px;border-radius:14px;}
.bugz-frame[data-size="md"] .bugz-btn-wide{width:auto;min-width:56px;padding:0 10px;}
.bugz-frame[data-size="sm"] .bugz-dock{gap:6px;padding-left:8px;padding-right:8px;}
.bugz-frame[data-size="sm"] .bugz-controls{gap:6px;}
.bugz-frame[data-size="sm"] .bugz-btn{width:36px;height:36px;min-width:36px;min-height:36px;border-radius:11px;}
.bugz-frame[data-size="sm"] .bugz-btn-wide{width:auto;min-width:46px;padding:0 7px;}
.bugz-frame[data-size="sm"] .bugz-icon{width:18px;height:18px;}
.bugz-frame[data-size="sm"] .bugz-icon-sm{width:15px;height:15px;}
.bugz-frame[data-size="sm"] .bugz-btn-ch{font-size:10px;}
.bugz-frame[data-size="sm"] .bugz-title{font-size:13px;}
.bugz-frame[data-size="sm"] .bugz-lower{padding:5px 10px;}
.bugz-frame[data-size="sm"] .bugz-badge{right:8px;top:8px;gap:6px;padding:4px 8px;border-radius:10px;max-width:70%;}
.bugz-frame[data-size="sm"] .bugz-badge-icon{width:20px;height:20px;}
.bugz-frame[data-size="sm"] .bugz-badge-logo{width:18px;height:18px;}
.bugz-frame[data-size="sm"] .bugz-badge-name,.bugz-frame[data-size="sm"] .bugz-live-text{font-size:10px;letter-spacing:.1em;}
.bugz-frame[data-size="sm"] .bugz-live{padding-left:6px;}
.bugz-frame[data-size="sm"] .bugz-menu{min-width:180px;margin-bottom:8px;}
.bugz-frame[data-size="sm"] .bugz-scrim{height:55%;}
.bugz-frame[data-xs="true"] .bugz-sub{display:none;}
.bugz-frame[data-xs="true"] .bugz-badge-icon{display:none;}
.bugz-card-shell{padding-bottom:144px;}
@media (min-width:640px){.bugz-card{padding:24px;}}
@media (prefers-reduced-motion: reduce){.bugz-live-dot,.bugz-pop{animation:none;}.bugz-fade{transition:none !important;}}
`;

const renderStyles = () => <style>{BUGZ_STYLES}</style>;

const glassTextShadow = "0 0 12px rgba(34,211,238,0.35)";

/** Fade + slide in/out. visibility is delayed on hide so the fade can finish, and hidden controls can't be clicked or tabbed to. */
const fadeStyle = (visible: boolean, offsetY = 12): React.CSSProperties => ({
  opacity: visible ? 1 : 0,
  transform: visible ? "translateY(0)" : `translateY(${offsetY}px)`,
  visibility: visible ? "visible" : "hidden",
  transition: visible
    ? "opacity 280ms ease, transform 280ms ease, visibility 0s linear 0s"
    : "opacity 320ms ease, transform 320ms ease, visibility 0s linear 320ms",
});

const SvgIcon = ({ children, className = "bugz-icon" }: { children: React.ReactNode; className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

const IconChDown = () => (
  <SvgIcon className="bugz-icon bugz-icon-sm">
    <path d="M6 9l6 6 6-6" />
  </SvgIcon>
);
const IconChUp = () => (
  <SvgIcon className="bugz-icon bugz-icon-sm">
    <path d="M18 15l-6-6-6 6" />
  </SvgIcon>
);
const IconPlay = () => (
  <SvgIcon>
    <path d="M8 5.5v13l10.5-6.5z" />
  </SvgIcon>
);
const IconPause = () => (
  <SvgIcon>
    <path d="M8.5 5.5v13M15.5 5.5v13" strokeWidth={2.2} />
  </SvgIcon>
);
const IconVolume = () => (
  <SvgIcon>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
    <path d="M15.5 9a4.2 4.2 0 0 1 0 6" />
    <path d="M18 6.5a7.8 7.8 0 0 1 0 11" />
  </SvgIcon>
);
const IconMuted = () => (
  <SvgIcon>
    <path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />
    <path d="M16 9.5l5 5M21 9.5l-5 5" />
  </SvgIcon>
);
const IconGuide = () => (
  <SvgIcon>
    {[5, 10.5, 16].map((y) =>
      [5, 10.5, 16].map((x) => <rect key={`${x}-${y}`} x={x} y={y} width={3.5} height={3.5} rx={0.6} />)
    )}
  </SvgIcon>
);
const IconMore = () => (
  <SvgIcon>
    <circle cx={5.5} cy={12} r={1.3} fill="currentColor" />
    <circle cx={12} cy={12} r={1.3} fill="currentColor" />
    <circle cx={18.5} cy={12} r={1.3} fill="currentColor" />
  </SvgIcon>
);
const IconFullscreen = () => (
  <SvgIcon>
    <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
  </SvgIcon>
);
const IconExitFullscreen = () => (
  <SvgIcon>
    <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
  </SvgIcon>
);

/** Hexagon "bug eye" mark for the channel badge. */
const HexBugIcon = ({ className = "bugz-badge-icon" }: { className?: string }) => (
  <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true" focusable="false">
    <path
      d="M16 2.5l11.7 6.75v13.5L16 29.5 4.3 22.75V9.25z"
      stroke="rgb(103,232,249)"
      strokeWidth={1.4}
      fill="rgba(34,211,238,0.08)"
      style={{ filter: "drop-shadow(0 0 3px rgba(34,211,238,0.7))" }}
    />
    <g stroke="rgb(186,240,250)" strokeWidth={1.1} strokeLinecap="round">
      <ellipse cx={16} cy={18} rx={4.2} ry={5.4} />
      <circle cx={16} cy={11.2} r={2.2} />
      <path d="M16 12.6v10.8M11.8 15.5l-3-1.8M11.8 18.5H8.6M11.8 21.3l-3 1.8M20.2 15.5l3-1.8M20.2 18.5h3.2M20.2 21.3l3 1.8M14.8 9.3l-1.4-1.8M17.2 9.3l1.4-1.8" />
    </g>
    <circle cx={16} cy={17} r={1.2} fill="rgb(103,232,249)" />
  </svg>
);

const GlassButton = ({
  title,
  label,
  onClick,
  active,
  wide,
  children,
}: {
  title: string;
  label?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  active?: boolean;
  wide?: boolean;
  children: React.ReactNode;
}) => (
  <div className="bugz-btn-wrap">
    <button
      type="button"
      title={title}
      aria-label={title}
      data-active={active ? "true" : undefined}
      onClick={onClick}
      className={`bugz-btn bugz-glass${wide ? " bugz-btn-wide" : ""}`}
    >
      {children}
    </button>
    {label ? (
      <span className="bugz-btn-label">{label}</span>
    ) : null}
  </div>
);

export default function SmartVideoPlayer({
  channel,
  adPlaying = false,
  onLoading,
  onPlaying,
  onError,
  onRequestNextChannel,
  source,
  muted = true,
  nextProgram = null,
}: Props) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const wasPlayingBeforeAdRef = useRef(false);
  const youtubeIframeRef = useRef<HTMLIFrameElement | null>(null);
  const rotationYoutubeIframeRef = useRef<HTMLIFrameElement | null>(null);

  const sendYouTubeCommand = (iframe: HTMLIFrameElement | null, command: string) => {
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
  const [duration, setDuration] = useState(0);
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
  // undefined = the context event didn't include `next`, so fall back to the nextProgram prop.
  const [contextNext, setContextNext] = useState<EPGEntry | null | undefined>(undefined);
  const [moreOpen, setMoreOpen] = useState(false);
  const [containerEl, setContainerEl] = useState<HTMLDivElement | null>(null);

  const hasStartedRef = useRef(false);
  const sessionIdRef = useRef<string | null>(null);
  const lastFailAtRef = useRef<number>(0);
  const failCountRef = useRef<number>(0);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const seekAnchorXRef = useRef(0);
  const gestureZoneRef = useRef<GestureZone>(null);
  const lastBrightnessRef = useRef(1);
  const speedBoostTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // One timer per key, so repeated toasts/feedback replace each other instead of stacking.
  const timersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const schedule = (key: string, fn: () => void, ms: number) => {
    const timers = timersRef.current;
    if (timers[key]) clearTimeout(timers[key]);
    timers[key] = setTimeout(() => {
      delete timers[key];
      fn();
    }, ms);
  };

  // Latest-value mirrors for async callbacks (iframe onLoad timers, ad transitions).
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const isMutedRef = useRef(isMuted);
  isMutedRef.current = isMuted;
  const adPlayingRef = useRef(adPlaying);
  adPlayingRef.current = adPlaying;
  const prevAdPlayingRef = useRef(adPlaying);
  const ytWasPlayingBeforeAdRef = useRef(false);

  // Callback ref so touch listeners re-bind whenever the rendered branch (and its container element) changes.
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    setContainerEl(el);
  }, []);

  // The overlay is laid out inside the real picture box (object-fit: contain
  // letterboxing), so controls / lower-third / badge never hang outside the video.
  const [shellSize, setShellSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [mediaAspect, setMediaAspect] = useState<number>(16 / 9);
  useEffect(() => {
    const el = containerEl;
    if (!el) return;
    const measure = () => setShellSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      return () => window.removeEventListener("resize", measure);
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerEl]);
  useEffect(() => setMediaAspect(16 / 9), [channel?.id]);
  const syncMediaAspect = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    const v = e.currentTarget;
    if (v.videoWidth > 0 && v.videoHeight > 0) setMediaAspect(v.videoWidth / v.videoHeight);
  }, []);

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
    schedule("toast", () => setPlayerToast(null), 1600);
  };

  const flashVolume = (message: string) => {
    setVolumeFeedback(message);
    schedule("volume", () => setVolumeFeedback(null), 800);
  };

  const flashBrightness = (message: string) => {
    setBrightnessFeedback(message);
    schedule("brightness", () => setBrightnessFeedback(null), 800);
  };

  const flashSeek = (message: string) => {
    setSeekFeedback(message);
    schedule("seek", () => setSeekFeedback(null), 450);
  };

  useEffect(() => {
    const timers = timersRef;
    return () => {
      Object.values(timers.current).forEach((t) => clearTimeout(t));
      timers.current = {};
      if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);
    };
  }, []);

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
    setMoreOpen(false);
    // New channel autoplays; native video re-syncs from real play/pause events.
    setIsPlaying(true);
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

    setProgress(0);
    setDuration(0);
    onLoading?.();

    const handlePlaying = () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }

      if (hasStartedRef.current) return;
      hasStartedRef.current = true;

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
  reason === "startup_timeout" ||
  reason === "video_error" ||
  failCountRef.current >= 2;

      if (shouldSwap) {
  // Personal channels stay selected when unavailable.
  // The player will render its error/offline state instead of changing channels.
  if (channel.id.startsWith("personal:")) {
    failCountRef.current = 0;
    return;
  }

  onRequestNextChannel?.(reason);
  failCountRef.current = 0;
}
    };

    const handleVideoError = () => handleError("video_error");

    // Keep the play/pause icon and the seek bar in sync with the real element.
    const handlePlayEvent = () => setIsPlaying(true);
    const handlePauseEvent = () => setIsPlaying(false);
    const syncDuration = () => {
      const d = video.duration;
      setDuration(Number.isFinite(d) && d > 0 ? d : 0);
    };

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
    video.addEventListener("play", handlePlayEvent);
    video.addEventListener("pause", handlePauseEvent);
    video.addEventListener("loadedmetadata", syncDuration);
    video.addEventListener("durationchange", syncDuration);

    startupTimer = setTimeout(() => {
      if (!hasStartedRef.current) {
        handleError("startup_timeout");
      }
    }, 12_000);

video.play().catch((err) => {
  logger.warn("Video autoplay blocked:", err);
});
    const updateProgress = () => setProgress(video.currentTime);
    video.addEventListener("timeupdate", updateProgress);

    return () => {
      if (startupTimer) {
        clearTimeout(startupTimer);
        startupTimer = null;
      }

      // Detach state-sync listeners first so the teardown pause() below
      // doesn't flip the icon to "paused" for the next channel.
      video.removeEventListener("play", handlePlayEvent);
      video.removeEventListener("pause", handlePauseEvent);
      video.removeEventListener("loadedmetadata", syncDuration);
      video.removeEventListener("durationchange", syncDuration);

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
  if (!showUI || moreOpen) return;

  const t = setTimeout(() => setShowUI(false), 6000);

  return () => clearTimeout(t);
}, [showUI, moreOpen]);

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

  // YouTube iframes: only act on real ad transitions (never on first mount),
  // and only resume if the video was playing before the ad started.
  useEffect(() => {
    if (prevAdPlayingRef.current === adPlaying) return;
    prevAdPlayingRef.current = adPlaying;

    if (adPlaying) {
      ytWasPlayingBeforeAdRef.current = isPlayingRef.current;
      sendYouTubeCommand(youtubeIframeRef.current, "pauseVideo");
      sendYouTubeCommand(rotationYoutubeIframeRef.current, "pauseVideo");
      return;
    }

    if (ytWasPlayingBeforeAdRef.current) {
      ytWasPlayingBeforeAdRef.current = false;
      sendYouTubeCommand(youtubeIframeRef.current, "playVideo");
      sendYouTubeCommand(rotationYoutubeIframeRef.current, "playVideo");
    }
  }, [adPlaying]);

  useEffect(() => {
    const handleContext = (event: Event) => {
      const detail = (
        event as CustomEvent<{ channel?: Channel; program?: EPGEntry | null; next?: EPGEntry | null }>
      ).detail;
      if (!detail?.channel || detail.channel.id !== channel?.id) return;
      setContextProgram(detail.program || null);
      setContextNext("next" in detail ? detail.next || null : undefined);
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

  /** After an iframe loads: keep it paused if an ad is up, and only unmute when the player isn't muted. */
  const handleYouTubeLoad = (iframeRef: React.RefObject<HTMLIFrameElement | null>, key: string) => {
    schedule(
      key,
      () => {
        const iframe = iframeRef.current;
        if (adPlayingRef.current) {
          sendYouTubeCommand(iframe, "pauseVideo");
          return;
        }
        if (!isMutedRef.current) {
          sendYouTubeCommand(iframe, "unMute");
        }
      },
      500
    );
  };

  const togglePlay = () => {
    const video = videoRef.current;
    if (video) {
      if (video.paused) {
        video.play().catch((err) => logger.warn("Play request was blocked", err));
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
    flashVolume(message);
    showPlayerToast(message);
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
    if (!t) return;
    startXRef.current = t.clientX;
    startYRef.current = t.clientY;
    seekAnchorXRef.current = t.clientX;

    const width = window.innerWidth;
    gestureZoneRef.current =
      t.clientX < width * 0.33
        ? "left"
        : t.clientX > width * 0.66
          ? "right"
          : t.clientX > width * 0.33 && t.clientX < width * 0.66
            ? "middle"
            : null;

    if (speedBoostTimerRef.current) clearTimeout(speedBoostTimerRef.current);

    // Speed boost only means something for the native <video> element.
    if (!videoRef.current) return;

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
    if (!t) return;
    const dy = t.clientY - startYRef.current;
    const zone = gestureZoneRef.current;

    if (zone === "left") {
      const vol = Math.min(1, Math.max(0, video.volume - dy * 0.0025));
      video.volume = vol;
      flashVolume(`${Math.round(vol * 100)}%`);
    }

    if (zone === "right") {
      const newBright = Math.min(1, Math.max(0, lastBrightnessRef.current - dy * 0.002));
      setBrightnessLevel(newBright);
      flashBrightness(`${Math.round(newBright * 100)}%`);
    }

    if (zone === "middle") {
      // One 5s step each time the finger travels another 25px, not one per touchmove.
      const stepDx = t.clientX - seekAnchorXRef.current;
      if (Math.abs(stepDx) > 25) {
        const dir = stepDx > 0 ? 5 : -5;
        video.currentTime += dir;
        seekAnchorXRef.current = t.clientX;
        flashSeek(dir > 0 ? "⏩ +5s" : "⏪ -5s");
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
      flashSeek("⏪ -10s");
    } else if (x > w * 0.6) {
      video.currentTime += 10;
      flashSeek("⏩ +10s");
    }
  };

  useEffect(() => {
    const el = containerEl;
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
  }, [containerEl, isTouch, brightnessLevel]);

  const formatProgramTime = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };

  const playerAction = (
  name:
    | "bugz-player-prev"
    | "bugz-player-next"
    | "bugz-player-guide"
    | "bugz-player-ai"
    | "bugz-player-personal"
) => {
  window.dispatchEvent(new Event(name));
};

  const effectiveNext: EPGEntry | null = contextNext !== undefined ? contextNext : nextProgram;

  const renderFeedback = () => (
    <>
      {seekFeedback && (
        <div className="bugz-fb-center">
          {seekFeedback}
        </div>
      )}

      {volumeFeedback && (
        <div className="bugz-fb-chip bugz-fb-vol bugz-glass bugz-pop">
          {volumeFeedback}
        </div>
      )}
      {brightnessFeedback && (
        <div className="bugz-fb-chip bugz-fb-bright bugz-glass bugz-pop">
          {brightnessFeedback}
        </div>
      )}
      {speedBoost && (
        <div className="bugz-fb-center bugz-fb-speed">
          ⚡ Speed Boost
        </div>
      )}

      {playerToast && (
        <div
          className="bugz-glass bugz-pop"
          style={{
            position: "absolute",
            left: "50%",
            top: "18%",
            transform: "translateX(-50%)",
            zIndex: 1000002,
            padding: "8px 16px",
            borderRadius: 999,
            color: "rgb(165,243,252)",
            fontSize: 13,
            fontWeight: 800,
            letterSpacing: "0.04em",
            pointerEvents: "none",
            whiteSpace: "nowrap",
            textShadow: glassTextShadow,
          }}
        >
          {playerToast}
        </div>
      )}
    </>
  );

  const renderPlayerOverlay = (
    opts: { nowOverride?: NowOverride; allowProgress?: boolean; fullFrame?: boolean } = {}
  ) => {
    if (!channel) return null;
    const { nowOverride, allowProgress = false, fullFrame = false } = opts;

    // Picture box inside the shell (same math as object-fit: contain).
    const sw = shellSize.w;
    const sh = shellSize.h;
    let fw = sw;
    let fh = sh;
    if (!fullFrame && sw > 0 && sh > 0 && mediaAspect > 0) {
      if (sw / sh > mediaAspect) fw = Math.round(sh * mediaAspect);
      else fh = Math.round(sw / mediaAspect);
    }
    const frameStyle: React.CSSProperties =
      sw > 0 && sh > 0
        ? { left: Math.round((sw - fw) / 2), top: Math.round((sh - fh) / 2), width: fw, height: fh }
        : { left: 0, top: 0, right: 0, bottom: 0 };
    const frameW = fw || 9999;
    const frameH = fh || 9999;
    const frameSize =
      frameW >= 1000 && frameH >= 460 ? "lg" : frameW >= 640 && frameH >= 360 ? "md" : "sm";
    const frameXs = frameSize === "sm" && (frameW < 420 || frameH < 240);

    const program = nowOverride ? null : contextProgram;
    const start = formatProgramTime(program?.start_utc);
    const stop = formatProgramTime(program?.stop_utc);
    const time = start && stop ? `${start} – ${stop}` : start || "";

    const nextTitle = nowOverride ? nowOverride.nextTitle : effectiveNext?.title;
    const nextTime = nowOverride ? "" : formatProgramTime(effectiveNext?.start_utc);

    // PRIME TIME = program starts (or, with no program, it's currently) between 6 PM and midnight local time.
    const parsedStart = program?.start_utc ? new Date(program.start_utc) : null;
    const refDate = parsedStart && !Number.isNaN(parsedStart.getTime()) ? parsedStart : new Date();
    const isPrimeTime = refDate.getHours() >= 18;
    const tag = isPrimeTime ? "PRIME TIME" : isLiveStream ? "LIVE" : null;

    const showProgress = allowProgress && !isLiveStream && duration > 0;
    const progressPct = showProgress ? Math.min(100, Math.max(0, (progress / duration) * 100)) : 0;
    const dockBottom = playerExpanded ? "max(12px, env(safe-area-inset-bottom, 0px))" : "12px";

    return (
      <div className="bugz-frame" data-size={frameSize} data-xs={frameXs ? "true" : undefined} style={frameStyle}>
        {/* Faint scanlines + bottom scrim for legibility */}
        <div className="bugz-scanlines" />
        <div
          className="bugz-scrim bugz-fade"
          style={{
            background: "linear-gradient(to top, rgba(2,6,16,0.72), rgba(2,6,16,0.25) 55%, transparent)",
            ...fadeStyle(showUI, 0),
          }}
        />

        {/* Top-right channel badge (channel ID is intentionally only in the More menu) */}
        <div className="bugz-badge bugz-glass bugz-iridescent">
          <HexBugIcon />
          {channel.logo ? <img src={channel.logo} alt="" className="bugz-badge-logo" /> : null}
          <div className="bugz-badge-name" style={{ textShadow: glassTextShadow }}>
            {channel.name ? (
              channel.name
            ) : (
              <>
                BUG EYEZ <span className="bugz-badge-brand">TV</span>
              </>
            )}
          </div>
          {isLiveStream ? (
            <div className="bugz-live">
              <span className="bugz-live-dot" />
              <span className="bugz-live-text">LIVE</span>
            </div>
          ) : null}
        </div>

        {/* Bottom dock: lower-third (stacks above controls on narrow screens) + control row */}
        <div
          className="bugz-dock"
          style={{ paddingBottom: showProgress ? `calc(${dockBottom} + 14px)` : dockBottom }}
        >
          {/* Lower-third */}
          <div
            className="bugz-lower bugz-glass bugz-iridescent bugz-fade"
            style={fadeStyle(showUI, 14)}
          >
            {tag ? (
              <div className={`bugz-tag ${tag === "PRIME TIME" ? "bugz-tag-prime" : "bugz-tag-live"}`}>
                {tag}
              </div>
            ) : null}

            <div className="bugz-label">
              NOW
            </div>

            {nowOverride ? (
              <>
                <div className="bugz-title">{nowOverride.title}</div>
                {nowOverride.subtitle ? <div className="bugz-sub bugz-truncate">{nowOverride.subtitle}</div> : null}
              </>
            ) : program ? (
              <>
                <div className="bugz-title">
                  {program.title || "Current program"}
                </div>
                {time ? <div className="bugz-sub">{time}</div> : null}
                {program.description ? (
                  <div className="bugz-desc">{program.description}</div>
                ) : null}
              </>
            ) : (
              <div className="bugz-unavail">EPG information unavailable</div>
            )}

            {nextTitle ? (
              <>
                <div className="bugz-divider" />
                <div className="bugz-label">
                  NEXT
                </div>
                <div className="bugz-next">
                  {nextTime ? <span className="bugz-next-time">{nextTime}</span> : null}
                  {nextTitle}
                </div>
              </>
            ) : null}
          </div>

          {/* Controls */}
          <div
            className="bugz-controls bugz-fade"
            style={fadeStyle(showUI, 14)}
            onClick={(e) => e.stopPropagation()}
          >
            <GlassButton title="Channel down" wide onClick={() => playerAction("bugz-player-prev")}>
              <span className="bugz-btn-ch">CH</span>
              <IconChDown />
            </GlassButton>

            <GlassButton title={isPlaying ? "Pause" : "Play"} onClick={togglePlay}>
              {isPlaying ? <IconPause /> : <IconPlay />}
            </GlassButton>

            <GlassButton title={isMuted ? "Unmute" : "Mute"} active={!isMuted} onClick={toggleMute}>
              {isMuted ? <IconMuted /> : <IconVolume />}
            </GlassButton>

            <GlassButton title="Guide" label="GUIDE" onClick={() => playerAction("bugz-player-guide")}>
              <IconGuide />
            </GlassButton>

<GlassButton
  title="AI Summary"
  label="AI"
  onClick={() => playerAction("bugz-player-ai")}
>
  <span aria-hidden="true" className="text-xl leading-none">
    ✦
  </span>
</GlassButton>

<GlassButton
  title="Personal"
  label="PERSONAL"
  onClick={() => playerAction("bugz-player-personal")}
>
  <span aria-hidden="true" className="text-xl leading-none">
    ◉
  </span>
</GlassButton>

            <GlassButton title="Channel up" wide onClick={() => playerAction("bugz-player-next")}>
              <span className="bugz-btn-ch">CH</span>
              <IconChUp />
            </GlassButton>

            <GlassButton title="More" label="MORE" active={moreOpen} onClick={() => setMoreOpen((v) => !v)}>
              <IconMore />
            </GlassButton>

            <GlassButton
              title={playerExpanded ? "Exit fullscreen" : "Fullscreen"}
              active={playerExpanded}
              onClick={(e) => {
                e.stopPropagation();
                togglePlayerExpanded();
              }}
            >
              {playerExpanded ? <IconExitFullscreen /> : <IconFullscreen />}
            </GlassButton>

            {moreOpen && (
              <div
                className="bugz-menu bugz-glass bugz-pop"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="bugz-menu-head">CHANNEL INFO</div>
                <div className="bugz-menu-row">{channel.language ? `Language: ${channel.language}` : "Language: unavailable"}</div>
                <div className="bugz-menu-row">
                  {channel.genre || channel.category ? `Genre: ${channel.genre || channel.category}` : "Genre: unavailable"}
                </div>
                <div className="bugz-menu-id">ID {channel.id}</div>
              </div>
            )}
          </div>
        </div>

        {/* Thin glowing progress line (VOD only) */}
        {showProgress ? (
          <div
            className="bugz-progress-wrap bugz-fade"
            style={fadeStyle(showUI, 6)}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              type="range"
              aria-label="Seek"
              className="bugz-progress"
              min="0"
              max={duration}
              step="any"
              value={Math.min(progress, duration)}
              onChange={handleSeek}
              style={{ "--bugz-pct": `${progressPct}%` } as React.CSSProperties}
            />
          </div>
        ) : null}
      </div>
    );
  };

  /** Iframes swallow mouse/touch events. While the UI is hidden, a transparent layer sits over the
   *  YouTube iframe so a mouse move or tap brings the controls back; it's removed while the UI is showing
   *  so the YouTube player stays clickable. */
  const renderIframeCatcher = () =>
    showUI ? null : (
      <div
        className="bugz-catcher"
        aria-hidden="true"
        onMouseMove={revealUI}
        onPointerMove={revealUI}
        onPointerDown={revealUI}
        onClick={revealUI}
      />
    );

  const renderExpandedButton = (opts?: { nowOverride?: NowOverride; allowProgress?: boolean; fullFrame?: boolean }) =>
    renderPlayerOverlay(opts);

  const getRotationOverride = (item: RotationItem): NowOverride => {
    const next = rotationItems.length > 1 ? rotationItems[(rotationIndex + 1) % rotationItems.length] : null;
    return { title: item.title, subtitle: item.source, nextTitle: next?.title };
  };

  const renderInfoCard = ({
    title,
    description,
    buttonText,
    href,
    details,
    nowOverride,
  }: {
    title: string;
    description: string;
    buttonText?: string;
    href?: string;
    details?: string[];
    nowOverride?: NowOverride;
  }) => (
    <div
      ref={setContainerRef}
      className="bugz-shell bugz-card-shell"
      style={{
        background: "radial-gradient(ellipse at 50% 30%, rgba(14,40,64,0.9), rgba(2,6,14,1) 70%)",
        ...playerShellStyle,
      }}
      onMouseMove={revealUI}
      onMouseEnter={revealUI}
      onPointerMove={revealUI}
      onPointerDown={revealUI}
      onTouchStart={revealUI}
      onClick={revealUI}
    >
      {renderStyles()}
      <div className="bugz-card bugz-glass bugz-iridescent">
        <div className="bugz-card-kicker">
          Bug Eyez View
        </div>
        <h2 className="bugz-card-title">{title}</h2>
        <p className="bugz-card-text">{description}</p>

        {details && details.length > 0 && (
          <ul className="bugz-card-list">
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
            className="bugz-btn bugz-card-link"
          >
            {buttonText || "Open official source"}
          </a>
        )}
      </div>
      {renderFeedback()}
      {renderExpandedButton({ nowOverride, fullFrame: true })}
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
          ref={setContainerRef}
          className="bugz-shell"
          style={playerShellStyle}
          onMouseMove={revealUI}
          onMouseEnter={revealUI}
          onPointerMove={revealUI}
          onPointerDown={revealUI}
          onTouchStart={revealUI}
          onClick={revealUI}
        >
          {renderStyles()}
          <iframe
            ref={rotationYoutubeIframeRef}
            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&mute=1&playsinline=1&rel=0&enablejsapi=1`}
            className="bugz-media"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
            referrerPolicy="strict-origin-when-cross-origin"
            onLoad={() => handleYouTubeLoad(rotationYoutubeIframeRef, "yt-rotation-load")}
          />
          {renderIframeCatcher()}
          {renderFeedback()}
          {/* Rotation item title/source now feeds the lower-third NOW slot (no more overlapping top-left box). */}
          {renderExpandedButton({ nowOverride: getRotationOverride(currentRotationItem) })}
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
      nowOverride: getRotationOverride(currentRotationItem),
    });
  }

  const youtubeEmbedUrl = channel ? getYouTubeEmbedUrl(channel) : "";

  if (channel && (channelKind === "youtube" || youtubeEmbedUrl)) {
    return (
      <div
        ref={setContainerRef}
        className="bugz-shell"
        onMouseMove={revealUI}
        onMouseEnter={revealUI}
        onPointerMove={revealUI}
        onPointerDown={revealUI}
        onTouchStart={revealUI}
        onClick={revealUI}
        style={playerShellStyle}
      >
        {renderStyles()}
        <iframe
          ref={youtubeIframeRef}
          src={youtubeEmbedUrl}
          className="bugz-media"
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => handleYouTubeLoad(youtubeIframeRef, "yt-load")}
        />
        {renderIframeCatcher()}
        {renderFeedback()}
        {renderExpandedButton()}
      </div>
    );
  }

  return (
    <div
      id="video-container"
      ref={setContainerRef}
      className="bugz-shell"
      style={playerShellStyle}
      onMouseMove={revealUI}
      onMouseEnter={revealUI}
      onPointerMove={revealUI}
      onPointerDown={revealUI}
      onTouchStart={revealUI}
      onClick={revealUI}
    >
      {renderStyles()}

      {channel ? (
        <video
          ref={videoRef}
          className="bugz-media"
          playsInline
          muted={isMuted}
          // Hides the browser's own hover PiP button (Edge/Chrome) that sat over our controls.
          disablePictureInPicture
          controlsList="nodownload noplaybackrate noremoteplayback"
          onLoadedMetadata={syncMediaAspect}
          onResize={syncMediaAspect}
        />
      ) : (
        <div className="bugz-empty">
          Select a channel to start playback
        </div>
      )}

      {brightnessLevel < 0.99 && (
        <div
          className="bugz-dim"
          style={{ opacity: 1 - brightnessLevel }}
        />
      )}

      {renderFeedback()}

      {renderPlayerOverlay({ allowProgress: true })}
    </div>
  );
}
