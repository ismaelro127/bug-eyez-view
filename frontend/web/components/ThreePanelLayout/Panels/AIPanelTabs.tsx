// components/ThreePanelLayout/Panels/AIPanelTabs.tsx
import React, { useState } from "react";
import { motion } from "framer-motion";
import { EPGEntry } from "../../../../types";

export interface AIPanelTabsProps {
  summary?:  {
    title: string;
    description: string;
    channel: string;
    category: string;
  };
  tags?: string[];  // 🔥 FIX ADDED
  programs?: { title: string; description?: string; date?: string }[];
  news?: { title: string; url?: string; source?: string }[];
  people?: { name: string; role?: string }[];
  officialLinks?: Record<string, string>;
  soundVolume?: number;
  onChannelLink?: (id: string) => void;
  selectedProgram?: EPGEntry | null;
  loadingAI?: boolean; // ✅ added this line
}

const AIPanelTabs: React.FC<AIPanelTabsProps> = ({
  summary,
  programs = [],
  news = [],
  people = [],
  officialLinks = {},
  soundVolume = 1,
  onChannelLink,
  loadingAI, // ✅ now recognized

}) => {
  const [activeTab, setActiveTab] = useState("summary");

  const tabs = [
    { key: "summary", label: "🧠 Summary" },
    { key: "programs", label: "📺 Programs" },
    { key: "people", label: "👥 People" },
    { key: "news", label: "📰 Related News" },
    { key: "links", label: "🔗 Links" },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "summary":
        return summary ? (
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-emerald-400">
              {summary.title}
            </h2>
            <p className="text-sm opacity-80">{summary.description}</p>
            <p className="text-xs text-gray-400">
              Category: {summary.category} • Source: {summary.channel}
            </p>
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">Awaiting AI summary…</p>
        );

      case "programs":
        return programs.length ? (
          <div className="space-y-2">
            {programs.map((p, i) => (
              <div
                key={i}
                className="p-2 rounded bg-white/5 hover:bg-white/10 transition"
              >
                <h3 className="text-sm font-semibold">{p.title}</h3>
                {p.description && (
                  <p className="text-xs opacity-70">{p.description}</p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No programs linked to this topic yet.
          </p>
        );

      case "people":
        return people.length ? (
          <ul className="text-sm space-y-1">
            {people.map((person, i) => (
              <li key={i}>
                <span className="entity-link">{person.name}</span>{" "}
                {person.role && (
                  <span className="text-gray-400">({person.role})</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">No related people found.</p>
        );

      case "news":
        return news.length ? (
          <ul className="space-y-2 text-sm">
            {news.map((n, i) => (
              <li key={i}>
                <a
                  href={n.url}
                  target="_blank"
                  rel="noreferrer"
                  className="entity-link"
                >
                  {n.title}
                </a>
                {n.source && (
                  <span className="text-gray-400 text-xs">
                    {" "}
                    ({n.source})
                  </span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">No relevant news yet.</p>
        );

      case "links":
        return Object.keys(officialLinks).length ? (
          <ul className="space-y-1 text-sm">
            {Object.entries(officialLinks).map(([key, value]) => (
              <li key={key}>
                <a
                  href={value}
                  target="_blank"
                  rel="noreferrer"
                  className="entity-link"
                >
                  {key}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400 italic">
            No official links available.
          </p>
        );

      default:
        return null;
    }
  };

  return (
    <div className="h-full flex flex-col holo-pane p-3 overflow-y-auto">
      {/* Tabs */}
      <div className="flex gap-2 mb-3">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`text-xs px-3 py-1 rounded transition ${
              activeTab === tab.key
                ? "bg-emerald-500/20 border-b-2 border-emerald-400"
                : "bg-white/5 hover:bg-white/10"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Animated Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.4 }}
        className="flex-1 overflow-y-auto text-sm space-y-2"
      >
        {renderTabContent()}
      </motion.div>

      {/* Sound Indicator */}
      <div className="mt-3 text-xs text-gray-400">
        🔊 Sound reactivity:{" "}
        <span className="text-emerald-400">
          {soundVolume ? `${(soundVolume * 100).toFixed(0)}%` : "off"}
        </span>
      </div>
    </div>
  );
};

export default AIPanelTabs;
