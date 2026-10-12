"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Channel, ChannelHealth, EPGEntry } from "../../../../types";
import AIPanelTabs from "./AIPanelTabs";
import { usePrefs } from "../../../../shared/hooks/useLocalIntel";
import { applyTheme } from "../../../../shared/utils/themePresets";
import TVGuidePanel from "./TVGuidePanel";
import NowNextBanner from "../../NowNextBanner";
import { triggerActiveVisuals } from "../../../../shared/visuals";
import SharedPlayer from "../../../../shared/SharedPlayer";
import { pickBestChannel } from "../../../../shared/utils/pickBestChannel";
import { logger } from "../../../utils/logger";
import type { BugEyezSettings } from "../../Settings/useSettingsData";

interface DesktopThreePanelLayoutProps {
  allEPG: Record<string, EPGEntry[]>;
  channels: Channel[];
  selected: Channel | null;
  userFeatures?: any;
  menuOpen?: boolean;
  onToggleFavorite?: (channelId: string) => void;
  setSelected: React.Dispatch<React.SetStateAction<Channel | null>>;
  appSettings?: BugEyezSettings;
  selectedProgram: EPGEntry | null;
  channelHealth?: Record<string, ChannelHealth>;
  setSelectedProgram: React.Dispatch<React.SetStateAction<EPGEntry | null>>;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  aiSummary: any;
  loadingAI: boolean;
  liveNewsData: any[];
  relatedPrograms: EPGEntry[];
  epgData: Record<string, EPGEntry[]>;
  nowTs: number;
  unlockedChannelIds?: string[];
  credits?: number;
  onUnlockChannel?: (channelId: string) => void;
  detectedPeople: any[];
  safeOfficialLinks: Record<string, string>;
  setAISummary: React.Dispatch<React.SetStateAction<any>>;
  setLoadingAI: React.Dispatch<React.SetStateAction<boolean>>;
  favoriteIDs: string[];
  setFavoriteIDs: React.Dispatch<React.SetStateAction<string[]>>;
}

type ChannelTab =
  | "All"
  | "Favorites"
  | "News"
  | "Government"
  | "Public TV"
  | "Education"
  | "Culture";

const CHANNEL_TABS: ChannelTab[] = [
  "All",
  "Favorites",
  "News",
  "Government",
  "Public TV",
  "Education",
  "Culture",
];

const normalizeText = (value: unknown) => String(value || "").toLowerCase();

const getChannelSummaryFallback = (channel: Channel, program?: EPGEntry | null) => {
  const category = String((program as any)?.category || channel.category || channel.genre || "Live TV");
  const title = String(program?.title || channel.name || "Live Channel");
  const description = String(
    program?.description ||
      (channel as any).description ||
      `${channel.name || "This channel"} is live now. This summary is based on available channel and program metadata. Real-time transcript analysis is not available yet.`
  );

  return {
    title,
    summary: description,
    description,
    channel: channel.name || "",
    category,
    tags: [category, channel.language, channel.origin || (channel as any).country]
      .filter(Boolean)
      .map((tag) => String(tag).replace(/\s+/g, "")),
    sourceNote: "Metadata summary. Live transcript summary is not available yet.",
  };
};

const DesktopThreePanelLayout: React.FC<DesktopThreePanelLayoutProps> = ({
  channels,
  selected,
  setSelected,
  appSettings,
  selectedProgram,
  setSelectedProgram,
  epgData,
  aiSummary,
  nowTs,
  onToggleFavorite,
  loadingAI,
  liveNewsData,
  relatedPrograms,
  menuOpen,
  detectedPeople,
  unlockedChannelIds = [],
  credits = 0,
  onUnlockChannel,
  safeOfficialLinks,
  setAISummary,
  timelineRef,
  setLoadingAI,
  channelHealth,
  favoriteIDs,
}) => {
  const selectedRef = useRef(selected);
  const [summaryCache, setSummaryCache] = useState<Record<string, any>>({});
  const [showNowNext, setShowNowNext] = useState(false);
  const [channelTab, setChannelTab] = useState<ChannelTab>("All");
  const { prefs } = usePrefs();

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    if (!prefs) return;
    const maybeTone = (prefs as any).tone;
    if (maybeTone) applyTheme(maybeTone);
    document.documentElement.style.setProperty("--holo-brightness", "1");
  }, [prefs]);

  useEffect(() => {
    if (!aiSummary?.summary) return;
    applyTheme(aiSummary.summary || aiSummary.tags?.join(" ") || "default");
  }, [aiSummary]);

  useEffect(() => {
    let idleTimer: ReturnType<typeof setTimeout> | undefined;

    const updateShimmer = (opacity: number, speed: number) => {
      document.documentElement.style.setProperty("--shimmer-opacity", opacity.toString());
      document.documentElement.style.setProperty("--shimmer-speed", `${speed}s`);
    };

    const handleUserActivity = () => {
      updateShimmer(0.4, 3);
      if (idleTimer) clearTimeout(idleTimer);
      idleTimer = setTimeout(() => updateShimmer(0.8, 8), 3000);
    };

    updateShimmer(0.8, 8);
    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("scroll", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("touchmove", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("scroll", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("touchmove", handleUserActivity);
      if (idleTimer) clearTimeout(idleTimer);
    };
  }, []);

  const filteredChannels = useMemo(() => {
    return channels.filter((channel) => {
      if (selected && channel.id === selected.id) return true;

      if (channelTab === "Favorites") {
        return favoriteIDs.includes(channel.id);
      }

      if (channelTab === "All") return true;

      const haystack = [
        channel.category,
        channel.genre,
        channel.language,
        channel.origin,
        (channel as any).country,
        (channel as any).group,
      ]
        .map(normalizeText)
        .join(" ");

      if (channelTab === "Public TV") {
        return haystack.includes("public") || haystack.includes("government") || haystack.includes("education");
      }

      return haystack.includes(normalizeText(channelTab));
    });
  }, [channels, channelTab, favoriteIDs, selected]);

  const handleProgramSelect = (program: EPGEntry, channel: Channel) => {
    triggerActiveVisuals();
    setSelected(channel);
    setSelectedProgram(program);
    setShowNowNext(true);
    window.setTimeout(() => setShowNowNext(false), 5000);
  };

  const fallbackSummary = useMemo(() => {
    if (!selected) return null;
    return getChannelSummaryFallback(selected, selectedProgram);
  }, [selected, selectedProgram]);

  const activeSummary = aiSummary?.summary || aiSummary?.description ? aiSummary : fallbackSummary;

  const activeProgram = useMemo(() => {
    if (selectedProgram) return selectedProgram;
    if (!selected) return null;

    return {
      channel: selected.id,
      title: selected.name || "Live Channel",
      description: fallbackSummary?.description || "Live channel metadata summary.",
      category: selected.category || selected.genre || "Live TV",
    } as any as EPGEntry;
  }, [selected, selectedProgram, fallbackSummary]);

  useEffect(() => {
    if (!selected) return;

    const programTitle = selectedProgram?.title || "live-channel";
    const cacheKey = `${selected.id}::${programTitle}`;
    const cached = summaryCache[cacheKey];

    if (cached) {
      setAISummary(cached);
      return;
    }

    const localFallback = getChannelSummaryFallback(selected, selectedProgram);
    setAISummary(localFallback);

    if (!selectedProgram) return;

    let cancelled = false;

    const run = async () => {
      setLoadingAI(true);

      try {
        const res = await fetch("/api/ai-summary", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: selectedProgram.title || selected.name || "Live Program",
            description: selectedProgram.description || localFallback.description || "",
            channel: selected.name || "",
            category: (selectedProgram as any).category || selected.category || selected.genre || "Live TV",
            summaryMode: (selected as any).summaryMode || "normal",
            sourceNote: localFallback.sourceNote,
          }),
        });

        const data = await res.json().catch(() => null);

        if (!res.ok) {
          logger.warn("AI summary request failed:", res.status, data);
          throw new Error(data?.error || "AI summary request failed");
        }

        const normalized = {
          title: selectedProgram.title || selected.name || "Program Summary",
          summary: data?.summary || localFallback.summary,
          description: data?.summary || localFallback.description,
          channel: selected.name || "",
          category: (selectedProgram as any).category || selected.category || selected.genre || "Live TV",
          tags: Array.isArray(data?.tags) ? data.tags : localFallback.tags,
          sourceNote: data?.sourceNote || localFallback.sourceNote,
        };

        if (cancelled) return;

        setSummaryCache((prev) => ({ ...prev, [cacheKey]: normalized }));
        setAISummary(normalized);
      } catch (error) {
        logger.error("AI summary fetch failed:", error);
      } finally {
        if (!cancelled) setLoadingAI(false);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [
    selected?.id,
    selected?.name,
    selected?.category,
    selected?.genre,
    selectedProgram?.title,
    selectedProgram?.description,
    (selectedProgram as any)?.category,
  ]);

  return (
    <div className="h-full w-full bg-black text-white overflow-hidden">
      <div
        className="grid h-full w-full gap-4 px-5 pb-5 pt-4"
        style={{
          gridTemplateColumns: "minmax(320px, 33vw) minmax(520px, 1fr) minmax(330px, 30vw)",
          gridTemplateRows: "minmax(0, 1fr)",
        }}
      >
        {/* LEFT — Guide */}
        <section
          className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/55 shadow-[0_0_22px_rgba(34,211,238,0.08)]"
          style={{ zIndex: menuOpen ? 0 : 10, pointerEvents: menuOpen ? "none" : "auto" }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
              <div className="text-sm font-black tracking-wide text-cyan-200">Guide</div>
              <div className="text-[11px] text-white/45">{filteredChannels.length} channels</div>
            </div>

            <div className="border-b border-white/10 px-2 py-2">
              <div className="flex gap-2 overflow-x-auto pb-1">
                {CHANNEL_TABS.map((tab) => {
                  const active = channelTab === tab;
                  return (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setChannelTab(tab)}
                      className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition ${
                        active
                          ? "bg-cyan-400 text-black shadow-[0_0_10px_rgba(34,211,238,0.35)]"
                          : "bg-white/10 text-white/65 hover:bg-white/15 hover:text-white"
                      }`}
                    >
                      {tab === "Favorites" ? "⭐ Favorites" : tab}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-hidden p-2">
              <TVGuidePanel
                channels={filteredChannels}
                allEPG={epgData}
                nowTs={nowTs}
                favoriteIDs={favoriteIDs}
                appSettings={appSettings}
                selectedChannel={selected}
                onToggleFavorite={onToggleFavorite}
                timelineRef={timelineRef}
                onSelectChannel={(channel) => {
                  triggerActiveVisuals();
                  setSelected(channel);
                  setSelectedProgram(null);
                  setShowNowNext(false);
                }}
                onSelectProgram={handleProgramSelect}
                unlockedChannelIds={unlockedChannelIds}
                credits={credits}
                onUnlockChannel={onUnlockChannel}
              />
            </div>
          </div>
        </section>

        {/* CENTER — Player */}
        <section
          className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/70 shadow-[0_0_24px_rgba(168,85,247,0.08)]"
          style={{ zIndex: menuOpen ? 0 : 20, pointerEvents: menuOpen ? "none" : "auto" }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/10 px-3 py-2 text-center text-sm font-black text-white/85">
              LIVE PLAYER
            </div>

            <div className="relative min-h-0 flex-1 bg-black">
              {selected ? (
                <SharedPlayer
                  channel={selected}
                  source="auto"
                  onRequestNextChannel={(reason) => {
                    const current = selectedRef.current;
                    if (!current) return;
                    const next = pickBestChannel(channels, current, channelHealth);
                    if (!next) return;
                    setSelected(next);
                  }}
                />
              ) : (
                <div className="flex h-full items-center justify-center p-4 text-sm text-white/60">
                  Select a channel from the guide
                </div>
              )}

              {showNowNext && selected && appSettings?.showNowNextBanner !== false && (
                <div className="pointer-events-none absolute inset-0 z-20">
                  <NowNextBanner
                    channelId={selected.id}
                    epgUrl={`/epg/${selected.id}.json`}
                    forceShow={true}
                  />
                </div>
              )}
            </div>
          </div>
        </section>

        {/* RIGHT — AI */}
        <section
          className="min-h-0 overflow-hidden rounded-2xl border border-white/10 bg-black/65 shadow-[0_0_24px_rgba(251,191,36,0.08)]"
          style={{ zIndex: menuOpen ? 0 : 15, pointerEvents: menuOpen ? "none" : "auto" }}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b border-white/10 px-3 py-2 text-center text-sm font-black text-white/85">
              AI PANEL
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {selected && activeProgram ? (
                <>
                  <AIPanelTabs
                    selectedProgram={activeProgram}
                    summary={activeSummary}
                    loadingAI={loadingAI}
                    news={liveNewsData}
                    programs={relatedPrograms}
                    people={detectedPeople}
                    officialLinks={safeOfficialLinks}
                  />

                  <div className="mt-3 rounded-xl border border-cyan-400/15 bg-cyan-400/5 p-3 text-[11px] leading-relaxed text-cyan-100/65">
                    AI summaries are based on available metadata, EPG, rotation details, or backend summary results. Live transcript summary is not enabled yet.
                  </div>
                </>
              ) : (
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white/55">
                  Select a channel to view AI details.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DesktopThreePanelLayout;
