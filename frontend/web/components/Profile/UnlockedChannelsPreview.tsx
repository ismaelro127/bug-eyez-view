"use client";

import React from "react";

type UnlockedChannelsPreviewProps = {
  unlockedChannelIds: string[];
};

function formatChannelName(id: string) {
  return id
    .replace(/^yt_/, "YouTube ")
    .replace(/_/g, " ")
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function UnlockedChannelsPreview({
  unlockedChannelIds,
}: UnlockedChannelsPreviewProps) {
  const safeUnlocked = Array.isArray(unlockedChannelIds)
    ? unlockedChannelIds
    : [];

  const preview = safeUnlocked.slice(0, 8);

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        border: "1px solid var(--bug-accent-border)",
        background: "var(--bug-accent-soft)",
        boxShadow: "var(--bug-glow)",
      }}
    >
      <div
        className="px-4 py-3 flex items-center justify-between gap-3"
        style={{
          borderBottom: "1px solid var(--bug-accent-border)",
        }}
      >
        <div>
          <div
            className="font-bold"
            style={{ color: "var(--bug-accent)" }}
          >
            🔓 Unlocked Channels
          </div>

          <div className="text-xs text-gray-300/80">
            Channels unlocked with credits or rewards
          </div>
        </div>

        <div
          className="text-xs font-bold px-3 py-1 rounded-full"
          style={{
            color: "var(--bug-accent)",
            border: "1px solid var(--bug-accent-border)",
            background: "rgba(0,0,0,0.25)",
          }}
        >
          {safeUnlocked.length} total
        </div>
      </div>

      {safeUnlocked.length === 0 ? (
        <div className="p-4 text-sm text-gray-300/80">
          No unlocked channels yet. Watch ads to earn credits, then unlock premium channels.
        </div>
      ) : (
        <div className="p-4 flex flex-wrap gap-2">
          {preview.map((id) => (
            <div
              key={id}
              className="rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                color: "var(--bug-accent)",
                border: "1px solid var(--bug-accent-border)",
                background: "rgba(0,0,0,0.30)",
              }}
              title={id}
            >
              {formatChannelName(id)}
            </div>
          ))}

          {safeUnlocked.length > preview.length && (
            <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs text-white/70">
              +{safeUnlocked.length - preview.length} more
            </div>
          )}
        </div>
      )}
    </div>
  );
}