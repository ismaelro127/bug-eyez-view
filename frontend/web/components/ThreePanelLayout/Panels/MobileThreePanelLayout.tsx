import React, { useMemo, useState } from "react";
import { Channel, EPGEntry } from "../../../../types";
import TVGuidePanel from "../../../../web/components/ThreePanelLayout/Panels/TVGuidePanel";
import { renderWithHashtags } from "../../../../shared/utils";
import SharedPlayer from "../../../../shared/SharedPlayer";
import type { BugEyezSettings } from "../../Settings/useSettingsData";

type MobileProps = {
  selected: Channel | null;
  setSelected: (ch: Channel | null) => void;
  onRequestNextChannel?: (reason: string) => void;
  adPlaying?: boolean;
  channels: Channel[];
  onToggleFavorite?: (channelId: string) => void;
  channelHealth?: Record<string, any>;
  unlockedChannelIds?: string[];
  credits?: number;
  appSettings?: BugEyezSettings;
  onUnlockChannel: (channelId: string) => void;
  userFeatures?: any;
  selectedProgram: EPGEntry | null;
  setSelectedProgram: (p: EPGEntry | null) => void;
  timelineRef: React.RefObject<HTMLDivElement | null>;
  aiSummary: any;
  loadingAI: boolean;
  setLoadingAI: (v: boolean) => void;
  setAISummary: (v: any) => void;
  epgData: Record<string, EPGEntry[]>;
  nowTs: number;
  liveNewsData: any[];
  relatedPrograms: any[];
  detectedPeople: any[];
  safeOfficialLinks: Record<string, string>;
  favoriteIDs: string[];
  setFavoriteIDs: React.Dispatch<React.SetStateAction<string[]>>;
};

const getSummaryText = (aiSummary: any) => {
  if (!aiSummary) return "";
  return (
    aiSummary.summary ||
    aiSummary.description ||
    aiSummary.text ||
    aiSummary.overview ||
    ""
  );
};

const MobileThreePanelLayout: React.FC<MobileProps> = ({
  selected,
  setSelected,
  onRequestNextChannel,
  channels,
  adPlaying = false,
  channelHealth,
  selectedProgram,
  setSelectedProgram,
  timelineRef,
  aiSummary,
  loadingAI,
  appSettings,
  epgData,
  nowTs,
  onToggleFavorite,
  unlockedChannelIds = [],
  credits = 0,
  onUnlockChannel,
  favoriteIDs,
}) => {
  const [activeTab, setActiveTab] = useState<"channels" | "ai">("channels");
const [channelSource, setChannelSource] =
  useState<"public" | "personal">("public");
  
const visibleChannels = useMemo(() => {
  return channels.filter((ch) => {
    const isPersonal = ch.id.startsWith("personal:");

    if (channelSource === "personal") {
      if (!isPersonal) return false;
    } else {
      if (isPersonal) return false;
    }

    if (!channelHealth) return true;

    const health = channelHealth[ch.id];

    if (!health) return true;

    return !health.is_disabled && !health.suppressed;
  });
}, [channels, channelHealth, channelSource]);

  const summaryText = getSummaryText(aiSummary);
  const tags = Array.isArray(aiSummary?.tags) ? aiSummary.tags : [];
  const highlights = Array.isArray(aiSummary?.highlights) ? aiSummary.highlights : [];

  return (
    <div className="flex h-full w-full min-h-0 flex-col overflow-hidden bg-black text-white">
      {/* PLAYER AREA */}
      <section
        className="relative mx-auto w-full shrink-0 overflow-hidden border-b border-white/10 bg-black"
        style={{ height: "clamp(220px, 38dvh, 390px)", maxWidth: "820px" }}
      >
        {selected ? (
<SharedPlayer
  channel={selected}
  source="sidebar"
  adPlaying={adPlaying}
  showAIButton={false}
  onRequestNextChannel={onRequestNextChannel}
/>
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-gray-500">
            Select a channel
          </div>
        )}
      </section>

      {/* MOBILE TAB BAR */}
      <nav className="shrink-0 border-b border-white/10 bg-[#05070a] px-3 py-2">
        <div className="mx-auto grid max-w-[820px] grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("channels")}
            className={`rounded-xl px-3 py-2 text-sm font-black transition active:scale-95 ${
              activeTab === "channels"
                ? "bg-cyan-400 text-black shadow-[0_0_14px_rgba(34,211,238,0.45)]"
                : "border border-white/10 bg-white/5 text-gray-300"
            }`}
          >
            📺 Guide
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`rounded-xl px-3 py-2 text-sm font-black transition active:scale-95 ${
              activeTab === "ai"
                ? "bg-emerald-400 text-black shadow-[0_0_14px_rgba(52,211,153,0.45)]"
                : "border border-white/10 bg-white/5 text-gray-300"
            }`}
          >
            📝 AI Summary
          </button>
        </div>
      </nav>

      {/* CONTENT AREA */}
<main className="min-h-0 flex-1 overflow-hidden">
  {activeTab === "channels" && (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {/* PERSONAL CHANNEL TOGGLE */}
<div className="shrink-0 flex justify-end px-2 py-1">
  <button
    type="button"
    onClick={() =>
      setChannelSource((current) =>
        current === "personal" ? "public" : "personal"
      )
    }
    title={
      channelSource === "personal"
        ? "Show public channels"
        : "Show personal channels"
    }
    aria-label={
      channelSource === "personal"
        ? "Show public channels"
        : "Show personal channels"
    }
    className={`flex h-8 w-8 items-center justify-center rounded-md border text-sm transition ${
      channelSource === "personal"
        ? "border-cyan-300 bg-cyan-400 text-black"
        : "border-white/15 bg-white/5 text-gray-300"
    }`}
  >
    {channelSource === "personal" ? "⌂" : "♙"}
  </button>
</div>
      {/* GUIDE */}
      <div className="min-h-0 flex-1 overflow-hidden">
        <TVGuidePanel
          channels={visibleChannels}
          allEPG={epgData}
          favoriteIDs={favoriteIDs}
          onToggleFavorite={onToggleFavorite}
          nowTs={nowTs}
          appSettings={appSettings}
          selectedChannel={selected}
          timelineRef={timelineRef}
          onSelectChannel={(ch: Channel) => {
            setSelected(ch);
            setSelectedProgram(null);
            setActiveTab("channels");
          }}
          onSelectProgram={(program: EPGEntry, channel: Channel) => {
            setSelected(channel);
            setSelectedProgram(program);
            setActiveTab("ai");
          }}
          unlockedChannelIds={unlockedChannelIds}
          credits={credits}
          onUnlockChannel={onUnlockChannel}
        />
      </div>
    </div>
  )}

        {activeTab === "ai" && (
          <div className="h-full overflow-y-auto bg-black px-4 py-4">
            <div className="mx-auto max-w-[820px] space-y-4 pb-8">
              <div className="rounded-2xl border border-emerald-400/25 bg-emerald-400/10 p-4 shadow-[0_0_20px_rgba(16,185,129,0.12)]">
                <div className="mb-1 text-xs font-black uppercase tracking-[0.18em] text-emerald-300/80">
                  AI Insight Hub
                </div>

                <h2 className="text-xl font-black text-emerald-300">
                  {aiSummary?.title || selectedProgram?.title || selected?.name || "AI Summary"}
                </h2>

                {selected && (
                  <div className="mt-1 text-xs text-gray-400">
                    {selected.name}
                    {selected.language ? ` • ${selected.language}` : ""}
                    {selected.category ? ` • ${selected.category}` : ""}
                  </div>
                )}
              </div>

              {loadingAI && (
                <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-100">
                  Analyzing available guide data…
                </div>
              )}

              <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                <div className="mb-2 text-sm font-bold text-white/80">
                  Summary
                </div>

                {summaryText ? (
                  <div className="text-sm leading-relaxed text-gray-200">
                    {renderWithHashtags(summaryText)}
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-gray-400">
                    Select a program from the guide to view a richer AI summary. If no guide data is available, Bug Eyez View will show a safe channel-level fallback.
                  </p>
                )}
              </div>

              {highlights.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
                  <div className="mb-2 text-sm font-bold text-white/80">Key Points</div>
                  <ul className="list-disc space-y-1 pl-5 text-sm text-gray-300">
                    {highlights.map((item: string, index: number) => (
                      <li key={`${item}-${index}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {tags.map((tag: string) => (
                    <span
                      key={tag}
                      className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-100"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {selectedProgram && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-gray-300">
                  <div className="mb-1 font-bold text-white/80">Selected Program</div>
                  <div className="text-emerald-200">{selectedProgram.title || "Untitled Program"}</div>
                  {selectedProgram.description && (
                    <p className="mt-2 text-gray-400">{selectedProgram.description}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MobileThreePanelLayout;
