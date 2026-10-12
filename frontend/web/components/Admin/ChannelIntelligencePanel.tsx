"use client";

import React from "react";
import { Channel } from "../../../types";

interface Props {
  channels: Channel[];
}

const ChannelIntelligencePanel: React.FC<Props> = ({ channels }) => {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-white">
        🧠 Channel Intelligence
      </h2>

      {channels.map((ch) => (
        <div
          key={ch.id}
          className="rounded-xl bg-white/5 p-4 border border-white/10"
        >
          <div className="flex items-center justify-between">
            <div>
              <div className="font-semibold text-white truncate">
                {ch.name}
              </div>
              <div className="text-xs text-gray-400">
                Source: {ch.origin ?? "unknown"}
              </div>
            </div>

            <span className="text-xs px-2 py-1 rounded bg-yellow-500/20 text-yellow-300">
              Learning
            </span>
          </div>

          <div className="mt-3 text-xs text-gray-300 space-y-1">
            <div>⏱ Typical live duration: —</div>
            <div>📅 Active hours: —</div>
            <div>📺 Content type: —</div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ChannelIntelligencePanel;
