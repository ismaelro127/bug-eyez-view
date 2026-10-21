import React, { useMemo, useRef } from "react";
import type { Channel, EPGEntry, ChannelHealth } from "../../../../types";
import type { BugEyezSettings } from "../../Settings/useSettingsData";
import { useToast } from "../../ui/ToastProvider";

type EPGEntryWithAI = EPGEntry & {
  isAISummary?: boolean;
  isFallback?: boolean;
};

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

/**
 * Sorting policy:
 * - "stableFirst": best channels at top (high -> medium -> unstable -> disabled)
 * - "badFirst": worst channels at top (disabled -> unstable -> medium -> high)
 */
type SortPolicy = "stableFirst" | "badFirst";

const SORT_POLICY: SortPolicy = "stableFirst";

const CHANNEL_COL_WIDTH = 320;
const PX_PER_SLOT = 150;
const MINUTES_PER_SLOT = 30;
const SLOT_COUNT = 12;

function healthRank(h?: ChannelHealth) {
  if (!h) return 0;
  if (h.is_disabled) return 3;
  if (h.tier === "unstable") return 2;
  if (h.tier === "medium") return 1;
  return 0;
}

function cleanLiveTitle(title?: string) {
  if (!title) return "";

  return title
    .replace(/^🔴?\s*LIVE[:\-\s]*/i, "")
    .replace(/^LIVE\s*\|\s*/i, "")
    .replace(/^LIVE\s+/i, "")
    .trim();
}

const TVGuidePanel: React.FC<Props> = ({
  channels,
  allEPG = {},
  selectedChannel,
  hidden,
  nowTs,
  timelineRef,
  appSettings,
  scrollRefExternal,
  favoriteIDs = [],
onToggleFavorite,
onSelectChannel,
  onSelectProgram,
  unlockedChannelIds = [],
  credits = 0,
  onUnlockChannel,
  channelHealth = {},
}) => {
  if (hidden) return null;

  const TIMELINE_WINDOW_MIN = SLOT_COUNT * MINUTES_PER_SLOT;
  const PX_PER_MIN = PX_PER_SLOT / MINUTES_PER_SLOT;
  const TIMELINE_WIDTH = SLOT_COUNT * PX_PER_SLOT;
  const TOTAL_WIDTH = CHANNEL_COL_WIDTH + TIMELINE_WIDTH;
const { showToast } = useToast();
  const guideDensity =
  appSettings?.guideDensity ??
  (appSettings?.compactGuideMode ? "compact" : "comfortable");

const ROW_HEIGHT =
  guideDensity === "ultra" ? 42 : guideDensity === "compact" ? 54 : 64;

const LOGO_SIZE =
  guideDensity === "ultra" ? 24 : guideDensity === "compact" ? 28 : 34;

const LOGO_IMG_SIZE =
  guideDensity === "ultra" ? 22 : guideDensity === "compact" ? 25 : 31;

const CHANNEL_FONT_SIZE =
  guideDensity === "ultra" ? 11 : guideDensity === "compact" ? 12 : 13;

const PROGRAM_FONT_SIZE =
  guideDensity === "ultra" ? 11 : guideDensity === "compact" ? 12 : 13;

const PROGRAM_TOP_BOTTOM =
  guideDensity === "ultra" ? "4px" : guideDensity === "compact" ? "5px" : "6px";

  const nowDate = new Date(nowTs);
  nowDate.setMinutes(Math.floor(nowDate.getMinutes() / 30) * 30);
  nowDate.setSeconds(0);
  nowDate.setMilliseconds(0);

  const timelineStartTs = nowDate.getTime();
  const timelineEndTs = timelineStartTs + TIMELINE_WINDOW_MIN * 60 * 1000;

  const scrollRef = useRef<HTMLDivElement | null>(null);

  const sortedChannels = useMemo(() => {
  const sortGroup = (list: Channel[]) => {
    return [...list].sort((a, b) => {
      const ha = channelHealth[a.id];
      const hb = channelHealth[b.id];

      const ra = healthRank(ha);
      const rb = healthRank(hb);

      const primary =
        SORT_POLICY === "stableFirst" ? ra - rb : rb - ra;

      if (primary !== 0) return primary;

      const sa = ha?.health_score ?? -1;
      const sb = hb?.health_score ?? -1;
      if (sa !== sb) return sb - sa;

      return (a.name || "").localeCompare(b.name || "");
    });
  };

  const settingsFilteredChannels = channels.filter((ch) => {
  const health = channelHealth[ch.id];

  if (appSettings?.hideUnstableChannels) {
    if (health?.is_disabled) return false;
    if (health?.suppressed) return false;
    if (health?.tier === "unstable") return false;
  }

  if (appSettings?.showLockedYoutubeChannels === false) {
    if (ch.delivery === "youtube" && ch.locked === true) {
      return unlockedChannelIds.includes(ch.id);
    }
  }

  return true;
});

const regularChannels = settingsFilteredChannels.filter(
  (ch) => ch.delivery !== "youtube"
);

const youtubeChannels = settingsFilteredChannels.filter(
  (ch) => ch.delivery === "youtube"
);

  return [
    ...sortGroup(regularChannels),
    ...sortGroup(youtubeChannels),
  ];
}, [channels, channelHealth, appSettings, unlockedChannelIds]);

  const [scrollTop, setScrollTop] = React.useState(0);

const OVERSCAN_ROWS = 8;
const VIEWPORT_HEIGHT = 900;

const startIndex = Math.max(
  0,
  Math.floor(scrollTop / ROW_HEIGHT) - OVERSCAN_ROWS
);

const visibleRowCount =
  Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + OVERSCAN_ROWS * 2;

const endIndex = Math.min(
  sortedChannels.length,
  startIndex + visibleRowCount
);

const visibleChannels = sortedChannels.slice(startIndex, endIndex);

const topSpacer = startIndex * ROW_HEIGHT;
const bottomSpacer =
  Math.max(0, (sortedChannels.length - endIndex) * ROW_HEIGHT);

  return (
    <div
      ref={(node) => {
        scrollRef.current = node;
        if (scrollRefExternal) scrollRefExternal.current = node;
      }}
      className="relative w-full h-full min-h-0 overflow-y-auto overflow-x-auto touch-pan-x bg-black text-white"
      onScroll={(e) => {
        const top = e.currentTarget.scrollTop;
        setScrollTop(top);

        if (!timelineRef?.current) return;

        const left = e.currentTarget.scrollLeft;

        requestAnimationFrame(() => {
          if (timelineRef.current) {
            timelineRef.current.scrollLeft = left;
          }
        });
      }}
    >
      {/* WRAPPER */}
      <div className="relative" style={{ minWidth: TOTAL_WIDTH }}>

        {/* CURRENT TIME MARKER */}
        {(() => {
          const markerLeft = ((nowTs - timelineStartTs) / 60000) * PX_PER_MIN;

          if (markerLeft < 0 || markerLeft > TIMELINE_WIDTH) return null;

          return (
            <div
  className="absolute top-0 bottom-0 w-[2px] z-50 pointer-events-none"
  style={{
    left: `${CHANNEL_COL_WIDTH + markerLeft}px`,    background: "var(--bug-accent)",
    boxShadow: "var(--bug-glow)",
  }}
/>
          );
        })()}

{/* TIMELINE HEADER - STICKY TOP */}
<div
  className="flex border-b border-white/15"
  style={{
    position: "sticky",
    top: 0,
    zIndex: 200,
    minWidth: TOTAL_WIDTH,
    background: "black",
    boxShadow: "0 6px 12px rgba(0,0,0,0.65)",
  }}
>
  {/* CHANNELS HEADER - STICKY TOP + LEFT */}
<div
  className="flex items-center px-2 py-2 flex-shrink-0 border-r border-white/10"
  style={{
    width: CHANNEL_COL_WIDTH,
    minWidth: CHANNEL_COL_WIDTH,
    maxWidth: CHANNEL_COL_WIDTH,
    position: "sticky",
    left: 0,
    zIndex: 250,
    background: "black",
    boxShadow: "8px 0 12px rgba(0,0,0,0.65)",
  }}
>
  <span className="text-[11px] font-bold text-cyan-300/80 uppercase tracking-[0.16em]">
  Channels
</span>
</div>

  {/* TIME LABELS */}
  <div
    className="relative flex flex-shrink-0"
    style={{
      width: TIMELINE_WIDTH,
      minWidth: TIMELINE_WIDTH,
      maxWidth: TIMELINE_WIDTH,
      background: "black",
    }}
  >
    {Array.from({ length: SLOT_COUNT }).map((_, i) => {
      const ts = timelineStartTs + i * MINUTES_PER_SLOT * 60 * 1000;
      const d = new Date(ts);

      return (
        <div
          key={i}
          className="text-center text-xs font-medium text-cyan-100 py-2 border-l border-white/10 flex-shrink-0"
          style={{
            width: PX_PER_SLOT,
            minWidth: PX_PER_SLOT,
            maxWidth: PX_PER_SLOT,
          }}
        >
          {d.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </div>
      );
    })}
  </div>
</div>

        {/* PROGRAM ROWS */}
        <div className="flex flex-col" style={{ minWidth: TOTAL_WIDTH }}>
          <div style={{ height: topSpacer }} />

{visibleChannels.map((ch, index) => {
  const previous = visibleChannels[index - 1];

  const isSelected = selectedChannel?.id === ch.id;

  const isYoutube = ch.delivery === "youtube";
const isOfflineYoutube =
  isYoutube &&
  (ch.offline === true ||
    ch.isLive === false ||
    ch.unlockDisabled === true ||
    ch.status === "offline");

  const previousWasYoutube = previous?.delivery === "youtube";
  const showYoutubeHeader = isYoutube && !previousWasYoutube;
const programs = allEPG?.[ch.id] ?? [];

const renderPrograms = (() => {
  const TINY_MERGE_MIN = 12;
  const parsed = programs
    .map((p) => {
      const startTs = p.start_utc ? new Date(p.start_utc).getTime() : NaN;
      const endTs = p.stop_utc ? new Date(p.stop_utc).getTime() : NaN;

      return {
        ...p,
        _startTs: startTs,
        _endTs: endTs,
      };
    })
    .filter((p) => {
      if (Number.isNaN(p._startTs) || Number.isNaN(p._endTs)) return false;
      if (p._endTs <= timelineStartTs || p._startTs >= timelineEndTs) return false;
      if (p._endTs <= p._startTs) return false;
      return true;
    })
    .sort((a, b) => a._startTs - b._startTs);

  const merged: any[] = [];
  let pendingTinyStartTs: number | null = null;

  for (const p of parsed) {
    const durationMin = (p._endTs - p._startTs) / 60000;
    const isTiny = durationMin < TINY_MERGE_MIN;

    if (isTiny) {
  const prev = merged[merged.length - 1];

  if (prev) {
    // Merge tiny segment into previous visible block.
    prev._endTs = Math.max(prev._endTs, p._endTs);
  } else {
    // Tiny segment is first. Save it and merge into next real block.
    pendingTinyStartTs = p._startTs;
  }

  continue;
}

    if (pendingTinyStartTs !== null) {
      p._startTs = Math.min(p._startTs, pendingTinyStartTs);
      pendingTinyStartTs = null;
    }

    const prev = merged[merged.length - 1];

    if (prev && p._startTs < prev._endTs) {
      if (p._endTs <= prev._endTs) continue;
      p._startTs = prev._endTs;
    }

    merged.push(p);
  }

  return merged;
})();

const health = channelHealth[ch.id];

const unlockCost = ch.unlockCost ?? 25;
const isYoutubePackChannel =
  ch.delivery === "youtube" ||
  (ch as any).type === "youtube" ||
  ch.category === "YouTube Live";
const displayUnlockCost = isYoutubePackChannel ? 100 : unlockCost;
const isUnlocked = unlockedChannelIds.includes(ch.id);
const isLocked = ch.locked === true && !isUnlocked;

const isDisabled = !!health?.is_disabled;
const isUnstable = health?.tier === "unstable";
const isMedium = health?.tier === "medium";
const isFavorite = favoriteIDs.includes(ch.id);

  const cardBg = isDisabled
  ? "bg-gray-800 opacity-40"
  : isSelected
  ? ""
  : isLocked
  ? "bg-yellow-950/30"
  : isUnstable
  ? "bg-red-900/30"
  : isMedium
  ? "bg-yellow-900/20"
  : "bg-white/5";

const channelClickAllowed = !isDisabled;

  return (
    <React.Fragment key={ch.id}>
      {showYoutubeHeader && (
        <div
          style={{
            height: 34,
            minWidth: TOTAL_WIDTH,
            display: "flex",
            alignItems: "center",
            paddingLeft: CHANNEL_COL_WIDTH + 12,
            background: "rgba(255,255,255,0.08)",
            borderBottom: "1px solid rgba(255,255,255,0.12)",
            color: "#f87171",
            fontSize: "12px",
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          YouTube Channels
        </div>
      )}

      <div
  className={`flex items-stretch border-b border-white/10 ${cardBg}`}
  style={{
    height: ROW_HEIGHT,
    background: isSelected ? "var(--bug-accent-soft)" : undefined,
    boxShadow: isSelected ? "inset 0 0 18px var(--bug-accent-border)" : undefined,
  }}
>
        {/* CHANNEL COLUMN */}
        <div
          className={`flex items-center gap-2 px-2 flex-shrink-0 overflow-hidden border-r border-white/10 ${
            channelClickAllowed
              ? "cursor-pointer hover:bg-white/10"
              : "cursor-not-allowed"
          }`}
          style={{
  width: CHANNEL_COL_WIDTH,
  minWidth: CHANNEL_COL_WIDTH,
  maxWidth: CHANNEL_COL_WIDTH,
  position: "sticky",
  left: 0,
  zIndex: 40,
  paddingRight: isLocked ? 118 : 8,
  background: isSelected
    ? "rgba(0,0,0,0.98)"
    : "rgba(0,0,0,0.96)",
  boxShadow: isSelected
    ? "8px 0 12px rgba(0,0,0,0.65), var(--bug-glow)"
    : "8px 0 12px rgba(0,0,0,0.65)",
  borderLeft: isSelected
    ? "3px solid var(--bug-accent)"
    : "3px solid transparent",
}}
          onClick={() => {
  if (!channelClickAllowed) return;

  // 🔒 Locked channels should NOT auto-open unlock prompt.
  // Only the unlock button should trigger unlock.
  if (isLocked) return;

  onSelectChannel?.(ch);
}}
        >
        <button
  type="button"
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggleFavorite?.(ch.id);
  }}
  className="
    w-7 h-7 rounded-md text-sm shrink-0
    flex items-center justify-center
    border pointer-events-auto cursor-pointer
  "
  
  style={{
    background: isFavorite
      ? "var(--bug-accent)"
      : "rgba(255,255,255,0.10)",
    color: isFavorite ? "black" : "rgba(255,255,255,0.65)",
    borderColor: isFavorite
      ? "var(--bug-accent-border)"
      : "rgba(255,255,255,0.12)",
    boxShadow: isFavorite ? "var(--bug-glow)" : "none",
  }}
  title={isFavorite ? "Remove favorite" : "Add favorite"}
>
  {isFavorite ? "★" : "☆"}

</button>
          <div
            style={{
              width: LOGO_SIZE,
minWidth: LOGO_SIZE,
height: LOGO_SIZE,
minHeight: LOGO_SIZE,
maxHeight: LOGO_SIZE,
              borderRadius: 6,
              background: "rgba(0,0,0,0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              overflow: "hidden",
            }}
          >
            {ch.logo ? (
              <img
                src={ch.logo}
                alt={ch.name}
                style={{
                  width: LOGO_IMG_SIZE,
height: LOGO_IMG_SIZE,
                  objectFit: "contain",
                }}
                loading="lazy"
              />
            ) : (
              <span className="text-cyan-300 text-sm">📺</span>
            )}
          </div>

          <div
  style={{
    flex: "1 1 0%",
    minWidth: 0,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    height: "100%",
  }}

          >
            <div
              style={{
  fontSize: `${CHANNEL_FONT_SIZE}px`,
  fontWeight: 800,
  color: isSelected ? "var(--bug-accent)" : "white",
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
  lineHeight: "1.1",
width: "100%",
maxWidth: "none",
}}
              title={ch.name}
            >
              {ch.name}
            </div>
          </div>
{isLocked && (
  <button
    type="button"
    onClick={(event) => {
      event.preventDefault();
      event.stopPropagation();

      if (isOfflineYoutube) {
        showToast(
          "This YouTube live channel is currently offline.",
          "error"
        );
        return;
      }

      onUnlockChannel(ch.id);
    }}
    title={
      isOfflineYoutube
        ? "This YouTube live channel is currently offline"
        : `Unlock ${ch.name} for ${displayUnlockCost} credits`
    }
    style={{
      position: "absolute",
      right: 8,
      top: "50%",
      transform: "translateY(-50%)",
      zIndex: 100,
      width: 102,
      height: 32,
      padding: "0 8px",
      borderRadius: 8,
      border: isOfflineYoutube
        ? "1px solid rgba(255,255,255,0.15)"
        : "2px solid #fde68a",
      background: isOfflineYoutube
        ? "rgba(255,255,255,0.08)"
        : "#facc15",
      color: isOfflineYoutube
        ? "#9ca3af"
        : "#000000",
      boxShadow: isOfflineYoutube
        ? "none"
        : "0 0 16px rgba(250,204,21,0.45)",
      fontSize: 11,
      fontWeight: 900,
      lineHeight: 1,
      whiteSpace: "nowrap",
      cursor: isOfflineYoutube
        ? "not-allowed"
        : "pointer",
      pointerEvents: "auto",
    }}
  >
    {isOfflineYoutube
      ? "Offline"
      : `Unlock ${displayUnlockCost}`}
  </button>
)}
        </div>

        {/* PROGRAM TIMELINE ROW */}
        <div
          className="relative h-full overflow-hidden flex-shrink-0"
          style={{
            width: TIMELINE_WIDTH,
            minWidth: TIMELINE_WIDTH,
            maxWidth: TIMELINE_WIDTH,
          }}
        >
          {renderPrograms.map((p, i) => {
            if (!p.start_utc || !p.stop_utc) return null;

          const startTs = (p as any)._startTs ?? new Date(p.start_utc).getTime();
          const endTs = (p as any)._endTs ?? new Date(p.stop_utc).getTime();
            if (Number.isNaN(startTs) || Number.isNaN(endTs)) {
              return null;
            }

            if (endTs <= timelineStartTs || startTs >= timelineEndTs) {
              return null;
            }

            const visibleStartTs = Math.max(startTs, timelineStartTs);
const visibleEndTs = Math.min(endTs, timelineEndTs);

const rawStartMin = (visibleStartTs - timelineStartTs) / 60000;
const rawEndMin = (visibleEndTs - timelineStartTs) / 60000;

// Visual-only snapping.
// Use 5-minute snapping instead of 15 so short/back-to-back programs do not overlap.
const SNAP_MIN = 5;
const MIN_VISUAL_MIN = 8;

let displayStartMin = Math.floor(rawStartMin / SNAP_MIN) * SNAP_MIN;
let displayEndMin = Math.ceil(rawEndMin / SNAP_MIN) * SNAP_MIN;

// Keep inside the visible timeline window.
displayStartMin = Math.max(0, displayStartMin);
displayEndMin = Math.min(TIMELINE_WINDOW_MIN, displayEndMin);

// Give tiny blocks a readable minimum width, but do not over-expand too much.
if (displayEndMin - displayStartMin < MIN_VISUAL_MIN) {
  displayEndMin = Math.min(
    TIMELINE_WINDOW_MIN,
    displayStartMin + MIN_VISUAL_MIN
  );
}

// Prevent visual overlap with the next program.
    const nextProgram = renderPrograms[i + 1];

if (nextProgram?.start_utc) {
  const nextStartTs = new Date(nextProgram.start_utc).getTime();

  if (!Number.isNaN(nextStartTs)) {
    const nextRawStartMin = (nextStartTs - timelineStartTs) / 60000;
    const nextDisplayStartMin =
      Math.floor(nextRawStartMin / SNAP_MIN) * SNAP_MIN;

    if (nextDisplayStartMin > displayStartMin) {
      displayEndMin = Math.min(displayEndMin, nextDisplayStartMin);
    }
  }
}

// If clamping made it too small, keep it as a clean tiny marker.
const finalVisualMin = displayEndMin - displayStartMin;

const left = displayStartMin * PX_PER_MIN;
const rawWidth = finalVisualMin * PX_PER_MIN;

// Hide useless tiny visual blocks.
// They usually represent 1–3 minute filler/split segments.
if (rawWidth < 24) return null;

const width = rawWidth;
if (width <= 0) return null;
            const isTinyBlock = width < 70;
const isSmallBlock = width >= 70 && width < 115;

            
            return (
              <div
  key={i}
  style={{
  position: "absolute",
  left: `${left}px`,
  width: `${width}px`,
  top: PROGRAM_TOP_BOTTOM,
  bottom: PROGRAM_TOP_BOTTOM,
  fontSize: `${PROGRAM_FONT_SIZE}px`,
  background: isLocked
  ? "linear-gradient(135deg, rgba(63,45,20,0.72), rgba(0,0,0,0.62))"
  : "linear-gradient(135deg, rgba(92,45,14,0.92), rgba(124,45,18,0.88))",
border: isSelected
  ? "1px solid rgba(0,229,255,0.55)"
  : "1px solid rgba(255,255,255,0.10)",
borderRadius: isTinyBlock ? "6px" : "10px",
color: isLocked ? "rgba(255,255,255,0.58)" : "#ffedd5",
fontWeight: 800,
display: "flex",
alignItems: "center",
justifyContent: "flex-start",
padding: isTinyBlock ? "0" : isSmallBlock ? "0 7px" : "0 12px",
overflow: "hidden",
whiteSpace: "nowrap",
textOverflow: "ellipsis",
boxShadow: isLocked ? "none" : "inset 0 0 14px rgba(255,255,255,0.04)",
cursor: isLocked ? "not-allowed" : "pointer",
}}
  onClick={() => {
    if (isLocked) return;

    onSelectProgram?.(p, ch);
  }}
  title={isLocked ? isYoutubePackChannel ? `Locked YouTube Pack — unlock all for ${displayUnlockCost} credits` : `Locked — unlock for ${displayUnlockCost} credits` : p.title}
>
  <span
  style={{
    minWidth: 0,
    overflow: "hidden",
    whiteSpace: "nowrap",
    textOverflow: "ellipsis",
    width: "100%",
    textAlign: isTinyBlock ? "center" : "left",
  }}
>
  {isLocked
    ? isTinyBlock
      ? "🔒"
      : `🔒 ${unlockCost}`
    : isTinyBlock
    ? ""
    : cleanLiveTitle(p.title)}
</span>
</div>
            );
          })}

          {programs.length === 0 && (
  <div
    style={{
      position: "absolute",
      inset: 0,
      display: "flex",
      alignItems: "center",
      paddingLeft: "14px",
      color: isLocked
        ? "rgba(250,204,21,0.85)"
        : "rgba(255,255,255,0.45)",
fontSize: guideDensity === "ultra" ? "11px" : guideDensity === "compact" ? "12px" : "13px",      fontStyle: "italic",
    }}
  >
{isOfflineYoutube
  ? "YouTube live is offline — cannot unlock right now"
  : isLocked
  ? `Locked YouTube Pack — unlock all YouTube channels for ${displayUnlockCost} credits`
  : ch.delivery === "youtube"
  ? "YouTube channel — no EPG schedule"
  : "No guide data available"}  </div>
)}
        </div>
      </div>
        </React.Fragment>
  );
})}

<div style={{ height: bottomSpacer }} />
</div>
      </div>
    </div>

);
};

export default TVGuidePanel;