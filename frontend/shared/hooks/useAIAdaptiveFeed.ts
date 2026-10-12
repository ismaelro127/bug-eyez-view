import { useEffect, useState } from "react";

/**
 * Placeholder for AI Feed generation logic.
 * You can later replace this with a proper model-driven engine (TensorFlow, Langchain, etc.)
 */
function aiFeedEngine({
  memory,
  tone,
  news,
  epg,
  weights,
}: {
  memory: any[];
  tone: any;
  news: any[];
  epg: any[];
  weights: Record<string, number>;
}) {
  // Basic adaptive composition: combine EPG + news and rank by keyword weights
  const scored: any[] = [];

  const applyWeight = (text: string): number => {
    if (!text) return 0;
    const lower = text.toLowerCase();
    return Object.entries(weights || {}).reduce((acc, [k, w]) => {
      if (lower.includes(k.toLowerCase())) acc += w;
      return acc;
    }, 0);
  };

  for (const n of news || []) {
    scored.push({
      ...n,
      type: "news",
      score: applyWeight(n.title || n.description),
    });
  }

  for (const p of epg || []) {
    scored.push({
      ...p,
      type: "program",
      score: applyWeight(p.title || p.description),
    });
  }

  scored.sort((a, b) => (b.score || 0) - (a.score || 0));

  // Keep top 20 for now
  return scored.slice(0, 20);
}

/**
 * useAIAdaptiveFeed
 * - Dynamically merges recent memory, tone, EPG + news data
 * - Produces an adaptively ranked “AI feed”
 * - Auto-refreshes on interval (default: 3 min)
 */
export function useAIAdaptiveFeed({
  memory,
  tone,
  news,
  epg,
  weights,
  interval = 180000, // 3 min
}: {
  memory: any[];
  tone: any;
  news: any[];
  epg: any[];
  weights: Record<string, number>;
  interval?: number;
}) {
  const [feed, setFeed] = useState<any[]>([]);

  useEffect(() => {
    setFeed(aiFeedEngine({ memory, tone, news, epg, weights }));
  }, [memory, tone, news, epg, weights]);

  // Auto-refresh logic
  useEffect(() => {
    const id = setInterval(() => {
      setFeed(aiFeedEngine({ memory, tone, news, epg, weights }));
    }, interval);
    return () => clearInterval(id);
  }, [memory, tone, news, epg, weights, interval]);

  return { feed };
}
