import React, { useEffect, useState, useRef } from "react";
import { logger } from "../../utils/logger";
import { apiFetch } from "../../../lib/apiFetch";

interface TooltipProps {
  entity: { name: string; type: string } | null;
  position: { x: number; y: number };
}

const tooltipCache = new Map<string, any>();

const EntityTooltip: React.FC<TooltipProps> = ({ entity, position }) => {
  const [info, setInfo] = useState<any | null>(null);
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!entity) {
      setVisible(false);
      return;
    }

    const key = `${entity.type}:${entity.name}`;
    if (tooltipCache.has(key)) {
      setInfo(tooltipCache.get(key));
      setVisible(true);
      return;
    }

    let cancelled = false;
    (async () => {
      try {


const entityType = encodeURIComponent(entity.type);
const entityName = encodeURIComponent(entity.name.replace(/ /g, "_"));

const res = await apiFetch(
  `/ai/entity/${entityType}/${entityName}`,
  {
    method: "GET",
  }
);

const data = await res.json().catch(() => null);

if (!res.ok) {
  throw new Error(data?.error || `AI entity request failed: ${res.status}`);
}

if (!cancelled) {
  tooltipCache.set(key, data);
  setInfo(data);
  setVisible(true);
}
      } catch (e) {
        logger.error(e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [entity]);

  if (!entity || !info) return null;

  // Glow & color dynamics
  const moodGlow =
    info.mood === "Positive"
      ? "shadow-[0_0_30px_#00ffcc66]"
      : info.mood === "Negative"
      ? "shadow-[0_0_30px_#ff335577]"
      : "shadow-[0_0_20px_#9999aa55]";

  const gradient =
    info.mood === "Positive"
      ? "from-emerald-600/70 via-cyan-700/60 to-teal-800/70"
      : info.mood === "Negative"
      ? "from-rose-700/70 via-red-700/60 to-red-900/70"
      : "from-zinc-700/70 via-slate-800/60 to-zinc-900/70";

  const shimmer =
    "before:absolute before:inset-0 before:bg-[linear-gradient(110deg,rgba(255,255,255,0)_0%,rgba(255,255,255,0.1)_40%,rgba(255,255,255,0)_80%)] before:animate-[shimmer_2s_infinite] before:rounded-xl before:pointer-events-none";

  const fadeIn = visible ? "opacity-100 scale-100" : "opacity-0 scale-95";

  return (
    <>
      <div
        className={`fixed z-[9999] pointer-events-none transition-all duration-300 ease-out ${fadeIn}`}
        style={{ top: position.y + 15, left: position.x + 15 }}
      >
        <div
          className={`relative backdrop-blur-xl border border-white/20 rounded-2xl p-4 text-white w-72 shadow-xl bg-gradient-to-br ${gradient} ${moodGlow} ${shimmer}`}
          style={{
            transform: "translateZ(50px) rotateY(2deg)",
            transition: "transform 0.2s ease-in-out",
          }}
        >
          {/* ENTITY HEADER */}
          <div className="flex items-center justify-between mb-1">
            <div className="text-sm font-semibold tracking-wide">{info.name}</div>
            <div className="text-[10px] text-white/70 uppercase">{info.genre || entity.type}</div>
          </div>

          {/* DESCRIPTION */}
          <p className="text-xs text-white/80 leading-snug">
            {info.description?.slice(0, 160) || "Fetching details..."}
          </p>

          {/* SPECIAL CASE: ACTOR */}
          {info.known_for && (
            <div className="text-[11px] mt-2 opacity-90">
              🎬 <span className="font-medium">Known for:</span>{" "}
              {info.known_for.slice(0, 3).join(", ")}
            </div>
          )}

          {/* SPECIAL CASE: COMPANY QUICK STATS */}
          {info.source === "wikipedia" && info.description?.includes("founded") && (
            <div className="text-[11px] mt-2 text-white/70">🏢 Organization overview</div>
          )}

          {/* LINKS */}
          {info.links && (
            <div className="flex flex-wrap gap-2 mt-2">
              {info.links.slice(0, 2).map((l: any, i: number) => (
                <a
                  key={i}
                  href={l.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-300 hover:text-cyan-100"
                >
                  🔗 {l.label}
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* shimmer keyframes (no JSX prop now) */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </>
  );
};

export default EntityTooltip;
