import React from "react";
import { Channel } from "../../types";
import { useEPG } from "./EPGProvider";

interface Props {
  channel: Channel | null;
  onChannelSelect: (ch: Channel) => void;
}

const EPGCarousel: React.FC<Props> = ({ channel, onChannelSelect }) => {
  const { epgData, currentProgram } = useEPG();

  if (!channel) {
    return <div className="bg-zinc-900 text-white p-4">No channel selected</div>;
  }

  return (
    <div className="bg-zinc-900 text-white px-4 py-3 overflow-x-auto whitespace-nowrap flex gap-4 scrollbar-thin scrollbar-thumb-gray-700">
      {epgData && epgData.length > 0 ? (
        epgData.map((program, i) => {
          const start = new Date(program.start).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const end = new Date(program.end).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          });
          const isCurrent = currentProgram && currentProgram.title === program.title;

          return (
            <div
              key={i}
              onClick={() => onChannelSelect(channel)}
              className={`min-w-[200px] max-w-[250px] p-3 rounded-lg cursor-pointer ${
                isCurrent ? "bg-green-700" : "bg-gray-800 hover:bg-gray-700"
              }`}
            >
              <div className="font-semibold text-sm truncate">{program.title}</div>
              <div className="text-xs text-gray-300">
                {start} – {end}
              </div>
            </div>
          );
        })
      ) : (
        <div className="text-gray-400 italic">No schedule available</div>
      )}
    </div>
  );
};

export default EPGCarousel;
