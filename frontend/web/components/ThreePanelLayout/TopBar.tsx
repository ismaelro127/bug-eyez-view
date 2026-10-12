import React from "react";

interface TopBarProps {
  search: string;
  genre: string;
  genres: string[];
  onSearch: (v: string) => void;
  onGenre: (v: string) => void;
  onToggleHUD: () => void;
  onSave: () => void;
  onReset: () => void;
}

const TopBar: React.FC<TopBarProps> = ({
  search, genre, genres,
  onSearch, onGenre, onToggleHUD, onSave, onReset,
}) => (
  <div className="absolute top-0 left-0 right-0 z-50 flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md border-b border-white/10">
    <div className="font-semibold">🪩 Bug Eyez View — Flat Glass</div>

    <input
      value={search}
      onChange={(e) => onSearch(e.target.value)}
      placeholder="Search channels or language…"
      className="px-3 py-1 rounded bg-white/10 outline-none focus:ring-1 ring-white/30 w-56"
    />

    <select
      value={genre}
      onChange={(e) => onGenre(e.target.value)}
      className="px-3 py-1 rounded bg-white/10 outline-none focus:ring-1 ring-white/30"
    >
      {genres.map((g) => (
        <option key={g}>{g}</option>
      ))}
    </select>

    <div className="ml-auto flex items-center gap-2">
      <button onClick={onToggleHUD} className="btn">⚙️ Layout</button>
      <button onClick={onSave} className="btn">💾 Save</button>
      <button onClick={onReset} className="btn">♻ Reset</button>
    </div>
  </div>
);

export default TopBar;
