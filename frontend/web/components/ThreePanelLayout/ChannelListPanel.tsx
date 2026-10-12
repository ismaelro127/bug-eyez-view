import React from "react";
import { Channel } from "../../../types";
import { glassPanelStyle, headerCellStyle } from "./layoutConfig";

interface Props {
  channels: Channel[];
  filtered: Channel[];
  selected: Channel | null;
  search: string;
  genre: string;
  genres: string[];
  setSearch: (v: string) => void;
  setGenre: (v: string) => void;
  setSelected: (ch: Channel) => void;
  leftRotate: number;
  edgeDepth: number;
  leftWidth: number;
}

const ChannelListPanel: React.FC<Props> = ({
  filtered, selected, search, genre, genres, setSearch, setGenre, setSelected,
  leftRotate, edgeDepth, leftWidth
}) => (
  <div
    className="absolute top-[9%] bottom-[7%] rounded-xl overflow-hidden"
    style={{
      ...glassPanelStyle,
      width: `${leftWidth}%`,
      left: "2%",
      transformOrigin: "right center",
      transform: `rotateY(${leftRotate}deg) translateZ(${edgeDepth}px)`,
    }}
  >
    <div style={headerCellStyle}>CHANNELS</div>
    <div className="p-2 overflow-y-auto h-full">
      <div className="flex gap-2 mb-2">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="w-full px-2 py-1 rounded bg-white/10 text-sm"
        />
        <select
          value={genre}
          onChange={(e) => setGenre(e.target.value)}
          className="px-2 py-1 rounded bg-white/10 text-sm"
        >
          {genres.map((g) => <option key={g}>{g}</option>)}
        </select>
      </div>

      {filtered.map((c) => (
        <button
          key={c.id}
          onClick={() => setSelected(c)}
          className={`w-full text-left px-3 py-2 mb-1 rounded transition ${
            selected?.id === c.id ? "bg-white/20" : "bg-white/10 hover:bg-white/15"
          }`}
        >
          <div className="flex items-center gap-2">
            {c.logo ? (
  <div className="w-6 h-6 rounded bg-black/40 flex items-center justify-center overflow-hidden flex-shrink-0">
    <img
      src={c.logo}
      alt={c.name}
      className="w-full h-full object-contain"
    />
  </div>
) : (
  <div className="w-6 h-6 bg-white/15 flex items-center justify-center text-xs">
                {c.name?.[0] || "?"}
              </div>
            )}
            <div className="truncate">{c.name}</div>
          </div>
          <div className="text-[10px] opacity-70">
            {(c.genre || "Uncategorized") + " • " + (c.language || "Unknown")}
          </div>
        </button>
      ))}
      {!filtered.length && <div className="text-sm opacity-70 p-2">No channels.</div>}
    </div>
  </div>
);

export default ChannelListPanel;
