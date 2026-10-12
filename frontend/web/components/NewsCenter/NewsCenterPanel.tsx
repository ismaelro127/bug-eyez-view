import React, { useState, useEffect } from "react";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { logger } from "../../utils/logger";
interface NewsArticle {
  title: string;
  description?: string;
  source?: string;
  url?: string;
  publishedAt?: string;
}

interface Props {
  entity: string;
  onClose: () => void;
}

const NewsCenterPanel: React.FC<Props> = ({ entity, onClose }) => {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!entity) return;
    (async () => {
      try {
        setLoading(true);
const res = await fetch(
  `/api/news/search?query=${encodeURIComponent(entity)}`,
  {
    method: "GET",
    credentials: "include",
  }
);

const data = await res.json().catch(() => null);

if (!res.ok) {
  logger.warn("News search failed:", res.status, data);
  throw new Error(data?.error || "News search failed");
}
        setArticles(data.results || []);
      } catch (err) {
        logger.error("❌ News fetch failed:", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [entity]);

  return (
    <div className="absolute inset-0 rounded-xl overflow-hidden border border-emerald-500/20 animate-slideInRight z-50 shadow-[0_0_40px_rgba(16,185,129,0.25)]">
      {/* 🔮 Animated holo streams */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,rgba(16,185,129,0.25)_50%,transparent_55%)] bg-[length:200%_200%] animate-holo-stream" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_80%,rgba(16,185,129,0.1),transparent_70%)]" />
      </div>

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-white/10 bg-black/30 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <ArrowLeft
            size={18}
            className="cursor-pointer text-emerald-300 hover:text-emerald-400 transition"
            onClick={onClose}
          />
          <h2 className="text-emerald-300 font-semibold text-sm uppercase tracking-wide">
            News Center — {entity}
          </h2>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 overflow-y-auto p-4 h-[calc(100%-56px)] space-y-4">
        {loading ? (
          <p className="text-sm text-gray-400 animate-pulse">
            Scanning live sources for <span className="text-emerald-300">{entity}</span>…
          </p>
        ) : articles.length ? (
          <ul className="space-y-3">
            {articles.map((a, i) => (
              <li
                key={i}
                className="rounded-lg bg-white/5 border border-white/10 p-3 hover:bg-white/10 hover:border-emerald-500/20 transition group relative overflow-hidden"
              >
                {/* Subtle holo pulse */}
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(16,185,129,0.08),transparent_70%)] opacity-0 group-hover:opacity-100 transition" />
                <div className="text-emerald-300 font-semibold">{a.title}</div>
                {a.description && (
                  <p className="text-sm text-gray-300 mt-1 line-clamp-3">
                    {a.description}
                  </p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                  <span>{a.source || "Unknown Source"}</span>
                  {a.url && (
                    <a
                      href={a.url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                    >
                      <ExternalLink size={12} />
                      Read
                    </a>
                  )}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-400">
            No recent stories found about <span className="text-emerald-300">{entity}</span>.
          </p>
        )}
      </div>
    </div>
  );
};

export default NewsCenterPanel;
