// FRONTEND: /frontend/components/NewsCenter/NewsCard.tsx
import { motion } from "framer-motion";
import type { NewsItem } from "./useNewsFeed";

const sentimentColor: Record<string, string> = {
  positive: "text-emerald-300 border-emerald-400/30",
  neutral: "text-cyan-300 border-cyan-400/30",
  negative: "text-rose-300 border-rose-400/30",
};

export default function NewsCard({ item, onOpen }: {
  item: NewsItem;
  onOpen: (n: NewsItem) => void;
}) {
  const accent = sentimentColor[item.sentiment || "neutral"];

  return (
    <motion.button
      onClick={() => onOpen(item)}
      whileHover={{ y: -4, scale: 1.02 }}
      whileTap={{ scale: 0.99 }}
      className={`
        relative rounded-2xl p-3 text-left
        bg-white/5 border ${accent} shadow-[0_0_30px_#00FFFF22]
        backdrop-blur-md min-w-[260px] max-w-[320px]
        transition-colors overflow-hidden
      `}
    >
      {/* holographic beam */}
      <div className="pointer-events-none absolute -inset-0.5 opacity-25"
           style={{
             background:
               "radial-gradient(1200px 220px at 50% 110%, rgba(0,255,220,.25), transparent 65%)"
           }} />
      {item.urlToImage ? (
        <img
          src={item.urlToImage}
          alt={item.title}
          className="w-full h-36 object-cover rounded-xl border border-white/10 mb-3"
        />
      ) : (
        <div className="w-full h-36 rounded-xl border border-white/10 mb-3
                        bg-gradient-to-br from-cyan-700/30 to-fuchsia-700/20" />
      )}

      <div className="text-[11px] uppercase tracking-wide text-white/60 flex items-center gap-2">
        <span>{item.source?.name || "Unknown source"}</span>
        <span className="opacity-40">•</span>
        <span>{item.category || "general"}</span>
      </div>

      <div className="mt-1 font-semibold text-white/90 line-clamp-2">{item.title}</div>

      {item.description && (
        <div className="mt-1 text-[13px] text-white/70 line-clamp-3">{item.description}</div>
      )}

      {item.tags?.length ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {item.tags.slice(0, 5).map((t, i) => (
            <span key={i} className="text-[10px] px-2 py-[2px] rounded-full bg-white/10 text-white/70">
              #{t}
            </span>
          ))}
        </div>
      ) : null}
    </motion.button>
  );
}
