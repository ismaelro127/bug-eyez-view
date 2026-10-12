import React, { useState } from "react";
import EPGGrid from "./EPGGrid";
import { Channel } from "../../types";

interface Props {
  channels: Channel[];
  onChannelSelect: (ch: Channel) => void;
}

const EPGGridWrapper: React.FC<Props> = ({ channels, onChannelSelect }) => {
  const [open, setOpen] = useState(true);

  return (
    <div className="w-full bg-black text-white">
      {/* Toggle Button */}
      <div className="flex justify-between items-center px-4 py-2 bg-zinc-900 border-b border-gray-700">
        <span className="font-semibold">📅 Program Guide</span>
        <button
          onClick={() => setOpen(!open)}
          className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 transition"
        >
          {open ? "Hide" : "Show"}
        </button>
      </div>

      {/* Collapsible area */}
      <div
        className={`transition-all duration-500 overflow-hidden ${
          open ? "max-h-[500px]" : "max-h-0"
        }`}
      >
        <EPGGrid channels={channels} onChannelSelect={onChannelSelect} />
      </div>
    </div>
  );
};

export default EPGGridWrapper;
