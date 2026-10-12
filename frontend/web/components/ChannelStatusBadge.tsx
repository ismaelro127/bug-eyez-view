import React from "react";

type Props = {
  stability: number | null;
  isPlaying?: boolean;
};

export default function ChannelStatusBadge({ stability, isPlaying }: Props) {
  let label = "Unknown";
  let color = "bg-gray-500";

  if (typeof stability === "number") {
    if (stability >= 0.8) {
      label = "Stable";
      color = "bg-emerald-500";
    } else if (stability >= 0.5) {
      label = "Unstable";
      color = "bg-yellow-500";
    } else {
      label = "Poor";
      color = "bg-red-500";
    }
  }

  return (
    <div className="flex items-center gap-2">
      {isPlaying && <span className="text-xs text-green-400">● Live</span>}
      <span
        className={`px-2 py-0.5 rounded text-xs font-semibold text-black ${color}`}
      >
        {label}
      </span>
    </div>
  );
}
