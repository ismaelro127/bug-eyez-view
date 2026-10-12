import React, { useEffect, useMemo, useState } from "react";
import { Activity, Newspaper, RefreshCcw, Sparkles } from "lucide-react";
import { logger } from "../../utils/logger";

interface Entity {
  text: string;
  label: string;
}

type SummaryMode = "normal" | "public_affairs";

interface AISummaryPanelProps {
  summary?: {
    title?: string;
    description?: string;
    channel?: string;
    category?: string;
  };
  selectedProgram?: any;
  selectedChannel?: any;
  channel?: any;
  currentProgram?: any;
  rotationItem?: any;
  loading?: boolean;
  onEntityClick?: (entity: string) => void;
}

const ENTITY_COLORS: Record<string, string> = {
  ORG: "emerald",
  PERSON: "sky",
  GPE: "violet",
  LOC: "violet",
  EVENT: "amber",
  PRODUCT: "pink",
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getSummaryMode = (channel: any): SummaryMode => {
  if (channel?.summaryMode === "public_affairs") return "public_affairs";
  if (channel?.category === "Government") return "public_affairs";
  if (channel?.type === "rotation" || channel?.type === "government_live") return "public_affairs";
  return "normal";
};

const buildLocalSummary = ({ channel, program, mode }: { channel: any; program: any; mode: SummaryMode }) => {
  const channelName = channel?.name || program?.channel || "this channel";
  const title = program?.title || program?.name || channelName;
  const description = program?.description || channel?.notes || channel?.category || "Live programming is available.";

  if (mode === "public_affairs") {
    return [
      `Current focus: ${title}`,
      "",
      description,
      "",
      "Plain-English context: This public affairs channel is meant for official government proceedings, hearings, briefings, and civic coverage. Use the official source details shown in the player when a live stream is not directly available.",
    ].join("\n");
  }

  return `${channelName}: ${description}`;
};

const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  summary,
  selectedProgram,
  selectedChannel,
  channel,
  currentProgram,
  rotationItem,
  loading: parentLoading,
  onEntityClick,
}) => {
  const activeChannel = selectedChannel || channel || null;
  const activeProgram = rotationItem || currentProgram || selectedProgram || summary || null;
  const summaryMode = getSummaryMode(activeChannel);

  const [loading, setLoading] = useState(false);
  const [aiSummary, setAiSummary] = useState<string>("");
  const [highlights, setHighlights] = useState<string[]>([]);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const contextKey = useMemo(() => {
    return JSON.stringify({
      channelId: activeChannel?.id || activeChannel?.name || "none",
      programTitle: activeProgram?.title || activeProgram?.name || summary?.title || "none",
      mode: summaryMode,
    });
  }, [activeChannel, activeProgram, summaryMode, summary?.title]);

  const fetchSummary = async (auto = false) => {
    try {
      if (!auto) setLoading(true);

      const payload = {
        summaryMode,
        channel: {
          id: activeChannel?.id || null,
          name: activeChannel?.name || summary?.channel || null,
          category: activeChannel?.category || summary?.category || null,
          country: activeChannel?.origin || activeChannel?.country || null,
          language: activeChannel?.language || null,
          type: activeChannel?.type || activeChannel?.delivery || null,
        },
        currentProgram: {
          title: activeProgram?.title || summary?.title || activeChannel?.name || "Live programming",
          description:
            activeProgram?.description ||
            summary?.description ||
            activeChannel?.notes ||
            "No detailed program description is available yet.",
          source: activeProgram?.source || activeChannel?.source || null,
          topics: activeProgram?.topics || [],
        },
      };

      const res = await fetch("/api/ai-summary", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        logger.warn("AI summary endpoint rejected; using local fallback:", res.status, data);
        const fallback = buildLocalSummary({ channel: activeChannel, program: payload.currentProgram, mode: summaryMode });
        setAiSummary(fallback);
        setHighlights(summaryMode === "public_affairs" ? ["Official-source content", "Neutral public affairs summary mode", "No invented facts"] : []);
        setEntities([]);
        setTags(summaryMode === "public_affairs" ? ["Government", "Public Affairs"] : []);
        setLastUpdated(new Date());
        return;
      }

      setAiSummary(data?.summary || buildLocalSummary({ channel: activeChannel, program: payload.currentProgram, mode: summaryMode }));
      setHighlights(Array.isArray(data?.highlights) ? data.highlights : []);
      setEntities(Array.isArray(data?.entities) ? data.entities : []);
      setTags(Array.isArray(data?.tags) ? data.tags : []);
      setLastUpdated(new Date());
    } catch (err) {
      logger.error("AI summary fetch failed; using local fallback:", err);
      setAiSummary(buildLocalSummary({ channel: activeChannel, program: activeProgram, mode: summaryMode }));
      setTags(summaryMode === "public_affairs" ? ["Government", "Fallback"] : ["Fallback"]);
      setLastUpdated(new Date());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary(true);
  }, [contextKey]);

  useEffect(() => {
    const interval = setInterval(() => fetchSummary(true), 6 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [contextKey]);

  const renderSummaryWithEntities = () => {
    if (!aiSummary) return null;

    let formatted = escapeHtml(aiSummary);

    entities.forEach((entity) => {
      const color = ENTITY_COLORS[entity.label] || "gray";
      const safe = escapeHtml(entity.text).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${safe}\\b`, "gi");
      formatted = formatted.replace(
        regex,
        `<span class="entity-glow-${color}" data-entity="${escapeHtml(entity.text)}">${escapeHtml(entity.text)}</span>`
      );
    });

    return (
      <p
        className="text-sm leading-relaxed whitespace-pre-wrap z-10 relative"
        dangerouslySetInnerHTML={{ __html: formatted }}
        onClick={(event) => {
          const target = event.target as HTMLElement;
          if (target?.dataset?.entity && onEntityClick) onEntityClick(target.dataset.entity);
        }}
      />
    );
  };

  const isLoading = loading || parentLoading;

  return (
    <div className="relative flex h-full min-h-0 flex-col gap-3 text-white">
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 text-emerald-300 font-semibold">
          <Sparkles size={16} />
          <span>{summaryMode === "public_affairs" ? "Public Affairs AI" : "AI Insight Hub"}</span>
        </div>

        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-1 text-xs ${isLoading ? "text-emerald-400" : "text-gray-500"}`}>
            <Activity size={12} className={isLoading ? "animate-pulse text-emerald-400" : "text-emerald-700/60"} />
            <span className={isLoading ? "animate-pulse" : "opacity-70"}>AI Active</span>
          </div>

          <button
            onClick={() => fetchSummary(false)}
            disabled={isLoading}
            className="flex items-center gap-1 text-sm px-3 py-1 rounded bg-emerald-600/20 hover:bg-emerald-500/30 border border-emerald-400/20 transition z-10 disabled:opacity-60"
            title="Generate AI summary"
          >
            {isLoading ? <RefreshCcw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            <span>{isLoading ? "Summarizing…" : "Summarize"}</span>
          </button>
        </div>
      </div>

      <div className="relative bg-white/5 rounded-lg p-3 border border-emerald-400/10 min-h-[120px] overflow-hidden shadow-[0_0_10px_rgba(16,185,129,0.1)]">
        {isLoading ? (
          <p className="text-sm text-gray-400 animate-pulse">Gathering insights…</p>
        ) : aiSummary ? (
          renderSummaryWithEntities()
        ) : (
          <p className="text-sm text-gray-400">Select a channel or program to generate an AI overview.</p>
        )}
      </div>

      {summaryMode === "public_affairs" && (
        <div className="rounded-lg border border-cyan-400/15 bg-cyan-400/5 p-3 text-xs text-cyan-100">
          Public affairs mode stays neutral, uses plain English, and avoids inventing facts beyond the channel/program metadata provided.
        </div>
      )}

      {highlights.length > 0 && (
        <div className="z-10">
          <div className="flex items-center gap-1 text-xs uppercase text-gray-400 mb-1">
            <Newspaper size={12} />
            <span>Key Points</span>
          </div>
          <ul className="space-y-1 pl-3 list-disc text-sm text-gray-300">
            {highlights.map((highlight, index) => (
              <li key={`${highlight}-${index}`} className="hover:text-emerald-300 transition">
                {highlight}
              </li>
            ))}
          </ul>
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-700/40 text-emerald-100">
              #{tag}
            </span>
          ))}
        </div>
      )}

      {lastUpdated && <div className="mt-auto text-xs text-gray-500 text-right z-10">Last updated: {lastUpdated.toLocaleTimeString()}</div>}
    </div>
  );
};

export default AISummaryPanel;
