import React, { useState } from "react";
import EntityTooltip from "./EntityTooltip";

interface Entity {
  name: string;
  type: string;
  genre?: string;
  mood?: string;
}

interface Props {
  entities: Entity[];
  onSelect: (entity: Entity) => void;
}

const EntityChips: React.FC<Props> = ({ entities, onSelect }) => {
  const [hovered, setHovered] = useState<Entity | null>(null);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleMouseEnter = (e: React.MouseEvent, entity: Entity) => {
    setHovered(entity);
    setPosition({ x: e.clientX, y: e.clientY });
  };
  const handleMouseLeave = () => setHovered(null);

  const moodColor = (mood: string) => {
    switch (mood?.toLowerCase()) {
      case "positive": return "bg-emerald-600/50 hover:bg-emerald-500/60";
      case "negative": return "bg-rose-600/50 hover:bg-rose-500/60";
      default: return "bg-zinc-600/50 hover:bg-zinc-500/60";
    }
  };

  const genreBorder = (genre: string) => {
    if (!genre) return "";
    if (genre.toLowerCase().includes("drama")) return "border-purple-400/40";
    if (genre.toLowerCase().includes("romance")) return "border-pink-400/40";
    if (genre.toLowerCase().includes("documentary")) return "border-blue-400/40";
    if (genre.toLowerCase().includes("news")) return "border-yellow-400/40";
    return "border-white/20";
  };

  return (
    <div className="flex flex-wrap gap-2 mt-3 relative">
      {entities.map((e, i) => (
        <button
          key={i}
          onMouseEnter={(ev) => handleMouseEnter(ev, e)}
          onMouseLeave={handleMouseLeave}
          onClick={() => onSelect(e)}
          className={`text-xs px-3 py-1 rounded-full border ${moodColor(e.mood || "neutral")} ${genreBorder(e.genre || "")} transition-all duration-200`}
        >
          {e.name}
        </button>
      ))}

      {/* Tooltip overlay */}
      {hovered && <EntityTooltip entity={hovered} position={position} />}
    </div>
  );
};

export default EntityChips;
