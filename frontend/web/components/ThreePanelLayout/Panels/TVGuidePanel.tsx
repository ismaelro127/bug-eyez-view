"use client";

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Channel, EPGEntry, ChannelHealth } from "../../../../types";
import type { BugEyezSettings } from "../../Settings/useSettingsData";
import { useToast } from "../../ui/ToastProvider";

/* ------------------------------------------------------------------
 * Bug Eyez View - TV Guide
 *
 * Mobile layout (viewport < 1100px or coarse pointer, same as index.tsx):
 *   "Now & Next" glass card list (two columns when the guide is >= 700px wide).
 * Desktop layout: the timeline grid (same behavior as before).
 *
 * All styling lives in the embedded <style> below (prefix "bugzg-") or
 * inline styles, so the guide does not depend on Tailwind generating
 * any class. Everything scrolls inside the guide's own container, and
 * the root uses `isolation: isolate` so no z-index inside the guide can
 * rise above the player or the app menu.
 * ------------------------------------------------------------------ */

interface Props {
  channels: Channel[];
  allEPG?: Record<string, EPGEntry[]>;
  favoriteIDs?: string[];
  onToggleFavorite?: (channelId: string) => void;
  nowTs: number;
  appSettings?: BugEyezSettings;
  timelineRef?: React.RefObject<HTMLDivElement | null>;
  scrollRefExternal?: React.RefObject<HTMLDivElement | null>;
  epgScrollRef?: React.RefObject<HTMLDivElement | null>;
  onSelectChannel?: (ch: Channel) => void;
  onSelectProgram?: (program: EPGEntry, channel: Channel) => void;

  selectedChannel?: Channel | null;
  hidden?: boolean;

  unlockedChannelIds?: string[];
  credits?: number;
  onUnlockChannel: (channelId: string) => void;

  channelHealth?: Record<string, ChannelHealth>;
}

type SortPolicy = "stableFirst" | "badFirst";
const SORT_POLICY: SortPolicy = "stableFirst";

// Same switch as index.tsx (isMobile = innerWidth < 1100 || pointer: coarse),
// so the card list shows exactly when the app renders its mobile layout.
const LIST_BREAKPOINT = 1100;
// List container width at which cards go two-per-row (e.g. ~810px laptop window).
const TWO_COL_MIN = 700;
const PX_PER_SLOT = 150;
const MINUTES_PER_SLOT = 30;
const SLOT_COUNT = 12;
const TIMELINE_WINDOW_MIN = SLOT_COUNT * MINUTES_PER_SLOT;
const PX_PER_MIN = PX_PER_SLOT / MINUTES_PER_SLOT;
const TIMELINE_WIDTH = SLOT_COUNT * PX_PER_SLOT;
const YT_HEADER_HEIGHT = 34;
const PLAYLIST_KEY = "bugz_channel_playlist_v1";

const useIsoLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type Prog = EPGEntry & { _startTs: number; _endTs: number };

function healthRank(h?: ChannelHealth) {
  if (!h) return 0;
  if ((h as any).is_disabled) return 3;
  if ((h as any).tier === "unstable") return 2;
  if ((h as any).tier === "medium") return 1;
  return 0;
}

function cleanLiveTitle(title?: string) {
  if (!title) return "";
  return String(title)
    .replace(/^🔴?\s*LIVE[:\-\s]*/i, "")
    .replace(/^LIVE\s*\|\s*/i, "")
    .replace(/^LIVE\s+/i, "")
    .trim();
}

function parsePrograms(list?: EPGEntry[]): Prog[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((p: any) => ({
      ...p,
      _startTs: p?.start_utc ? new Date(p.start_utc).getTime() : NaN,
      _endTs: p?.stop_utc ? new Date(p.stop_utc).getTime() : NaN,
    }))
    .filter(
      (p) =>
        !Number.isNaN(p._startTs) &&
        !Number.isNaN(p._endTs) &&
        p._endTs > p._startTs
    )
    .sort((a, b) => a._startTs - b._startTs);
}

function fmtTime(ts: number) {
  return new Date(ts).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

function isPrimeHour(ts: number) {
  const h = new Date(ts).getHours();
  return h >= 18 && h <= 23;
}

function channelNumberOf(ch: any): string | null {
  const n =
    ch?.number ?? ch?.channelNumber ?? ch?.chno ?? ch?.["tvg-chno"] ?? null;
  if (n === null || n === undefined || String(n).trim() === "") return null;
  return String(n).trim();
}

function categoryOf(ch: any): string {
  return String(ch?.category || ch?.genre || "").trim();
}

const STYLE = `
.bugzg-root{position:relative;isolation:isolate;display:flex;flex-direction:column;width:100%;height:100%;min-height:0;min-width:0;overflow:hidden;background:#000;color:#fff;font-family:inherit}
.bugzg-root *{box-sizing:border-box}
.bugzg-scroll{position:relative;flex:1 1 auto;min-height:0;min-width:0;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain}
/* ---------- pills ---------- */
.bugzg-pills{flex:0 0 auto;display:flex;gap:8px;overflow-x:auto;overflow-y:hidden;padding:10px 12px 6px;scrollbar-width:none;-ms-overflow-style:none;overscroll-behavior-x:contain}
.bugzg-pills::-webkit-scrollbar{display:none}
.bugzg-pill{flex:0 0 auto;white-space:nowrap;border-radius:12px;padding:7px 14px;font-size:13px;font-weight:700;line-height:1.1;color:rgba(226,232,240,.85);background:rgba(15,23,42,.55);border:1px solid rgba(148,163,184,.22);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);cursor:pointer}
.bugzg-pill[data-active="true"]{color:#e0fbff;background:rgba(34,211,238,.16);border-color:rgba(34,211,238,.75);box-shadow:0 0 14px rgba(34,211,238,.35),inset 0 0 10px rgba(34,211,238,.15)}
.bugzg-heading{flex:0 0 auto;display:flex;align-items:center;gap:8px;padding:4px 14px 6px;font-size:15px;font-weight:800;color:#f1f5f9}
.bugzg-heading small{font-size:11px;font-weight:600;color:rgba(148,163,184,.85)}
.bugzg-eq{display:inline-flex;gap:2px;align-items:center;height:14px}
.bugzg-eq i{display:block;width:2px;border-radius:1px;background:#22d3ee;box-shadow:0 0 6px rgba(34,211,238,.8)}
/* ---------- list ---------- */
.bugzg-list{display:flex;flex-direction:column;gap:8px;padding:2px 10px 16px}
.bugzg-list[data-cols="2"]{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));align-items:start;gap:10px;padding:2px 14px 16px;max-width:1040px;margin:0 auto;width:100%;box-sizing:border-box}
.bugzg-list[data-cols="2"] > .bugzg-section,.bugzg-list[data-cols="2"] > .bugzg-empty{grid-column:1 / -1}
.bugzg-card{position:relative;display:flex;align-items:stretch;gap:12px;min-height:96px;padding:10px 10px 10px 12px;border-radius:14px;background:linear-gradient(180deg,rgba(15,23,42,.72),rgba(2,6,23,.72));border:1px solid rgba(148,163,184,.18);box-shadow:inset 0 1px 0 rgba(255,255,255,.04);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:pointer;content-visibility:auto;contain-intrinsic-size:auto 96px;-webkit-tap-highlight-color:transparent;user-select:none;-webkit-user-select:none}
.bugzg-card:active{transform:scale(.995)}
.bugzg-card[data-selected="true"]{border-color:var(--bug-accent,#22d3ee);background:linear-gradient(180deg,rgba(8,47,73,.72),rgba(2,6,23,.78));box-shadow:0 0 18px var(--bug-accent-border,rgba(34,211,238,.45)),inset 0 0 16px rgba(34,211,238,.12)}
.bugzg-card[data-disabled="true"]{opacity:.45;cursor:not-allowed}
.bugzg-logo{flex:0 0 auto;width:52px;height:52px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;background:rgba(0,0,0,.55);border:1px solid rgba(148,163,184,.3);align-self:center}
.bugzg-card[data-selected="true"] .bugzg-logo{border-color:var(--bug-accent,#22d3ee);box-shadow:0 0 10px var(--bug-accent-border,rgba(34,211,238,.5))}
.bugzg-logo img{width:76%;height:76%;object-fit:contain}
.bugzg-logo b{font-size:17px;font-weight:900;line-height:1;color:#fff}
.bugzg-logo span{font-size:8px;font-weight:800;letter-spacing:.08em;color:#22d3ee;margin-top:2px}
.bugzg-body{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;gap:3px;justify-content:center}
.bugzg-name{display:flex;align-items:center;gap:6px;min-width:0;font-size:15px;font-weight:700;color:#f8fafc}
.bugzg-name > span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bugzg-chnum{flex:0 0 auto;font-size:11px;font-weight:800;color:rgba(148,163,184,.95)}
.bugzg-line{display:flex;align-items:baseline;gap:6px;min-width:0;font-size:12.5px;color:rgba(203,213,225,.9)}
.bugzg-line > .bugzg-k{flex:0 0 auto;font-size:10.5px;font-weight:800;letter-spacing:.06em;color:rgba(148,163,184,.9)}
.bugzg-line > .bugzg-t{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.bugzg-card[data-selected="true"] .bugzg-now .bugzg-t{color:#67e8f9}
.bugzg-line > .bugzg-time{flex:0 0 auto;font-size:11px;color:rgba(148,163,184,.85)}
.bugzg-progress{height:4px;border-radius:4px;background:rgba(148,163,184,.18);overflow:hidden;margin:2px 0 1px;max-width:280px}
.bugzg-progress > i{display:block;height:100%;border-radius:4px;background:linear-gradient(90deg,#06b6d4,#67e8f9);box-shadow:0 0 8px rgba(34,211,238,.8)}
.bugzg-tag{flex:0 0 auto;font-size:9.5px;font-weight:900;letter-spacing:.08em;padding:2px 6px;border-radius:5px;line-height:1.2}
.bugzg-tag-prime{background:#b91c1c;color:#fff;box-shadow:0 0 8px rgba(239,68,68,.55)}
.bugzg-tag-live{background:rgba(239,68,68,.15);color:#fca5a5;border:1px solid rgba(239,68,68,.5)}
.bugzg-tag-warn{background:rgba(234,179,8,.14);color:#fde68a;border:1px solid rgba(234,179,8,.4)}
.bugzg-muted{font-size:12px;font-style:italic;color:rgba(148,163,184,.75)}
.bugzg-lockrow{display:flex;align-items:center;gap:8px;margin-top:3px;font-size:12px;color:#fde68a}
.bugzg-unlock{border:1px solid #fde68a;background:#facc15;color:#000;font-weight:900;font-size:11px;border-radius:8px;padding:5px 10px;cursor:pointer;box-shadow:0 0 12px rgba(250,204,21,.4);white-space:nowrap}
.bugzg-unlock[disabled]{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.15);color:#9ca3af;box-shadow:none;cursor:not-allowed}
.bugzg-side{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}
.bugzg-iconbtn{width:36px;height:36px;display:flex;align-items:center;justify-content:center;border-radius:10px;border:1px solid transparent;background:transparent;color:rgba(148,163,184,.85);cursor:pointer;padding:0}
.bugzg-iconbtn svg{width:22px;height:22px}
.bugzg-iconbtn[data-on="true"]{color:#facc15;filter:drop-shadow(0 0 6px rgba(250,204,21,.6))}
.bugzg-card[data-selected="true"] .bugzg-iconbtn[data-fav]{color:#22d3ee}
.bugzg-card[data-selected="true"] .bugzg-iconbtn[data-on="true"]{color:#facc15}
.bugzg-info{width:28px;height:28px;font-size:13px;font-weight:900;font-style:italic;font-family:Georgia,serif;border-color:rgba(148,163,184,.25)}
.bugzg-section{padding:10px 4px 2px;font-size:11px;font-weight:900;letter-spacing:.1em;text-transform:uppercase;color:#f87171}
.bugzg-empty{padding:28px 16px;text-align:center;color:rgba(148,163,184,.85);font-size:13px}
/* ---------- grid ---------- */
.bugzg-grid{position:relative}
.bugzg-ghead{display:flex;position:sticky;top:0;z-index:3;background:#000;border-bottom:1px solid rgba(255,255,255,.15);box-shadow:0 6px 12px rgba(0,0,0,.65)}
.bugzg-ghead-ch{flex:0 0 auto;position:sticky;left:0;z-index:4;display:flex;align-items:center;padding:8px;background:#000;border-right:1px solid rgba(255,255,255,.1);box-shadow:8px 0 12px rgba(0,0,0,.65);font-size:11px;font-weight:800;letter-spacing:.16em;text-transform:uppercase;color:rgba(103,232,249,.85)}
.bugzg-slot{flex:0 0 auto;text-align:center;font-size:12px;font-weight:600;color:#cffafe;padding:8px 0;border-left:1px solid rgba(255,255,255,.1)}
.bugzg-row{display:flex;align-items:stretch;border-bottom:1px solid rgba(255,255,255,.1)}
.bugzg-gch{flex:0 0 auto;position:sticky;left:0;z-index:2;display:flex;align-items:center;gap:8px;padding:0 8px;overflow:hidden;border-right:1px solid rgba(255,255,255,.1);background:rgba(0,0,0,.96);box-shadow:8px 0 12px rgba(0,0,0,.65);border-left:3px solid transparent;cursor:pointer;user-select:none;-webkit-user-select:none}
.bugzg-gch:hover{background:rgba(20,24,30,.98)}
.bugzg-gch[data-selected="true"]{border-left-color:var(--bug-accent,#22d3ee);background:rgba(0,0,0,.98);box-shadow:8px 0 12px rgba(0,0,0,.65),var(--bug-glow,0 0 14px rgba(34,211,238,.35))}
.bugzg-gch[data-disabled="true"]{cursor:not-allowed;opacity:.5}
.bugzg-glogo{flex:0 0 auto;border-radius:6px;background:rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;overflow:hidden}
.bugzg-glogo img{object-fit:contain}
.bugzg-gname{flex:1 1 0%;min-width:0;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;line-height:1.1}
.bugzg-gstar{flex:0 0 auto;color:#facc15;font-size:12px}
.bugzg-gunlock{flex:0 0 auto;border:2px solid #fde68a;background:#facc15;color:#000;border-radius:8px;height:28px;padding:0 8px;font-size:11px;font-weight:900;white-space:nowrap;cursor:pointer;box-shadow:0 0 12px rgba(250,204,21,.4)}
.bugzg-gunlock[disabled]{border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.08);color:#9ca3af;box-shadow:none;cursor:not-allowed}
.bugzg-tl{position:relative;flex:0 0 auto;height:100%;overflow:hidden}
.bugzg-prog{position:absolute;display:flex;align-items:center;overflow:hidden;white-space:nowrap;font-weight:800;border:1px solid rgba(255,255,255,.1);background:linear-gradient(135deg,rgba(92,45,14,.92),rgba(124,45,18,.88));color:#ffedd5;box-shadow:inset 0 0 14px rgba(255,255,255,.04);cursor:pointer}
.bugzg-prog > span{min-width:0;width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.bugzg-prog[data-locked="true"]{background:linear-gradient(135deg,rgba(63,45,20,.72),rgba(0,0,0,.62));color:rgba(255,255,255,.58);box-shadow:none;cursor:not-allowed}
.bugzg-prog[data-selected="true"]{border-color:rgba(0,229,255,.55)}
.bugzg-nodata{position:absolute;inset:0;display:flex;align-items:center;padding-left:14px;font-style:italic;color:rgba(255,255,255,.45);white-space:nowrap}
.bugzg-now-line{position:absolute;top:0;bottom:0;width:2px;z-index:1;pointer-events:none;background:var(--bug-accent,#22d3ee);box-shadow:var(--bug-glow,0 0 10px rgba(34,211,238,.6))}
.bugzg-ythead{display:flex;align-items:center;height:${YT_HEADER_HEIGHT}px;background:rgba(255,255,255,.08);border-bottom:1px solid rgba(255,255,255,.12);color:#f87171;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
.bugzg-ythead > span{position:sticky;left:12px}
/* ---------- long-press menu ---------- */
.bugzg-menu-bg{position:fixed;inset:0;z-index:2147483640;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.65);padding:16px}
.bugzg-menu{width:100%;max-width:360px;border-radius:16px;border:1px solid rgba(34,211,238,.35);background:#090d12;padding:16px;box-shadow:0 25px 60px rgba(0,0,0,.8)}
.bugzg-menu h4{margin:0 0 12px;font-size:14px;font-weight:900;color:#fff}
.bugzg-menu button{display:block;width:100%;margin-top:8px;text-align:left;border-radius:12px;border:1px solid rgba(255,255,255,.1);background:rgba(255,255,255,.05);padding:12px 16px;font-size:14px;font-weight:700;color:#fff;cursor:pointer}
`;

const StarIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <svg viewBox="0 0 24 24" fill={filled ? "currentColor" : "none"} stroke="currentColor" strokeWidth={1.6} strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3.2l2.7 5.6 6.1.8-4.5 4.2 1.1 6.1L12 17l-5.4 2.9 1.1-6.1-4.5-4.2 6.1-.8z" />
  </svg>
);

const LockIcon = () => (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
    <path d="M7 10V8a5 5 0 0110 0v2h1a1 1 0 011 1v9a1 1 0 01-1 1H6a1 1 0 01-1-1v-9a1 1 0 011-1h1zm2 0h6V8a3 3 0 00-6 0v2z" />
  </svg>
);

const TVGuidePanel: React.FC<Props> = ({
  channels,
  allEPG = {},
  selectedChannel,
  hidden,
  nowTs,
  timelineRef,
  appSettings,
  scrollRefExternal,
  epgScrollRef,
  favoriteIDs = [],
  onToggleFavorite,
  onSelectChannel,
  onSelectProgram,
  unlockedChannelIds = [],
  credits = 0,
  onUnlockChannel,
  channelHealth = {},
}) => {
  // NOTE: every hook runs before the `hidden` early return (rules of hooks).
  const { showToast } = useToast();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [rootWidth, setRootWidth] = useState(0);
  const [winWidth, setWinWidth] = useState(0);
  const [isCoarse, setIsCoarse] = useState(false);
  const [viewportH, setViewportH] = useState(900);
  const [scrollTop, setScrollTop] = useState(0);
  const [pill, setPill] = useState<string>("All");
  const [filterMode, setFilterMode] = useState<"genre" | "language">("genre");
  const [channelMenu, setChannelMenu] = useState<Channel | null>(null);
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggeredRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);

  // Measure our own container (grid column width + virtual viewport) and the
  // window width (list vs grid).
  useIsoLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      setWinWidth(window.innerWidth);
      setIsCoarse(!!window.matchMedia?.("(pointer: coarse)").matches);
      setRootWidth(el.clientWidth);
      setViewportH(el.clientHeight || 900);
    };
    measure();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure);
      window.addEventListener("orientationchange", measure);
      return () => {
        window.removeEventListener("resize", measure);
        window.removeEventListener("orientationchange", measure);
      };
    }
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, [hidden]);

  useEffect(
    () => () => {
      if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
      if (scrollRafRef.current !== null) cancelAnimationFrame(scrollRafRef.current);
    },
    []
  );

  // Mobile layout (viewport < 1100px or a touch/coarse pointer, mirroring
  // index.tsx) gets the Now & Next list; the desktop layout keeps the grid.
  const isList = winWidth > 0 && (winWidth < LIST_BREAKPOINT || isCoarse);
  const listCols = rootWidth >= TWO_COL_MIN ? 2 : 1;

  const guideDensity =
    appSettings?.guideDensity ??
    (appSettings?.compactGuideMode ? "compact" : "comfortable");
  const ROW_HEIGHT = guideDensity === "ultra" ? 42 : guideDensity === "compact" ? 54 : 64;
  const LOGO_SIZE = guideDensity === "ultra" ? 24 : guideDensity === "compact" ? 28 : 34;
  const LOGO_IMG_SIZE = guideDensity === "ultra" ? 22 : guideDensity === "compact" ? 25 : 31;
  const CHANNEL_FONT_SIZE = guideDensity === "ultra" ? 11 : guideDensity === "compact" ? 12 : 13;
  const PROGRAM_FONT_SIZE = CHANNEL_FONT_SIZE;
  const PROGRAM_INSET = guideDensity === "ultra" ? 4 : guideDensity === "compact" ? 5 : 6;

  // Channel column shrinks with the panel so the timeline is always visible
  // (it used to be a fixed 320px, leaving ~80px of timeline in a 400px panel).
  const CHANNEL_COL_WIDTH = Math.round(
    Math.min(320, Math.max(150, (rootWidth || 1200) * 0.3))
  );
  const TOTAL_WIDTH = CHANNEL_COL_WIDTH + TIMELINE_WIDTH;

  // Minute bucket so per-channel work only recomputes once a minute.
  const nowMinute = Math.floor(nowTs / 60000);
  const timelineStartTs = useMemo(() => {
    const d = new Date(nowMinute * 60000);
    d.setMinutes(Math.floor(d.getMinutes() / 30) * 30, 0, 0);
    return d.getTime();
  }, [nowMinute]);
  const timelineEndTs = timelineStartTs + TIMELINE_WINDOW_MIN * 60000;

  const unlockedSet = useMemo(() => new Set(unlockedChannelIds), [unlockedChannelIds]);
  const favSet = useMemo(() => new Set(favoriteIDs), [favoriteIDs]);

  const sortedChannels = useMemo(() => {
    const sortGroup = (list: Channel[]) =>
      [...list].sort((a, b) => {
        const ha = channelHealth[a.id];
        const hb = channelHealth[b.id];
        const primary =
          SORT_POLICY === "stableFirst"
            ? healthRank(ha) - healthRank(hb)
            : healthRank(hb) - healthRank(ha);
        if (primary !== 0) return primary;
        const sa = (ha as any)?.health_score ?? -1;
        const sb = (hb as any)?.health_score ?? -1;
        if (sa !== sb) return sb - sa;
        return (a.name || "").localeCompare(b.name || "");
      });

    const filtered = channels.filter((ch) => {
      const health: any = channelHealth[ch.id];
      if (appSettings?.hideUnstableChannels) {
        if (health?.is_disabled || health?.suppressed || health?.tier === "unstable") return false;
      }
      if (appSettings?.showLockedYoutubeChannels === false) {
        if (ch.delivery === "youtube" && ch.locked === true) return unlockedSet.has(ch.id);
      }
      return true;
    });

    return [
      ...sortGroup(filtered.filter((ch) => ch.delivery !== "youtube")),
      ...sortGroup(filtered.filter((ch) => ch.delivery === "youtube")),
    ];
  }, [channels, channelHealth, appSettings, unlockedSet]);

  // Parsed + sorted programs per channel, cached by allEPG identity.
  const parsedEPG = useMemo(() => {
    const out: Record<string, Prog[]> = {};
    for (const ch of channels) out[ch.id] = parsePrograms(allEPG?.[ch.id]);
    return out;
  }, [channels, allEPG]);

  /* ---------------- pills (list mode) ---------------- */
const pillOptions = useMemo(() => {
  if (filterMode === "language") {
    const languages = Array.from(
      new Set(
        sortedChannels
          .map((ch) => String(ch.language || "").trim())
          .filter(Boolean)
      )
    ).sort((a, b) => a.localeCompare(b));

    return ["Genres", "All", ...languages];
  }

  const preferredGenres = [
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
  ];

  const opts = ["All"];

  if (favoriteIDs.length > 0) {
    opts.push("Favorites");
  }

  return [...opts, ...preferredGenres, "Languages"];
}, [favoriteIDs.length, filterMode, sortedChannels]);

  useEffect(() => {
    if (!pillOptions.includes(pill)) setPill("All");
  }, [pillOptions, pill]);

  const listChannels = useMemo(() => {
  if (pill === "All") return sortedChannels;

  if (filterMode === "language") {
    return sortedChannels.filter(
      (ch) =>
        String(ch.language || "").trim().toLowerCase() ===
        pill.trim().toLowerCase()
    );
  }

  if (pill === "Favorites") {
    return sortedChannels.filter((ch) => favSet.has(ch.id));
  }

  return sortedChannels.filter((ch) => categoryOf(ch) === pill);
}, [sortedChannels, pill, favSet, filterMode]);

  /* ---------------- shared helpers ---------------- */
  const lockInfo = useCallback(
    (ch: Channel) => {
      const isYoutubePack =
        ch.delivery === "youtube" ||
        (ch as any).type === "youtube" ||
        ch.category === "YouTube Live";
      const cost = isYoutubePack ? 100 : ch.unlockCost ?? 25;
      const isLocked = ch.locked === true && !unlockedSet.has(ch.id);
      const isOfflineYoutube =
        ch.delivery === "youtube" &&
        (ch.offline === true ||
          ch.isLive === false ||
          ch.unlockDisabled === true ||
          ch.status === "offline");
      return { isYoutubePack, cost, isLocked, isOfflineYoutube };
    },
    [unlockedSet]
  );

  const beginLongPress = (ch: Channel) => {
    longPressTriggeredRef.current = false;
    if (longPressTimerRef.current) clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = setTimeout(() => {
      longPressTriggeredRef.current = true;
      setChannelMenu(ch);
    }, 550);
  };
  const cancelLongPress = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };
  const consumeLongPress = () => {
    if (longPressTriggeredRef.current) {
      longPressTriggeredRef.current = false;
      return true;
    }
    return false;
  };

  const addChannelToPlaylist = (ch: Channel) => {
    try {
      const current = JSON.parse(localStorage.getItem(PLAYLIST_KEY) || "[]") as string[];
      const next = current.includes(ch.id) ? current : [...current, ch.id];
      localStorage.setItem(PLAYLIST_KEY, JSON.stringify(next));
      showToast(`${ch.name} added to playlist.`, "success");
    } catch {
      showToast("Could not update playlist.", "error");
    }
    setChannelMenu(null);
  };

  const requestUnlock = (ch: Channel) => {
    const { isOfflineYoutube } = lockInfo(ch);
    if (isOfflineYoutube) {
      showToast("This YouTube live channel is currently offline.", "error");
      return;
    }
    onUnlockChannel(ch.id);
  };

  const setScrollNode = (node: HTMLDivElement | null) => {
    scrollRef.current = node;
    if (scrollRefExternal) (scrollRefExternal as any).current = node;
    if (epgScrollRef) (epgScrollRef as any).current = node;
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (scrollRafRef.current !== null) return;
    scrollRafRef.current = requestAnimationFrame(() => {
      scrollRafRef.current = null;
      setScrollTop(el.scrollTop);
      if (timelineRef?.current) timelineRef.current.scrollLeft = el.scrollLeft;
    });
  };

  if (hidden) return null;

  const menu = channelMenu && (
    <div className="bugzg-menu-bg" onClick={() => setChannelMenu(null)}>
      <div className="bugzg-menu" onClick={(e) => e.stopPropagation()}>
        <h4>{channelMenu.name}</h4>
        <button
          type="button"
          onClick={() => {
            onToggleFavorite?.(channelMenu.id);
            setChannelMenu(null);
          }}
        >
          {favSet.has(channelMenu.id) ? "★ Remove from Favorites" : "☆ Add to Favorites"}
        </button>
        <button type="button" onClick={() => addChannelToPlaylist(channelMenu)}>
          ＋ Add to Playlist
        </button>
      </div>
    </div>
  );

  /* =================================================================
   * LIST MODE - Now & Next cards
   * ================================================================= */
  if (isList) {
    let lastWasYoutube = false;
    return (
      <div ref={rootRef} className="bugzg-root" data-mode="list">
        <style>{STYLE}</style>

        {pillOptions.length > 1 && (
          <div className="bugzg-pills" role="tablist" aria-label="Guide filter">
            {pillOptions.map((p) => (
              <button
                key={p}
                type="button"
                role="tab"
                aria-selected={pill === p}
                data-active={pill === p}
                className="bugzg-pill"
                onClick={() => {
  if (p === "Languages") {
    setFilterMode("language");
    setPill("All");
  } else if (p === "Genres") {
    setFilterMode("genre");
    setPill("All");
  } else {
    setPill(p);
  }

  scrollRef.current?.scrollTo({ top: 0 });
}}
              >
                {p === "Favorites" ? "★ Favorites" : p}
              </button>
            ))}
          </div>
        )}

        <div className="bugzg-heading">
          Now &amp; Next
          <span className="bugzg-eq" aria-hidden="true">
            {[6, 11, 8, 13, 5, 9].map((h, i) => (
              <i key={i} style={{ height: h }} />
            ))}
          </span>
          <small style={{ marginLeft: "auto" }}>
            {listChannels.length} channels
            {credits > 0 ? ` · ${credits} credits` : ""}
          </small>
        </div>

        <div ref={setScrollNode} className="bugzg-scroll" onScroll={onScroll}>
          <div className="bugzg-list" data-cols={listCols}>
            {listChannels.length === 0 && (
              <div className="bugzg-empty">
                {pill === "Favorites"
                  ? "No favorites yet. Tap the star on a channel to add it."
                  : "No channels to show."}
              </div>
            )}

            {listChannels.map((ch) => {
              const progs = parsedEPG[ch.id] || [];
              const nowIdx = progs.findIndex((p) => p._startTs <= nowTs && p._endTs > nowTs);
              const nowProg = nowIdx >= 0 ? progs[nowIdx] : null;
              const nextProg =
                nowIdx >= 0
                  ? progs[nowIdx + 1] ?? null
                  : progs.find((p) => p._startTs > nowTs) ?? null;
              const pct = nowProg
                ? Math.min(100, Math.max(0, ((nowTs - nowProg._startTs) / (nowProg._endTs - nowProg._startTs)) * 100))
                : 0;
              const prime = nowProg ? isPrimeHour(nowProg._startTs) : isPrimeHour(nowTs);
              const health: any = channelHealth[ch.id];
              const isDisabled = !!health?.is_disabled;
              const isSelected = selectedChannel?.id === ch.id;
              const isFav = favSet.has(ch.id);
              const { cost, isLocked, isOfflineYoutube, isYoutubePack } = lockInfo(ch);
              const isYoutube = ch.delivery === "youtube";
              const showYtHeader = isYoutube && !lastWasYoutube && pill === "All";
              lastWasYoutube = isYoutube;
              const num = channelNumberOf(ch);

              return (
                <React.Fragment key={ch.id}>
                  {showYtHeader && <div className="bugzg-section">YouTube Channels</div>}
                  <div
                    className="bugzg-card"
                    role="button"
                    tabIndex={0}
                    aria-pressed={isSelected}
                    data-selected={isSelected}
                    data-disabled={isDisabled}
                    onPointerDown={() => beginLongPress(ch)}
                    onPointerUp={cancelLongPress}
                    onPointerCancel={cancelLongPress}
                    onPointerLeave={cancelLongPress}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      cancelLongPress();
                      setChannelMenu(ch);
                    }}
                    onClick={() => {
                      if (consumeLongPress()) return;
                      if (isDisabled || isLocked) return;
                      onSelectChannel?.(ch);
                    }}
                    onKeyDown={(e) => {
                      if ((e.key === "Enter" || e.key === " ") && !isDisabled && !isLocked) {
                        e.preventDefault();
                        onSelectChannel?.(ch);
                      }
                    }}
                  >
                    <div className="bugzg-logo">
                      {ch.logo ? (
                        <img src={ch.logo} alt="" loading="lazy" />
                      ) : num ? (
                        <>
                          <b>{num}</b>
                          {isSelected && <span>NOW</span>}
                        </>
                      ) : (
                        <b>{String(ch.name || "?").trim().charAt(0).toUpperCase()}</b>
                      )}
                    </div>

                    <div className="bugzg-body">
                      <div className="bugzg-name">
                        <span title={ch.name}>{ch.name}</span>
                        {num && ch.logo && <span className="bugzg-chnum">CH {num}</span>}
                        {prime && nowProg && !isLocked && (
                          <span className="bugzg-tag bugzg-tag-prime">PRIME TIME</span>
                        )}
                        {!nowProg && isYoutube && !isOfflineYoutube && !isLocked && (
                          <span className="bugzg-tag bugzg-tag-live">LIVE</span>
                        )}
                        {health?.tier === "unstable" && !isDisabled && (
                          <span className="bugzg-tag bugzg-tag-warn">UNSTABLE</span>
                        )}
                      </div>

                      {nowProg ? (
                        <>
                          <div className="bugzg-line bugzg-now">
                            <span className="bugzg-k">NOW</span>
                            <span className="bugzg-t" title={nowProg.title}>
                              {cleanLiveTitle(nowProg.title) || "Untitled"}
                            </span>
                            <span className="bugzg-time">
                              {fmtTime(nowProg._startTs)}–{fmtTime(nowProg._endTs)}
                            </span>
                          </div>
                          {!isLocked && (
                            <div
                              className="bugzg-progress"
                              role="progressbar"
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={Math.round(pct)}
                            >
                              <i style={{ width: `${pct}%` }} />
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="bugzg-muted">
                          {isOfflineYoutube
                            ? "YouTube live is offline"
                            : isYoutube
                            ? "YouTube live channel"
                            : "No guide data available"}
                        </div>
                      )}

                      {nextProg && !isLocked && (
                        <div className="bugzg-line">
                          <span className="bugzg-k">NEXT</span>
                          <span className="bugzg-time">{fmtTime(nextProg._startTs)}</span>
                          <span className="bugzg-t" title={nextProg.title}>
                            {cleanLiveTitle(nextProg.title) || "Untitled"}
                          </span>
                        </div>
                      )}

                      {isLocked && (
                        <div className="bugzg-lockrow">
                          <LockIcon />
                          <span>
                            {isYoutubePack ? `YouTube pack · ${cost} credits` : `${cost} credits`}
                          </span>
                          <button
                            type="button"
                            className="bugzg-unlock"
                            disabled={isOfflineYoutube}
                            onPointerDown={(e) => e.stopPropagation()}
                            onClick={(e) => {
                              e.stopPropagation();
                              requestUnlock(ch);
                            }}
                          >
                            {isOfflineYoutube ? "Offline" : "Unlock"}
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="bugzg-side">
                      <button
                        type="button"
                        className="bugzg-iconbtn"
                        data-fav
                        data-on={isFav}
                        aria-label={isFav ? `Remove ${ch.name} from favorites` : `Add ${ch.name} to favorites`}
                        aria-pressed={isFav}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite?.(ch.id);
                        }}
                      >
                        <StarIcon filled={isFav} />
                      </button>
                      {nowProg && !isLocked && onSelectProgram && (
                        <button
                          type="button"
                          className="bugzg-iconbtn bugzg-info"
                          aria-label={`Details for ${nowProg.title || "this program"}`}
                          title="Program details"
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={(e) => {
                            e.stopPropagation();
                            const { _startTs, _endTs, ...program } = nowProg as any;
                            onSelectProgram(program as EPGEntry, ch);
                          }}
                        >
                          i
                        </button>
                      )}
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        {menu}
      </div>
    );
  }

  /* =================================================================
   * GRID MODE - timeline (desktop / wide panels)
   * ================================================================= */

  // Flat row model so virtualization accounts for the YouTube header row.
  type RowItem = { kind: "yt"; top: number; h: number } | { kind: "ch"; ch: Channel; top: number; h: number };
  const rows: RowItem[] = [];
  {
    let top = 0;
    let prevYt = false;
    for (const ch of sortedChannels) {
      const isYt = ch.delivery === "youtube";
      if (isYt && !prevYt) {
        rows.push({ kind: "yt", top, h: YT_HEADER_HEIGHT });
        top += YT_HEADER_HEIGHT;
      }
      prevYt = isYt;
      rows.push({ kind: "ch", ch, top, h: ROW_HEIGHT });
      top += ROW_HEIGHT;
    }
  }
  const totalRowsHeight = rows.length ? rows[rows.length - 1].top + rows[rows.length - 1].h : 0;
  const overscanPx = ROW_HEIGHT * 8;
  const winTop = Math.max(0, scrollTop - overscanPx);
  const winBottom = scrollTop + viewportH + overscanPx;
  let first = 0;
  while (first < rows.length && rows[first].top + rows[first].h < winTop) first++;
  let last = first;
  while (last < rows.length && rows[last].top <= winBottom) last++;
  const visibleRows = rows.slice(first, last);
  const topSpacer = visibleRows.length ? visibleRows[0].top : 0;
  const bottomSpacer = Math.max(
    0,
    totalRowsHeight - (visibleRows.length ? visibleRows[visibleRows.length - 1].top + visibleRows[visibleRows.length - 1].h : 0)
  );

  const markerLeft = ((nowTs - timelineStartTs) / 60000) * PX_PER_MIN;
  const showMarker = markerLeft >= 0 && markerLeft <= TIMELINE_WIDTH;

  const layoutPrograms = (progs: Prog[]) => {
    const TINY_MERGE_MIN = 12;
    const inWindow = progs
      .filter((p) => p._endTs > timelineStartTs && p._startTs < timelineEndTs)
      .map((p) => ({ ...p }));
    const merged: Prog[] = [];
    let pendingTinyStart: number | null = null;
    for (const p of inWindow) {
      const isTiny = (p._endTs - p._startTs) / 60000 < TINY_MERGE_MIN;
      if (isTiny) {
        const prev = merged[merged.length - 1];
        if (prev) prev._endTs = Math.max(prev._endTs, p._endTs);
        else pendingTinyStart = p._startTs;
        continue;
      }
      if (pendingTinyStart !== null) {
        p._startTs = Math.min(p._startTs, pendingTinyStart);
        pendingTinyStart = null;
      }
      const prev = merged[merged.length - 1];
      if (prev && p._startTs < prev._endTs) {
        if (p._endTs <= prev._endTs) continue;
        p._startTs = prev._endTs;
      }
      merged.push(p);
    }
    const SNAP = 5;
    const MIN_VISUAL = 8;
    const out: { p: Prog; left: number; width: number }[] = [];
    merged.forEach((p, i) => {
      const rawStart = (Math.max(p._startTs, timelineStartTs) - timelineStartTs) / 60000;
      const rawEnd = (Math.min(p._endTs, timelineEndTs) - timelineStartTs) / 60000;
      let s = Math.max(0, Math.floor(rawStart / SNAP) * SNAP);
      let e = Math.min(TIMELINE_WINDOW_MIN, Math.ceil(rawEnd / SNAP) * SNAP);
      if (e - s < MIN_VISUAL) e = Math.min(TIMELINE_WINDOW_MIN, s + MIN_VISUAL);
      const next = merged[i + 1];
      if (next) {
        const ns = Math.floor(((next._startTs - timelineStartTs) / 60000) / SNAP) * SNAP;
        if (ns > s) e = Math.min(e, ns);
      }
      const width = (e - s) * PX_PER_MIN;
      if (width < 24) return;
      out.push({ p, left: s * PX_PER_MIN, width });
    });
    return out;
  };

  const narrowCol = CHANNEL_COL_WIDTH < 230;

  return (
    <div ref={rootRef} className="bugzg-root" data-mode="grid">
      <style>{STYLE}</style>
      <div ref={setScrollNode} className="bugzg-scroll" onScroll={onScroll}>
        <div className="bugzg-grid" style={{ width: TOTAL_WIDTH }}>
          {showMarker && (
            <div className="bugzg-now-line" style={{ left: CHANNEL_COL_WIDTH + markerLeft }} />
          )}

          <div className="bugzg-ghead" style={{ width: TOTAL_WIDTH }}>
            <div className="bugzg-ghead-ch" style={{ width: CHANNEL_COL_WIDTH }}>
              Channels
            </div>
            {Array.from({ length: SLOT_COUNT }).map((_, i) => (
              <div key={i} className="bugzg-slot" style={{ width: PX_PER_SLOT }}>
                {fmtTime(timelineStartTs + i * MINUTES_PER_SLOT * 60000)}
              </div>
            ))}
          </div>

          <div style={{ height: topSpacer }} />

          {visibleRows.map((row) => {
            if (row.kind === "yt") {
              return (
                <div key="__yt_header" className="bugzg-ythead" style={{ width: TOTAL_WIDTH }}>
                  <span>YouTube Channels</span>
                </div>
              );
            }
            const ch = row.ch;
            const health: any = channelHealth[ch.id];
            const isDisabled = !!health?.is_disabled;
            const isSelected = selectedChannel?.id === ch.id;
            const isFav = favSet.has(ch.id);
            const { cost, isLocked, isOfflineYoutube, isYoutubePack } = lockInfo(ch);
            const progs = parsedEPG[ch.id] || [];
            const blocks = layoutPrograms(progs);
            const rowBg = isSelected
              ? "var(--bug-accent-soft, rgba(34,211,238,0.12))"
              : isDisabled
              ? "rgba(31,41,55,0.4)"
              : isLocked
              ? "rgba(66,32,6,0.3)"
              : health?.tier === "unstable"
              ? "rgba(127,29,29,0.3)"
              : health?.tier === "medium"
              ? "rgba(113,63,18,0.2)"
              : "rgba(255,255,255,0.05)";

            return (
              <div
                key={ch.id}
                className="bugzg-row"
                style={{
                  height: ROW_HEIGHT,
                  width: TOTAL_WIDTH,
                  background: rowBg,
                  boxShadow: isSelected ? "inset 0 0 18px var(--bug-accent-border, rgba(34,211,238,0.4))" : undefined,
                  opacity: isDisabled ? 0.6 : 1,
                }}
              >
                <div
                  className="bugzg-gch"
                  data-selected={isSelected}
                  data-disabled={isDisabled}
                  style={{ width: CHANNEL_COL_WIDTH }}
                  onPointerDown={() => beginLongPress(ch)}
                  onPointerUp={cancelLongPress}
                  onPointerCancel={cancelLongPress}
                  onPointerLeave={cancelLongPress}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    cancelLongPress();
                    setChannelMenu(ch);
                  }}
                  onClick={() => {
                    if (consumeLongPress()) return;
                    if (isDisabled || isLocked) return;
                    onSelectChannel?.(ch);
                  }}
                >
                  <div className="bugzg-glogo" style={{ width: LOGO_SIZE, height: LOGO_SIZE }}>
                    {ch.logo ? (
                      <img src={ch.logo} alt="" loading="lazy" style={{ width: LOGO_IMG_SIZE, height: LOGO_IMG_SIZE }} />
                    ) : (
                      <span style={{ color: "#67e8f9", fontSize: 13 }}>📺</span>
                    )}
                  </div>
                  <div
                    className="bugzg-gname"
                    title={ch.name}
                    style={{ fontSize: CHANNEL_FONT_SIZE, color: isSelected ? "var(--bug-accent, #22d3ee)" : "#fff" }}
                  >
                    {ch.name}
                  </div>
                  {isFav && <span className="bugzg-gstar" aria-label="Favorite">★</span>}
                  {isLocked && (
                    <button
                      type="button"
                      className="bugzg-gunlock"
                      disabled={isOfflineYoutube}
                      title={isOfflineYoutube ? "This YouTube live channel is currently offline" : `Unlock ${ch.name} for ${cost} credits`}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        requestUnlock(ch);
                      }}
                    >
                      {isOfflineYoutube ? "Offline" : narrowCol ? `🔒 ${cost}` : `Unlock ${cost}`}
                    </button>
                  )}
                </div>

                <div className="bugzg-tl" style={{ width: TIMELINE_WIDTH }}>
                  {blocks.map(({ p, left, width }, i) => {
                    const tiny = width < 70;
                    const small = width < 115;
                    return (
                      <div
                        key={`${p._startTs}-${i}`}
                        className="bugzg-prog"
                        data-locked={isLocked}
                        data-selected={isSelected}
                        style={{
                          left,
                          width,
                          top: PROGRAM_INSET,
                          bottom: PROGRAM_INSET,
                          fontSize: PROGRAM_FONT_SIZE,
                          borderRadius: tiny ? 6 : 10,
                          padding: tiny ? 0 : small ? "0 7px" : "0 12px",
                        }}
                        title={
                          isLocked
                            ? isYoutubePack
                              ? `Locked YouTube Pack — unlock all for ${cost} credits`
                              : `Locked — unlock for ${cost} credits`
                            : `${p.title || ""} · ${fmtTime(p._startTs)}–${fmtTime(p._endTs)}`
                        }
                        onClick={() => {
                          if (isLocked || isDisabled) return;
                          const { _startTs, _endTs, ...program } = p as any;
                          onSelectProgram?.(program as EPGEntry, ch);
                        }}
                      >
                        <span style={{ textAlign: tiny ? "center" : "left" }}>
                          {isLocked ? (tiny ? "🔒" : `🔒 ${cost}`) : tiny ? "" : cleanLiveTitle(p.title)}
                        </span>
                      </div>
                    );
                  })}
                  {blocks.length === 0 && (
                    <div
                      className="bugzg-nodata"
                      style={{
                        fontSize: PROGRAM_FONT_SIZE,
                        color: isLocked ? "rgba(250,204,21,0.85)" : undefined,
                      }}
                    >
                      {isOfflineYoutube
                        ? "YouTube live is offline — cannot unlock right now"
                        : isLocked
                        ? `Locked YouTube Pack — unlock all YouTube channels for ${cost} credits`
                        : ch.delivery === "youtube"
                        ? "YouTube channel — no EPG schedule"
                        : "No guide data available"}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          <div style={{ height: bottomSpacer }} />
        </div>
      </div>
      {menu}
    </div>
  );
};

export default TVGuidePanel;
