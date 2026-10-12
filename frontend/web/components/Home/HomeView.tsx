"use client";

import React, { useMemo } from "react";
import type { Channel, EPGEntry, ChannelHealth } from "../../../types";
import HomeStatCard from "./HomeStatCard";
import HomeQuickAction from "./HomeQuickAction";
import DraggableHomeSection from "./DraggableHomeSection";

type HomeViewProps = {
  userProfile?: any;
  userFeatures?: any;

  channels: Channel[];
  epgData: Record<string, EPGEntry[]>;

  updateSetting?: (key: any, value: any) => void;

  channelHealth?: Record<string, ChannelHealth>;

  appSettings?: any;

  selected: Channel | null;
  favoriteIDs: string[];
  unlockedChannelIds: string[];
  creditBalance: number;

  recentChannelIds?: string[];

  onGoLive: () => void;
  onGoProfile: () => void;
  onGoSettings: () => void;
  onWatchAd: () => void;

  onSelectChannel: (channel: Channel) => void;
};

function getDisplayName(userProfile?: any) {
  return (
    userProfile?.displayName ||
    userProfile?.username ||
    userProfile?.email?.split("@")?.[0] ||
    "User"
  );
}

function getGreeting() {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getCurrentProgram(channelId: string, epgData: Record<string, EPGEntry[]>) {
  const now = Date.now();
  const programs = epgData[channelId] || [];

  return programs.find((p) => {
    const start = new Date(p.start_utc).getTime();
    const stop = new Date(p.stop_utc).getTime();

    if (Number.isNaN(start) || Number.isNaN(stop)) return false;

    return start <= now && stop >= now;
  });
}

function cleanTitle(title?: string) {
  if (!title) return "Live Now";

  return title
    .replace(/^🔴?\s*LIVE[:\-\s]*/i, "")
    .replace(/^LIVE\s*\|\s*/i, "")
    .replace(/^LIVE\s+/i, "")
    .trim();
}

export default function HomeView({
  userProfile,
  userFeatures,
  channels,
  epgData,
  selected,
  favoriteIDs,
  unlockedChannelIds,
  creditBalance,
  updateSetting,
  onGoLive,
  onGoProfile,
  recentChannelIds = [],
  onGoSettings,
 channelHealth = {},
  appSettings,
  onWatchAd,
  onSelectChannel,
}: HomeViewProps) {
  const displayName = getDisplayName(userProfile);
  const greeting = getGreeting();

  const favoriteChannels = useMemo(() => {
    return channels.filter((ch) => favoriteIDs.includes(ch.id));
  }, [channels, favoriteIDs]);

  const recentlyWatchedChannels = useMemo(() => {
  return recentChannelIds
    .map((id) => channels.find((ch) => ch.id === id))
    .filter(Boolean)
    .slice(0, 8) as Channel[];
}, [recentChannelIds, channels]);

  const liveFavorites = useMemo(() => {
    return favoriteChannels
      .map((ch) => {
        const currentProgram = getCurrentProgram(ch.id, epgData);

        return {
          channel: ch,
          currentProgram,
        };
      })
      .slice(0, 6);
  }, [favoriteChannels, epgData]);

  const liveNowChannels = useMemo(() => {
    const favoritesFirst = [...channels].sort((a, b) => {
      const af = favoriteIDs.includes(a.id) ? 0 : 1;
      const bf = favoriteIDs.includes(b.id) ? 0 : 1;
      return af - bf;
    });

    return favoritesFirst
      .filter((ch) => ch.delivery !== "youtube" || ch.locked !== true)
      .slice(0, 8)
      .map((ch) => ({
        channel: ch,
        currentProgram: getCurrentProgram(ch.id, epgData),
        isFavorite: favoriteIDs.includes(ch.id),
      }));
  }, [channels, epgData, favoriteIDs]);

  function getUpcomingFavoritePrograms(
  favoriteChannels: Channel[],
  epgData: Record<string, EPGEntry[]>
) {
  const now = Date.now();
  const nextSixHours = now + 6 * 60 * 60 * 1000;
return favoriteChannels
    .flatMap((channel) => {
      const programs = epgData[channel.id] || [];

      return programs
        .filter((p) => {
          const start = new Date(p.start_utc).getTime();
          const stop = new Date(p.stop_utc).getTime();

          if (Number.isNaN(start) || Number.isNaN(stop)) return false;

          // current or upcoming within 6 hours
          return stop >= now && start <= nextSixHours;
        })
        .map((program) => ({
          channel,
          program,
          startTs: new Date(program.start_utc).getTime(),
          isLive:
            new Date(program.start_utc).getTime() <= now &&
            new Date(program.stop_utc).getTime() >= now,
        }));
    })
    .sort((a, b) => a.startTs - b.startTs)
    .slice(0, 8);
}

const upcomingFavoritePrograms = useMemo(() => {
  return getUpcomingFavoritePrograms(favoriteChannels, epgData);
}, [favoriteChannels, epgData]);

function formatProgramTime(startUtc?: string) {
  if (!startUtc) return "";

  const d = new Date(startUtc);

  if (Number.isNaN(d.getTime())) return "";

  return d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

  const recommendedChannels = useMemo(() => {
  const selectedId = selected?.id;

  const scored = channels.map((ch) => {
    const health = channelHealth[ch.id];
    const currentProgram = getCurrentProgram(ch.id, epgData);

    let score = 0;
    const reasons: string[] = [];

    if (favoriteIDs.includes(ch.id)) {
      score += 50;
      reasons.push("Favorite");
    }

    if (unlockedChannelIds.includes(ch.id)) {
      score += 30;
      reasons.push("Unlocked");
    }

    if (selectedId && ch.id === selectedId) {
      score += 25;
      reasons.push("Continue watching");
    }

    if (currentProgram) {
      score += 20;
      reasons.push("Live now");
    }

    if (health?.tier === "high") {
      score += 15;
      reasons.push("Stable stream");
    }

    if (health?.tier === "medium") {
      score += 5;
    }

    if (health?.tier === "unstable") {
      score -= 20;
    }

    if (health?.is_disabled || health?.suppressed) {
      score -= 100;
    }

    if (ch.locked && !unlockedChannelIds.includes(ch.id)) {
      score -= 40;
    }

    if (ch.delivery === "youtube") {
      score -= 5;
    }

    return {
      channel: ch,
      currentProgram,
      score,
      reasons,
      isFavorite: favoriteIDs.includes(ch.id),
    };
  });

  return scored
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
}, [
  channels,
  epgData,
  favoriteIDs,
  unlockedChannelIds,
  selected?.id,
  channelHealth,
]);

  const skipAdsActive =
    !!userFeatures?.skipAdsUntil &&
    new Date(userFeatures.skipAdsUntil).getTime() > Date.now();

    const DEFAULT_HOME_SECTION_ORDER = [
  "quickActions",
  "rewards",
  "recommended",
  "newFavorites",
  "continueWatching",
  "recent",
  "favoritesLive",
  "liveNow",
];

const sectionTitles: Record<string, string> = {
  quickActions: "Quick Actions",
  rewards: "Rewards Snapshot",
  recommended: "Recommended For You",
  newFavorites: "New From Your Favorites",
  continueWatching: "Continue Watching",
  recent: "Recently Watched",
  favoritesLive: "Favorites Live Now",
  liveNow: "What’s Live Now",
};

const homeSectionOrder =
  Array.isArray(appSettings?.homeSectionOrder) &&
  appSettings.homeSectionOrder.length > 0
    ? [
        ...appSettings.homeSectionOrder.filter((id: string) =>
          DEFAULT_HOME_SECTION_ORDER.includes(id)
        ),
        ...DEFAULT_HOME_SECTION_ORDER.filter(
          (id) => !appSettings.homeSectionOrder.includes(id)
        ),
      ]
    : DEFAULT_HOME_SECTION_ORDER;

const [draggingSectionId, setDraggingSectionId] =
  React.useState<string | null>(null);

const moveHomeSection = (targetId: string) => {
  if (!draggingSectionId || draggingSectionId === targetId) return;

  const currentOrder = [...homeSectionOrder];
  const fromIndex = currentOrder.indexOf(draggingSectionId);
  const toIndex = currentOrder.indexOf(targetId);

  if (fromIndex === -1 || toIndex === -1) return;

  const nextOrder = [...currentOrder];
  const [moved] = nextOrder.splice(fromIndex, 1);
  nextOrder.splice(toIndex, 0, moved);

  updateSetting?.("homeSectionOrder" as any, nextOrder as any);
};

const renderHomeSection = (sectionId: string) => {
  switch (sectionId) {
    case "quickActions":
      return (
        <div className="grid gap-3 md:grid-cols-4">
          <HomeQuickAction
            icon="📺"
            label="Live TV"
            description="Open the channel guide"
            onClick={onGoLive}
          />

          <HomeQuickAction
            icon="▶"
            label="Watch Ad"
            description="Earn credits"
            onClick={onWatchAd}
          />

          <HomeQuickAction
            icon="👤"
            label="Profile"
            description="View rewards and unlocks"
            onClick={onGoProfile}
          />

          <HomeQuickAction
            icon="⚙️"
            label="Settings"
            description="Theme and guide controls"
            onClick={onGoSettings}
          />
        </div>
      );

    case "rewards":
      if (appSettings?.showHomeRewards === false) return null;

      return (
        <div className="grid gap-3 md:grid-cols-4">
          <HomeStatCard
            label="Credits"
            value={creditBalance}
            subValue="Use credits for unlocks and boosts"
          />

          <HomeStatCard
            label="Favorites"
            value={favoriteIDs.length}
            subValue="Personalized channels"
          />

          <HomeStatCard
            label="Unlocked"
            value={unlockedChannelIds.length}
            subValue="Channels unlocked"
          />

          <HomeStatCard
            label="Skip Ads"
            value={skipAdsActive ? "Active" : "Off"}
            subValue={
              skipAdsActive
                ? `Until ${new Date(userFeatures.skipAdsUntil).toLocaleTimeString()}`
                : "Use credits to activate"
            }
          />
        </div>
      );

      renderHomeSection

      case "continueWatching":
  if (appSettings?.showHomeContinueWatching === false) return null;
  if (!selected) return null;

  return (
    <div
      className="rounded-xl p-4 flex items-center justify-between gap-3"
      style={{
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(255,255,255,0.05)",
      }}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-12 h-12 rounded-xl bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
          {selected.logo ? (
            <img
              src={selected.logo}
              alt={selected.name}
              className="w-10 h-10 object-contain"
            />
          ) : (
            <span>📺</span>
          )}
        </div>

        <div className="min-w-0">
          <div className="font-bold truncate">{selected.name}</div>

          <div className="text-xs text-gray-400 truncate">
            {cleanTitle(getCurrentProgram(selected.id, epgData)?.title) ||
              "Live channel"}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => {
          onSelectChannel(selected);
          onGoLive();
        }}
        className="px-4 py-2 rounded-lg text-sm font-bold shrink-0"
        style={{
          background: "var(--bug-accent)",
          color: "black",
        }}
      >
        Resume
      </button>
    </div>
  );

  case "recent":
  if (appSettings?.showHomeRecent === false) return null;

  if (recentlyWatchedChannels.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Channels you watch will appear here for quick access.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {recentlyWatchedChannels.map((channel) => {
        const currentProgram = getCurrentProgram(channel.id, epgData);

        return (
          <button
            key={channel.id}
            type="button"
            onClick={() => {
              onSelectChannel(channel);
              onGoLive();
            }}
            className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
                {channel.logo ? (
                  <img
                    src={channel.logo}
                    alt={channel.name}
                    className="w-9 h-9 object-contain"
                  />
                ) : (
                  <span>📺</span>
                )}
              </div>

              <div className="min-w-0">
                <div className="font-bold text-white truncate">
                  {channel.name}
                </div>

                <div
                  className="text-xs truncate mt-1"
                  style={{ color: "var(--bug-accent)" }}
                >
                  {currentProgram
                    ? cleanTitle(currentProgram.title)
                    : channel.delivery === "youtube"
                    ? "YouTube Live"
                    : "Live channel"}
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  case "newFavorites":
  if (appSettings?.showHomeFavorites === false) return null;

  if (favoriteChannels.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        Add favorites from the Live TV guide to see what is live and coming up here.
      </div>
    );
  }

  if (upcomingFavoritePrograms.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        No upcoming guide data found for your favorites yet.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {upcomingFavoritePrograms.map(({ channel, program, isLive }) => (
        <button
          key={`${channel.id}-${program.start_utc}-${program.title}`}
          type="button"
          onClick={() => {
            onSelectChannel(channel);
            onGoLive();
          }}
          className="rounded-xl p-4 text-left hover:bg-white/10 transition"
          style={{
            border: isLive
              ? "1px solid var(--bug-accent-border)"
              : "1px solid rgba(255,255,255,0.10)",
            background: isLive
              ? "var(--bug-accent-soft)"
              : "rgba(255,255,255,0.05)",
            boxShadow: isLive ? "var(--bug-glow)" : "none",
          }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <span>📺</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-white truncate">
                {channel.name}
              </div>

              <div className="text-xs text-gray-400">
                {formatProgramTime(program.start_utc)}
              </div>
            </div>
          </div>

          <div
            className="text-sm font-bold line-clamp-2"
            style={{ color: isLive ? "var(--bug-accent)" : "white" }}
          >
            {cleanTitle(program.title)}
          </div>

          <div className="mt-2 flex items-center gap-2">
            {isLive && (
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-black"
                style={{
                  color: "black",
                  background: "var(--bug-accent)",
                }}
              >
                LIVE NOW
              </span>
            )}

            {program.category && (
              <span className="rounded-full border border-white/10 bg-white/10 px-2 py-0.5 text-[10px] text-white/70">
                {program.category}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );

  case "favoritesLive":
  if (appSettings?.showHomeFavorites === false) return null;

  if (favoriteChannels.length === 0) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-gray-400">
        No favorites yet. Add stars from the Live TV guide to personalize your home page.
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {liveFavorites.map(({ channel, currentProgram }) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => {
            onSelectChannel(channel);
            onGoLive();
          }}
          className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-9 h-9 object-contain"
                />
              ) : (
                <span>📺</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-white truncate">
                {channel.name}
              </div>

              <div
                className="text-xs truncate"
                style={{ color: "var(--bug-accent)" }}
              >
                {currentProgram
                  ? cleanTitle(currentProgram.title)
                  : "Live now"}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

  case "liveNow":
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {liveNowChannels.map(({ channel, currentProgram, isFavorite }) => (
        <button
          key={channel.id}
          type="button"
          onClick={() => {
            onSelectChannel(channel);
            onGoLive();
          }}
          className="rounded-xl border border-white/10 bg-white/5 p-4 text-left hover:bg-white/10 transition"
        >
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-lg bg-black/40 flex items-center justify-center overflow-hidden shrink-0">
              {channel.logo ? (
                <img
                  src={channel.logo}
                  alt={channel.name}
                  className="w-9 h-9 object-contain"
                />
              ) : (
                <span>📺</span>
              )}
            </div>

            <div className="min-w-0">
              <div className="font-bold text-white truncate">
                {isFavorite ? "★ " : ""}
                {channel.name}
              </div>

              <div className="text-xs text-gray-400 truncate">
                {currentProgram
                  ? cleanTitle(currentProgram.title)
                  : channel.delivery === "youtube"
                  ? "YouTube Live"
                  : "Live channel"}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );

    default:
      return null;
  }
};

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-4 bg-black text-white">
      {/* HERO */}
      <div
        className="rounded-2xl p-5 mb-4 overflow-hidden"
        style={{
          border: "1px solid var(--bug-accent-border)",
          background:
            "linear-gradient(135deg, var(--bug-accent-soft), rgba(0,0,0,0.55))",
          boxShadow: "var(--bug-glow)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div
              className="text-sm font-bold mb-1"
              style={{ color: "var(--bug-accent)" }}
            >
              {greeting}, {displayName}
            </div>

            <h1 className="text-3xl font-black tracking-tight">
              Welcome back to Bug Eyez View
            </h1>

            <p className="text-sm text-gray-300 mt-2 max-w-2xl">
              Here is what is live now, what your favorite channels are showing,
              and your latest rewards status.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoLive}
            className="px-5 py-3 rounded-xl font-black shrink-0"
            style={{
              background: "var(--bug-accent)",
              color: "black",
              border: "1px solid var(--bug-accent-border)",
              boxShadow: "var(--bug-glow)",
            }}
          >
            Watch Live TV
          </button>
        </div>
      </div>

<div>
  {homeSectionOrder.map((sectionId) => {
    const content = renderHomeSection(sectionId);
    if (!content) return null;

    return (
      <DraggableHomeSection
        key={sectionId}
        id={sectionId}
        title={sectionTitles[sectionId] || sectionId}
        draggingId={draggingSectionId}
        onDragStart={setDraggingSectionId}
        onDragOver={moveHomeSection}
        onDragEnd={() => setDraggingSectionId(null)}
      >
      recommended
newFavorites
continueWatching
recent
favoritesLive
liveNow
 {content}
      </DraggableHomeSection>
    );
  })}
</div>
    </div>
  );
}